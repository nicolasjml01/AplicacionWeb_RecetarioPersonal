import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useOverlayDismiss } from "../hooks/useOverlayDismiss";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import { deleteRecipe, getRecipe } from "../api/recipes";
import type { RecipeDto } from "../types/recipes";
import { RECIPE_DEFAULT_COVER_PATH } from "../constants/recipeAssets";
import { IngredientThumb } from "../components/ingredient/IngredientThumb";
import { usePreloadImages } from "../hooks/usePreloadImages";
import { resolveMediaUrl } from "../utils/mediaUrl";
import { ConfirmDialog } from "../components/recipe/editor/ConfirmDialog";
import { ImportRecipeIngredientsDialog } from "../components/recipe/ImportRecipeIngredientsDialog";
import {
  mergeSearchWithReturnNav,
  navigateBackFromRecipeDetail,
  parseRecipeReturnNav,
} from "../utils/recipeReturnNav";

type LocationState = { fromCategoryId?: number } | null;

type MediaCarouselProps = {
  media: RecipeDto["recipeLevelMedia"];
  hero?: boolean;
};

const STEP_MEDIA_GAP_PX = 8;

function MediaCarousel({ media, hero = false }: MediaCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [stepOverflow, setStepOverflow] = useState(false);

  const canMeasureOverflow = !hero && media.length > 1;

  useLayoutEffect(() => {
    if (!canMeasureOverflow) return;
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => {
      // Margen por subpíxeles / barras de scroll para no forzar scroll cuando caben todas las miniaturas
      setStepOverflow(el.scrollWidth > el.clientWidth + STEP_MEDIA_GAP_PX);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canMeasureOverflow, media]);

  const scrollHero = (direction: "prev" | "next") => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const page = el.clientWidth;
    const eps = 8;
    if (maxScroll <= eps) return;

    if (direction === "next") {
      if (el.scrollLeft >= maxScroll - eps) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: page, behavior: "smooth" });
      }
    } else if (el.scrollLeft <= eps) {
      el.scrollTo({ left: maxScroll, behavior: "smooth" });
    } else {
      el.scrollBy({ left: -page, behavior: "smooth" });
    }
  };

  const scrollStep = (direction: "prev" | "next") => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".recipe-detail__media-cell");
    const step = (card?.offsetWidth ?? 120) + STEP_MEDIA_GAP_PX;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const eps = 8;
    if (maxScroll <= eps) return;

    if (direction === "next") {
      if (el.scrollLeft >= maxScroll - eps) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    } else if (el.scrollLeft <= eps) {
      el.scrollTo({ left: maxScroll, behavior: "smooth" });
    } else {
      el.scrollBy({ left: -step, behavior: "smooth" });
    }
  };

  const cells = media.map((m) => (
    <figure key={m.mediaId} className="recipe-detail__media-cell">
      {m.contentType.startsWith("video/") ? (
        <video className="recipe-detail__media-thumb" controls src={resolveMediaUrl(m.url)} />
      ) : (
        <img className="recipe-detail__media-thumb" src={resolveMediaUrl(m.url)} alt="" />
      )}
    </figure>
  ));

  const showNav = hero ? media.length > 1 : canMeasureOverflow && stepOverflow;
  const inlineNoScroll = canMeasureOverflow && !stepOverflow;

  return (
    <div
      className={`recipe-detail__carousel ${hero ? "recipe-detail__carousel--hero" : "recipe-detail__carousel--step"}${!showNav ? " recipe-detail__carousel--no-nav" : ""}`}
    >
      {showNav && (
        <button
          type="button"
          className="recipe-detail__carousel-btn"
          onClick={() => (hero ? scrollHero("prev") : scrollStep("prev"))}
          aria-label="Ver imagen anterior"
        >
          ‹
        </button>
      )}
      <div
        ref={scrollerRef}
        className={`recipe-detail__media-grid ${hero ? "recipe-detail__media-grid--hero" : "recipe-detail__media-grid--inline"}${inlineNoScroll ? " recipe-detail__media-grid--inline-fits" : ""}${!hero && media.length === 1 ? " recipe-detail__media-grid--inline-single" : ""}`}
      >
        {cells}
      </div>
      {showNav && (
        <button
          type="button"
          className="recipe-detail__carousel-btn"
          onClick={() => (hero ? scrollHero("next") : scrollStep("next"))}
          aria-label="Ver imagen siguiente"
        >
          ›
        </button>
      )}
    </div>
  );
}

/**
 * Read-only recipe detail: title, categories, placeholder for photos / steps.
 */
