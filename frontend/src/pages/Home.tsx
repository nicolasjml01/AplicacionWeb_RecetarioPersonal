import { useEffect, useMemo, useRef, useState } from "react";
import { getCurrentUserId } from "../auth/session";
import { getRecipes } from "../api/recipes";
import { createRecipeCategory, getRecipeCategories, updateRecipeCategory } from "../api/recipeCategories";
import type { RecipeCategoryDto, RecipeDto } from "../types/recipes";
import { CategoryCard } from "../components/home/CategoryCard";
import { FabMenu } from "../components/home/FabMenu";
import { CreateCategoryModal } from "../components/home/CreateCategoryModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import { appendRecipeReturnNav, type RecipeReturnNav } from "../utils/recipeReturnNav";

type SearchResult =
  | { type: "category"; id: number; label: string }
  | { type: "recipe"; id: number; label: string };

const DEFAULT_CATEGORY = "Sin categoría";

export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = getCurrentUserId();
  const [categories, setCategories] = useState<RecipeCategoryDto[]>([]);
  const [recipes, setRecipes] = useState<RecipeDto[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RecipeCategoryDto | null>(null);
  const [updatingCategory, setUpdatingCategory] = useState(false);
  const [error, setError] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q != null && q.length > 0) {
      setSearch(q);
      setIsSearchOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([getRecipeCategories(userId), getRecipes(userId)])
      .then(([cats, recs]) => {
        setCategories(sortCategories(cats));
        setRecipes(recs);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Error cargando home."))
      .finally(() => setLoading(false));
  }, [userId]);

  const recipesByCategoryId = useMemo(() => {
    const map = new Map<number, RecipeDto[]>();
    for (const c of categories) map.set(c.categoryId, []);
    for (const r of recipes) {
      for (const c of r.categories) {
        if (!map.has(c.categoryId)) map.set(c.categoryId, []);
        map.get(c.categoryId)!.push(r);
      }
    }
    return map;
  }, [categories, recipes]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];

    const catMatches: SearchResult[] = categories
      .filter((c) => c.name.toLowerCase().includes(q))
      .map((c) => ({ type: "category", id: c.categoryId, label: c.name }));

    const recMatches: SearchResult[] = recipes
      .filter((r) => {
        const inTitle = r.title.toLowerCase().includes(q);
        const inCategory = r.categories.some((c) => c.name.toLowerCase().includes(q));
        return inTitle || inCategory;
      })
      .map((r) => ({
        type: "recipe",
        id: r.recipeId,
        label: r.title,
      }));

    return [...catMatches, ...recMatches]; // First category matches, then recipe matches
  }, [search, categories, recipes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!searchContainerRef.current) return;
      const target = event.target as Node;
      if (!searchContainerRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
    };

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const handleCreateCategory = async (name: string) => {
    if (!userId) return;
    setCreatingCategory(true);
    try {
      const created = await createRecipeCategory(userId, name);
      setCategories((prev) => sortCategories([...prev, created]));
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleOpenCategory = (categoryId: number) => {
    setIsSearchOpen(false);
    navigate(`/home/categories/${categoryId}`);
  };

  const handleEditCategory = async (name: string) => {
    if (!userId || !editingCategory) return;
    setUpdatingCategory(true);
    try {
      const updated = await updateRecipeCategory(userId, editingCategory.categoryId, name);
      setCategories((prev) =>
        sortCategories(prev.map((c) => (c.categoryId === updated.categoryId ? updated : c)))
      );
      setEditingCategory(null);
    } finally {
      setUpdatingCategory(false);
    }
  };

  const handleOpenRecipe = (recipeId: number) => {
    setIsSearchOpen(false);
    const trimmed = search.trim();
    const ret: RecipeReturnNav = trimmed ? { kind: "home", q: trimmed } : { kind: "home" };
    navigate(appendRecipeReturnNav(`/home/recipes/${recipeId}`, ret));
  };

  if (!userId) return <p className="home-error">No hay usuario en sesión.</p>;
  if (loading) return <p>Cargando...</p>;

  return (
    <section className="home-page">
      <div className="home-toolbar">
        <div className="home-search" ref={searchContainerRef}>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Buscar categorías o recetas"
            aria-label="Buscar categorías o recetas"
          />
          {search.trim() && isSearchOpen && (
            <div className="home-search__dropdown" role="listbox" aria-label="Resultados de búsqueda">
              {searchResults.length === 0 && <div className="home-search__empty">Sin coincidencias</div>}
              {searchResults.map((r) =>
                r.type === "category" ? (
                  <button type="button" key={`c-${r.id}`} onClick={() => handleOpenCategory(r.id)}>
                    📂 {r.label}
                  </button>
                ) : (
                  <button type="button" key={`r-${r.id}`} onClick={() => handleOpenRecipe(r.id)}>
                    🍽️ {r.label}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        <FabMenu
          open={fabOpen}
          onOpen={() => setFabOpen(true)}
          onClose={() => setFabOpen(false)}
          onToggle={() => setFabOpen((v) => !v)}
          onAddCategory={() => {
            setFabOpen(false);
            setCategoryModalOpen(true);
          }}
          onAddRecipe={() => {
            setFabOpen(false);
            navigate("/home/recipes/new");
          }}
          onOpenDrafts={() => {
            setFabOpen(false);
            navigate("/home/drafts");
          }}
        />
      </div>

      {error && <p className="home-error">{error}</p>}

      <div className="home-grid">
        {categories.map((c) => (
          <CategoryCard
            key={c.categoryId}
            category={c}
            previewRecipes={recipesByCategoryId.get(c.categoryId) ?? []}
            onOpenCategory={handleOpenCategory}
            onEditCategory={(category) => setEditingCategory(category)}
            onCreateRecipeInCategory={(categoryId) =>
              navigate(
                appendRecipeReturnNav(`/home/recipes/new?categoryId=${categoryId}`, {
                  kind: "category",
                  categoryId,
                }),
              )
            }
          />
        ))}
      </div>

      <CreateCategoryModal
        open={categoryModalOpen}
        loading={creatingCategory}
        onClose={() => setCategoryModalOpen(false)}
        onSubmit={handleCreateCategory}
      />
      <CreateCategoryModal
        open={editingCategory != null}
        loading={updatingCategory}
        title="Editar categoría"
        submitLabel="Guardar cambios"
        initialName={editingCategory?.name ?? ""}
        onClose={() => setEditingCategory(null)}
        onSubmit={handleEditCategory}
      />
    </section>
  );
}

function sortCategories(items: RecipeCategoryDto[]): RecipeCategoryDto[] {
  const copy = [...items];
  copy.sort((a, b) => {
    const aDefault = a.name.trim().toLowerCase() === DEFAULT_CATEGORY.toLowerCase();
    const bDefault = b.name.trim().toLowerCase() === DEFAULT_CATEGORY.toLowerCase();
    if (aDefault && !bDefault) return -1;
    if (!aDefault && bDefault) return 1;
    return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
  });
  return copy;
}