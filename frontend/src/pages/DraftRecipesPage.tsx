import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import { deleteRecipe, getRecipes } from "../api/recipes";
import type { RecipeDto } from "../types/recipes";
import { RecipeMiniTile } from "../components/recipe/RecipeMiniTile";
import { ConfirmDialog } from "../components/recipe/editor/ConfirmDialog";
import { ImportRecipeIngredientsDialog } from "../components/recipe/ImportRecipeIngredientsDialog";
import { mergeSearchWithReturnNav } from "../utils/recipeReturnNav";

/**
 * Lists draft recipes until the user publishes them (then they appear on Home).
 */
export function DraftRecipesPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();
  const [drafts, setDrafts] = useState<RecipeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openMenuRecipeId, setOpenMenuRecipeId] = useState<number | null>(null);
  const [pendingDeleteRecipe, setPendingDeleteRecipe] = useState<RecipeDto | null>(null);
  const [importPickerRecipe, setImportPickerRecipe] = useState<RecipeDto | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getRecipes(userId, { draftsOnly: true })
      .then(setDrafts)
      .catch((e) => setError(e instanceof Error ? e.message : "Error al cargar borradores."))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleBack = () => navigate("/home");

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
      setDrafts((prev) => prev.filter((r) => r.recipeId !== pendingDeleteRecipe.recipeId));
      setActionNotice(`"${pendingDeleteRecipe.title}" eliminada.`);
      setPendingDeleteRecipe(null);
    } catch (e) {
      setActionNotice(e instanceof Error ? e.message : "No se pudo eliminar la receta.");
    } finally {
      setDeleting(false);
      setOpenMenuRecipeId(null);
    }
  };

  if (!userId) return <p className="home-error">No hay usuario en sesión.</p>;

  return (
    <section className="category-recipes-page" onClick={() => setOpenMenuRecipeId(null)}>
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
      {actionNotice && <p className="recipe-detail__notice">{actionNotice}</p>}

      <div className="home-grid" style={{ marginTop: "1rem" }}>
        {loading ? (
          <p className="home-category-card__empty">Cargando…</p>
        ) : drafts.length === 0 ? (
          <p className="home-category-card__empty">No tienes borradores. Crea una receta desde el botón +.</p>
        ) : (
          drafts.map((r) => (
            <article
              key={r.recipeId}
              className="category-recipe-card category-recipe-card--with-menu"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="category-recipe-card__open"
                onClick={() =>
                  navigate(`/home/recipes/new?${mergeSearchWithReturnNav(`draftId=${r.recipeId}`, { kind: "drafts" })}`)
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
                        navigate(`/home/recipes/new?${mergeSearchWithReturnNav(`editId=${r.recipeId}`, { kind: "drafts" })}`)
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