export function RecipeDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { recipeId: recipeIdParam } = useParams();
  const userId = getCurrentUserId();

  const recipeId = Number(recipeIdParam);
  const state = (location.state ?? null) as LocationState;

  const [recipe, setRecipe] = useState<RecipeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [importPickerOpen, setImportPickerOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const ingredientImageUrls = useMemo(
    () => recipe?.ingredients.map((ing) => ing.ingredient.imageUrl) ?? [],
    [recipe],
  );
  usePreloadImages(ingredientImageUrls, "high");

  useEffect(() => {
    if (!userId || !Number.isFinite(recipeId)) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getRecipe(userId, recipeId);
        if (!cancelled) setRecipe(data);
      } catch (e) {
        if (!cancelled) {
          setRecipe(null);
          setError(
            e instanceof Error ? e.message : "Error al cargar la receta."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, recipeId]);

  const closeActionsMenu = useCallback(() => setActionsOpen(false), []);

  useOverlayDismiss({
    enabled: actionsOpen,
    containerRef: actionsRef,
    onDismiss: closeActionsMenu,
  });

  useEffect(() => {
    if (!actionNotice) return;
    const t = window.setTimeout(() => setActionNotice(""), 2200);
    return () => window.clearTimeout(t);
  }, [actionNotice]);

  const handleBack = () => {
    navigateBackFromRecipeDetail(navigate, searchParams, state?.fromCategoryId);
  };

  if (!userId) return <p className="home-error">No hay usuario en sesión.</p>;
  if (!Number.isFinite(recipeId))
    return <p className="home-error">Receta no válida.</p>;

  const handleEdit = () => {
    if (!recipe) return;
    const parsed = parseRecipeReturnNav(searchParams);
    const ret =
      parsed ??
      (state?.fromCategoryId != null ? { kind: "category" as const, categoryId: state.fromCategoryId } : null);
    const qs = mergeSearchWithReturnNav(`editId=${recipe.recipeId}`, ret);
    navigate(`/home/recipes/new?${qs}`);
  };

  const handleDelete = async () => {
    if (!userId || !recipe) return;
    setDeleting(true);
    setError("");
    try {
      await deleteRecipe(userId, recipe.recipeId);
      navigateBackFromRecipeDetail(navigate, searchParams, state?.fromCategoryId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la receta.");
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <section className="recipe-detail-page">
      <div className="recipe-detail__layout">
        <header className="category-recipes-header recipe-detail__header">
          <button
            type="button"
            className="category-recipes-back"
            onClick={handleBack}
            aria-label="Volver"
          >
            ←
          </button>
          <h1 className="category-recipes-title recipe-detail__header-title">
            {loading ? "…" : recipe?.title ?? "Receta"}
          </h1>
          {!loading && recipe && (
            <div className="recipe-detail__header-actions" ref={actionsRef}>
              <button
                type="button"
                className="recipe-detail__menu-trigger"
                onClick={() => setActionsOpen((v) => !v)}
                aria-label="Acciones de receta"
                aria-expanded={actionsOpen}
              >
                ⋯
              </button>
              {actionsOpen && (
                <div className="recipe-detail__menu" role="menu" aria-label="Acciones">
                  <button
                    type="button"
                    role="menuitem"
                    className="recipe-detail__menu-item recipe-detail__menu-item--primary"
                    onClick={() => {
                      setImportPickerOpen(true);
                      setActionsOpen(false);
                    }}
                    disabled={deleting}
                  >
                    Añadir a la cesta
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="recipe-detail__menu-item"
                    onClick={handleEdit}
                    disabled={deleting}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="recipe-detail__menu-item recipe-detail__menu-item--danger"
                    onClick={() => {
                      setActionsOpen(false);
                      setDeleteOpen(true);
                    }}
                    disabled={deleting}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          )}
        </header>

        {error && <p className="home-error">{error}</p>}
        {actionNotice && <p className="recipe-detail__notice">{actionNotice}</p>}

        {!loading && !error && recipe && recipe.publicationState === "DRAFT" && (
          <div className="recipe-detail__draft-banner" role="status">
            <p>
              Esta receta es un <strong>borrador</strong>: no aparece en el inicio ni en las etiquetas hasta
              que la publiques desde el editor.
            </p>
            <Link
              className="recipe-detail__draft-link"
              to={`/home/recipes/new?${mergeSearchWithReturnNav(`draftId=${recipe.recipeId}`, parseRecipeReturnNav(searchParams))}`}
            >
              Continuar editando
            </Link>
          </div>
        )}

        {!loading && !error && recipe && (
          <div className="recipe-detail__content recipe-detail__content--editorial">
            {recipe.categories.length > 0 && (
              <div className="recipe-detail__meta" aria-label="Etiquetas">
                <ul className="recipe-detail__chips">
                  {recipe.categories.map((c) => (
                    <li key={c.categoryId}>{c.name}</li>
                  ))}
                </ul>
              </div>
            )}

            <section className="recipe-detail__section" aria-label="Fotos y vídeos">
            <h2 className="recipe-detail__section-title">Galería seleccionada</h2>
            {recipe.recipeLevelMedia.length === 0 &&
            recipe.steps.every((s) => s.media.length === 0) ? (
              <div className="recipe-detail__photo-placeholder recipe-detail__photo-placeholder--default">
                <img
                  src={RECIPE_DEFAULT_COVER_PATH}
                  alt=""
                  className="recipe-detail__default-cover-hero"
                  loading="lazy"
                />
                <p>Aún no has añadido fotos ni vídeos. Esta es la vista por defecto.</p>
              </div>
            ) : recipe.recipeLevelMedia.length > 0 ? (
              <MediaCarousel
                hero
                media={[...recipe.recipeLevelMedia].sort((a, b) => a.displayOrder - b.displayOrder)}
              />
            ) : (
              <p className="recipe-detail__empty">
                No hay galería global; hay archivos adjuntos en los pasos (ver abajo).
              </p>
            )}
            </section>

            {recipe.ingredients.length > 0 && (
              <section className="recipe-detail__section" aria-label="Ingredientes">
                <div className="recipe-detail__section-head">
                  <h2 className="recipe-detail__section-title">Ingredientes</h2>
                  {recipe.ingredients.length > 4 && (
                    <button
                      type="button"
                      className="recipe-detail__ingredients-toggle"
                      onClick={() => setIngredientsExpanded((v) => !v)}
                      aria-expanded={ingredientsExpanded}
                    >
                      {ingredientsExpanded ? "Ocultar" : "Ver todo"}
                    </button>
                  )}
                </div>
                <div
                  className={`recipe-detail__ingredients-grid${
                    !ingredientsExpanded && recipe.ingredients.length > 4
                      ? " recipe-detail__ingredients-grid--collapsed"
                      : ""
                  }`}
                >
                  {[...recipe.ingredients]
                    .sort((a, b) => a.displayOrder - b.displayOrder)
                    .map((ing) => {
                      const unitLabel = ing.unitOfMeasure
                        ? ing.unitOfMeasure.symbol ?? ing.unitOfMeasure.name
                        : "sin unidad";
                      return (
                        <article key={ing.recipeIngredientId} className="recipe-detail__ingredient-card">
                          <IngredientThumb
                            name={ing.ingredient.name}
                            imageUrl={ing.ingredient.imageUrl}
                            size="card"
                            alt={ing.ingredient.name}
                          />
                          <p className="recipe-detail__ingredient-name">{ing.ingredient.name}</p>
                          <div className="recipe-detail__ingredient-pills">
                            <span>{ing.quantity}</span>
                            <span>{unitLabel}</span>
                          </div>
                        </article>
                      );
                    })}
                </div>
              </section>
            )}

            {recipe.steps.length > 0 && (
              <section className="recipe-detail__section" aria-label="Pasos">
                <h2 className="recipe-detail__section-title">Pasos</h2>
                <ol className="recipe-detail__steps recipe-detail__steps--cards">
                  {recipe.steps.map((s, index) => (
                    <li key={s.stepId} className="recipe-detail__step-card">
                      <p className="recipe-detail__step-index">Paso {index + 1}</p>
                      <p className="recipe-detail__prose recipe-detail__prose--cooking">{s.content}</p>
                      {s.media.length > 0 && (
                        <div className="recipe-detail__step-media">
                          <MediaCarousel media={[...s.media].sort((a, b) => a.displayOrder - b.displayOrder)} />
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        )}
      </div>

      {recipe && (
        <ImportRecipeIngredientsDialog
          open={importPickerOpen}
          userId={userId}
          recipeId={recipe.recipeId}
          recipeTitle={recipe.title}
          onClose={() => setImportPickerOpen(false)}
          onSuccess={(msg) => setActionNotice(msg)}
        />
      )}
      <ConfirmDialog
        open={deleteOpen}
        title="¿Eliminar esta receta?"
        message="Esta acción borrará la receta y su contenido. Podrás crear otra después, pero no recuperar esta."
        cancelLabel="Cancelar"
        confirmLabel={deleting ? "Eliminando..." : "Sí, eliminar"}
        confirmVariant="danger"
        onCancel={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={() => void handleDelete()}
      />
    </section>
  );
}
