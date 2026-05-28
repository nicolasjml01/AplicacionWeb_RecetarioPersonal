import { useEffect, useRef, useState } from "react";
import { useModalDismiss } from "../hooks/useModalDismiss";
import { useNavigate, useParams } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import { getRecipeCategories, updateRecipeCategory } from "../api/recipeCategories";
import { deleteRecipe, getRecipes } from "../api/recipes";
import type { RecipeDto } from "../types/recipes";
import { RecipeMiniTile } from "../components/recipe/RecipeMiniTile";
import { ConfirmDialog } from "../components/recipe/editor/ConfirmDialog";
import { ImportRecipeIngredientsDialog } from "../components/recipe/ImportRecipeIngredientsDialog";
import { CreateCategoryModal } from "../components/home/CreateCategoryModal";
import { appendRecipeReturnNav, mergeSearchWithReturnNav } from "../utils/recipeReturnNav";

/**
 * Lists recipes for one category. Search is debounced and updates results without unmounting the input
 * (full-page loading only on first load for this category).
 */
export function CategoryRecipesPage() {
  const navigate = useNavigate();
  const { categoryId: categoryIdParam } = useParams();
  const userId = getCurrentUserId();

  const categoryId = Number(categoryIdParam);
  const [categoryName, setCategoryName] = useState("");
  const [recipes, setRecipes] = useState<RecipeDto[]>([]);
  const [recipeSearch, setRecipeSearch] = useState("");
  /** True only until the first successful fetch for this category (keeps list area in loading state). */
  const [initialLoading, setInitialLoading] = useState(true);
  /** True while a debounced search request is in flight (input stays mounted). */
  const [searchRefreshing, setSearchRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [openMenuRecipeId, setOpenMenuRecipeId] = useState<number | null>(null);
  const [pendingDeleteRecipe, setPendingDeleteRecipe] = useState<RecipeDto | null>(null);
  const [importPickerRecipe, setImportPickerRecipe] = useState<RecipeDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [updatingCategory, setUpdatingCategory] = useState(false);

  const bootstrapDoneRef = useRef(false);
  const isDefaultCategory = categoryName.trim().toLowerCase() === "sin categoría";

  useEffect(() => {
    bootstrapDoneRef.current = false;
    setRecipeSearch("");
    setCategoryName("");
    setRecipes([]);
    setInitialLoading(true);
    setError("");
  }, [categoryId]);

  useEffect(() => {
    if (!userId || !Number.isFinite(categoryId)) {
      return;
    }

    const debounceMs = recipeSearch.trim() === "" ? 0 : 250;
    let cancelled = false;

    const timerId = window.setTimeout(() => {
      void (async () => {
        const isFirstFetch = !bootstrapDoneRef.current;
        try {
          if (isFirstFetch) {
            setInitialLoading(true);
          } else {
            setSearchRefreshing(true);
          }
          setError("");
          const trimmed = recipeSearch.trim();
          const [cats, recs] = await Promise.all([
            getRecipeCategories(userId),
            getRecipes(userId, {
              categoryId,
              recipeSearch: trimmed || undefined,
            }),
          ]);
          if (cancelled) return;
          const cat = cats.find((c) => c.categoryId === categoryId);
          setCategoryName(cat?.name ?? "Categoría");
          setRecipes(recs);
          bootstrapDoneRef.current = true;
        } catch (e) {
          if (!cancelled) {
            setError(
              e instanceof Error ? e.message : "Error al cargar la categoría."
            );
          }
        } finally {
          if (!cancelled) {
            setInitialLoading(false);
            setSearchRefreshing(false);
          }
        }
      })();
    }, debounceMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [userId, categoryId, recipeSearch]);

  useEffect(() => {
    if (!actionNotice) return;
    const t = window.setTimeout(() => setActionNotice(""), 2200);
    return () => window.clearTimeout(t);
  }, [actionNotice]);

  const handleDeleteRecipe = async () => {
    if (!userId || !pendingDeleteRecipe) return;
    setDeleting(true);
    setActionNotice("");
    try {
      await deleteRecipe(userId, pendingDeleteRecipe.recipeId);
      setRecipes((prev) => prev.filter((r) => r.recipeId !== pendingDeleteRecipe.recipeId));
      setActionNotice(`"${pendingDeleteRecipe.title}" eliminada.`);
      setPendingDeleteRecipe(null);
    } catch (e) {
      setActionNotice(e instanceof Error ? e.message : "No se pudo eliminar la receta.");
    } finally {
      setDeleting(false);
      setOpenMenuRecipeId(null);
    }
  };

  const handleRenameCategory = async (name: string) => {
    if (!userId || !Number.isFinite(categoryId) || isDefaultCategory) return;
    setUpdatingCategory(true);
    try {
      const updated = await updateRecipeCategory(userId, categoryId, name);
      setCategoryName(updated.name);
      setEditCategoryOpen(false);
      setActionNotice("Categoría actualizada.");
    } finally {
      setUpdatingCategory(false);
    }
  };

  useModalDismiss({
    enabled: openMenuRecipeId != null,
    onDismiss: () => setOpenMenuRecipeId(null),
  });

  if (!userId) return <p className="home-error">No hay usuario en sesión.</p>;
  if (!Number.isFinite(categoryId))
    return <p className="home-error">Categoría no válida.</p>;

  return (
    <section className="category-recipes-page" onClick={() => setOpenMenuRecipeId(null)}>
      <header className="category-recipes-header">
        <button
          type="button"
          className="category-recipes-back"
          onClick={() => navigate("/home")}
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="category-recipes-title">
          {initialLoading && !categoryName ? "…" : categoryName}
        </h1>
        {!isDefaultCategory && (
          <div className="category-recipes-header__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setEditCategoryOpen(true)}
              disabled={initialLoading}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() =>
                navigate(
                  appendRecipeReturnNav(`/home/recipes/new?categoryId=${categoryId}`, {
                    kind: "category",
                    categoryId,
                  }),
                )
              }
              disabled={initialLoading}
            >
              Añadir receta
            </button>
          </div>
        )}
      </header>

      <div className="category-recipes-search-wrap">
        <input
          className="form-input"
          value={recipeSearch}
          onChange={(e) => setRecipeSearch(e.target.value)}
          placeholder="Buscar recetas en esta categoría"
          aria-label="Buscar recetas en esta categoría"
          autoComplete="off"
        />
        {searchRefreshing && (
          <span className="category-recipes-search-hint" aria-live="polite">
            Buscando…
          </span>
        )}
      </div>

      {error && <p className="home-error">{error}</p>}
      {actionNotice && <p className="recipe-detail__notice">{actionNotice}</p>}

      <div
        className={`home-grid category-recipes-grid${searchRefreshing ? " category-recipes-grid--refreshing" : ""}`}
        style={{ marginTop: "1rem" }}
        aria-busy={searchRefreshing}
      >
        {initialLoading && recipes.length === 0 ? (
          <p className="home-category-card__empty">Cargando recetas…</p>
        ) : recipes.length === 0 ? (
          <p className="home-category-card__empty">
            No hay recetas en esta categoría.
          </p>
        ) : (
          recipes.map((r) => (
            <article
              key={r.recipeId}
              className="category-recipe-card category-recipe-card--with-menu"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="category-recipe-card__open"
                onClick={() =>
                  navigate(
                    appendRecipeReturnNav(`/home/recipes/${r.recipeId}`, {
                      kind: "category",
                      categoryId,
                    }),
                  )
                }
              >
              <RecipeMiniTile recipe={r} layout="comfortable" />
              </button>
              <div className="category-recipe-card__menu-wrap">
                <button
                  type="button"
                  className="recipe-detail__menu-trigger"
                  onClick={() => setOpenMenuRecipeId((prev) => (prev === r.recipeId ? null : r.recipeId))}
                  aria-label={`Acciones de ${r.title}`}
                  aria-expanded={openMenuRecipeId === r.recipeId}
                >
                  ⋯
                </button>
                {openMenuRecipeId === r.recipeId && (
                  <div className="recipe-detail__menu" role="menu" aria-label="Acciones">
                    <button
                      type="button"
                      role="menuitem"
                      className="recipe-detail__menu-item recipe-detail__menu-item--primary"
                      onClick={() => {
                        setImportPickerRecipe(r);
                        setOpenMenuRecipeId(null);
                      }}
                      disabled={deleting}
                    >
                      Añadir a la cesta
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="recipe-detail__menu-item"
                      onClick={() =>
                        navigate(
                          `/home/recipes/new?${mergeSearchWithReturnNav(`editId=${r.recipeId}`, {
                            kind: "category",
                            categoryId,
                          })}`,
                        )
                      }
                      disabled={deleting}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="recipe-detail__menu-item recipe-detail__menu-item--danger"
                      onClick={() => setPendingDeleteRecipe(r)}
                      disabled={deleting}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>
      {importPickerRecipe != null && userId != null && (
        <ImportRecipeIngredientsDialog
          open
          userId={userId}
          recipeId={importPickerRecipe.recipeId}
          recipeTitle={importPickerRecipe.title}
          onClose={() => setImportPickerRecipe(null)}
          onSuccess={(msg) =>
            setActionNotice(`"${importPickerRecipe.title}": ${msg}`)
          }
        />
      )}
      {!isDefaultCategory && (
        <CreateCategoryModal
          open={editCategoryOpen}
          loading={updatingCategory}
          title="Editar categoría"
          submitLabel="Guardar cambios"
          initialName={categoryName}
          onClose={() => setEditCategoryOpen(false)}
          onSubmit={handleRenameCategory}
        />
      )}
      <ConfirmDialog
        open={pendingDeleteRecipe != null}
        title="¿Eliminar esta receta?"
        message="Esta acción borrará la receta y su contenido. Podrás crear otra después, pero no recuperar esta."
        cancelLabel="Cancelar"
        confirmLabel={deleting ? "Eliminando..." : "Sí, eliminar"}
        confirmVariant="danger"
        onCancel={() => {
          if (!deleting) setPendingDeleteRecipe(null);
        }}
        onConfirm={() => void handleDeleteRecipe()}
      />
    </section>
  );
}
