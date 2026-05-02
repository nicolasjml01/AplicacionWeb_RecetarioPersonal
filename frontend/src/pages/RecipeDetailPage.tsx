import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import { getRecipe } from "../api/recipes";
import type { RecipeDto } from "../types/recipes";

type LocationState = { fromCategoryId?: number } | null;

function RecipePreparation({ description }: { description: string | null }) {
  const text = description?.trim() ?? "";
  if (!text) {
    return (
      <p className="recipe-detail__empty">
        Aún no hay texto de preparación. Cuando edites la receta podrás añadir
        descripción o pasos (una línea por paso).
      </p>
    );
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return <p className="recipe-detail__prose">{lines[0]}</p>;
  }

  return (
    <ol className="recipe-detail__steps">
      {lines.map((line, i) => (
        <li key={i}>{line}</li>
      ))}
    </ol>
  );
}

/**
 * Read-only recipe detail: title, categories, placeholder for photos, description / line-based steps.
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

          <section className="recipe-detail__section" aria-label="Fotos">
            <h2 className="recipe-detail__section-title">Fotos</h2>
            <div className="recipe-detail__photo-placeholder">
              Aquí mostraremos las fotos de la receta cuando las añadas.
            </div>
          </section>

          <section className="recipe-detail__section" aria-label="Preparación">
            <h2 className="recipe-detail__section-title">Preparación</h2>
            <RecipePreparation description={recipe.description} />
          </section>
        </div>
      )}
    </section>
  );
}
