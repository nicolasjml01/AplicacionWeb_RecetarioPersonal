import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import { getRecipes } from "../api/recipes";
import type { RecipeDto } from "../types/recipes";
import { RecipeMiniTile } from "../components/recipe/RecipeMiniTile";

/**
 * Lists draft recipes until the user publishes them (then they appear on Home).
 */
export function DraftRecipesPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();
  const [drafts, setDrafts] = useState<RecipeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getRecipes(userId, { draftsOnly: true })
      .then(setDrafts)
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar borradores."))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleBack = () => navigate("/home");

  if (!userId) return <p className="home-error">No hay usuario en sesión.</p>;

  return (
    <section className="category-recipes-page">
      <header className="category-recipes-header">
        <button type="button" className="category-recipes-back" onClick={handleBack} aria-label="Volver">
          ←
        </button>
        <h1 className="category-recipes-title">Borradores</h1>
      </header>

      <p className="create-recipe-hint" style={{ marginTop: "0.5rem" }}>
        Las recetas en borrador no aparecen en el inicio ni en las categorías hasta que pulses{" "}
        <strong>Publicar</strong> al editarlas.
      </p>

      {error && <p className="home-error">{error}</p>}

      <div className="home-grid" style={{ marginTop: "1rem" }}>
        {loading ? (
          <p className="home-category-card__empty">Cargando…</p>
        ) : drafts.length === 0 ? (
          <p className="home-category-card__empty">No tienes borradores. Crea una receta desde el botón +.</p>
        ) : (
          drafts.map((r) => (
            <button
              key={r.recipeId}
              type="button"
              className="category-recipe-card"
              onClick={() => navigate(`/home/recipes/new?draftId=${r.recipeId}`)}
            >
              <RecipeMiniTile recipe={r} layout="comfortable" />
            </button>
          ))
        )}
      </div>
    </section>
  );
}
