import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import { getRecipe } from "../api/recipes";
import type { RecipeDto } from "../types/recipes";
import { RECIPE_DEFAULT_COVER_PATH } from "../constants/recipeAssets";
import { resolveMediaUrl } from "../utils/mediaUrl";

type LocationState = { fromCategoryId?: number } | null;

/**
 * Read-only recipe detail: title, categories, placeholder for photos / steps.
 */
export function RecipeDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { recipeId: recipeIdParam } = useParams();
  const userId = getCurrentUserId();

  const recipeId = Number(recipeIdParam);
  const state = (location.state ?? null) as LocationState;

  const [recipe, setRecipe] = useState<RecipeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const handleBack = () => {
    if (state?.fromCategoryId != null) {
      navigate(`/home/categories/${state.fromCategoryId}`);
    } else {
      navigate("/home");
    }
  };

  if (!userId) return <p className="home-error">No hay usuario en sesión.</p>;
  if (!Number.isFinite(recipeId))
    return <p className="home-error">Receta no válida.</p>;

  return (
    <section className="recipe-detail-page">
      <header className="category-recipes-header">
        <button
          type="button"
          className="category-recipes-back"
          onClick={handleBack}
          aria-label="Volver"
        >
          ←
        </button>
        <h1 className="category-recipes-title">
          {loading ? "…" : recipe?.title ?? "Receta"}
        </h1>
      </header>

      {error && <p className="home-error">{error}</p>}

      {!loading && !error && recipe && (
        <div className="recipe-detail__content">
          {recipe.categories.length > 0 && (
            <section className="recipe-detail__section" aria-label="Categorías">
              <h2 className="recipe-detail__section-title">Categorías</h2>
              <ul className="recipe-detail__chips">
                {recipe.categories.map((c) => (
                  <li key={c.categoryId}>{c.name}</li>
                ))}
              </ul>
            </section>
          )}

          {recipe.steps.length > 0 && (
            <section className="recipe-detail__section" aria-label="Pasos">
              <h2 className="recipe-detail__section-title">Pasos</h2>
              <ol className="recipe-detail__steps">
                {recipe.steps.map((s) => (
                  <li key={s.stepId}>
                    <p className="recipe-detail__prose">{s.content}</p>
                    {s.media.length > 0 && (
                      <div className="recipe-detail__media-grid recipe-detail__media-grid--inline">
                        {[...s.media]
                          .sort((a, b) => a.displayOrder - b.displayOrder)
                          .map((m) => (
                            <figure key={m.mediaId} className="recipe-detail__media-cell">
                              {m.contentType.startsWith("video/") ? (
                                <video
                                  className="recipe-detail__media-thumb"
                                  controls
                                  src={resolveMediaUrl(m.url)}
                                />
                              ) : (
                                <img className="recipe-detail__media-thumb" src={resolveMediaUrl(m.url)} alt="" />
                              )}
                            </figure>
                          ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="recipe-detail__section" aria-label="Fotos y vídeos">
            <h2 className="recipe-detail__section-title">Galería de la receta</h2>
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
              <div className="recipe-detail__media-grid">
                {[...recipe.recipeLevelMedia]
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((m) => (
                    <figure key={m.mediaId} className="recipe-detail__media-cell">
                      {m.contentType.startsWith("video/") ? (
                        <video
                          className="recipe-detail__media-thumb"
                          controls
                          src={resolveMediaUrl(m.url)}
                        />
                      ) : (
                        <img className="recipe-detail__media-thumb" src={resolveMediaUrl(m.url)} alt="" />
                      )}
                    </figure>
                  ))}
              </div>
            ) : (
              <p className="recipe-detail__empty">
                No hay galería global; hay archivos adjuntos en los pasos (ver arriba).
              </p>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
