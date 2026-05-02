import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import { getRecipeCategories } from "../api/recipeCategories";
import { getRecipes } from "../api/recipes";
import type { RecipeDto } from "../types/recipes";

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

  const bootstrapDoneRef = useRef(false);

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

  if (!userId) return <p className="home-error">No hay usuario en sesión.</p>;
  if (!Number.isFinite(categoryId))
    return <p className="home-error">Categoría no válida.</p>;

  return (
    <section className="category-recipes-page">
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
            <button
              key={r.recipeId}
              type="button"
              className="home-category-card"
              onClick={() =>
                navigate(`/home/recipes/${r.recipeId}`, {
                  state: { fromCategoryId: categoryId },
                })
              }
            >
              <div className="home-category-card__title">{r.title}</div>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
