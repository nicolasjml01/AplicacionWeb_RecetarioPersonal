import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useModalDismiss } from "../hooks/useModalDismiss";
import { useOverlayDismiss } from "../hooks/useOverlayDismiss";
import { getCurrentUserId } from "../auth/session";
import { getRecipes, previewRecipeFromUrl } from "../api/recipes";
import {
  createRecipeCategory,
  deleteRecipeCategory,
  getRecipeCategories,
  updateRecipeCategory,
} from "../api/recipeCategories";
import type { RecipeCategoryDto, RecipeDto } from "../types/recipes";
import { CategoryCard } from "../components/home/CategoryCard";
import { FabMenu } from "../components/home/FabMenu";
import { CreateCategoryModal } from "../components/home/CreateCategoryModal";
import { ConfirmDialog } from "../components/recipe/editor/ConfirmDialog";
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
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<RecipeCategoryDto | null>(null);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [error, setError] = useState("");
  const [importError, setImportError] = useState("");
  const [importingFromUrl, setImportingFromUrl] = useState(false);
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

  const searchTrimmed = search.trim();
  const isSearchUrl = useMemo(() => {
    if (!searchTrimmed) return false;
    try {
      const parsed = new URL(searchTrimmed);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, [searchTrimmed]);

  const closeSearchDropdown = useCallback(() => setIsSearchOpen(false), []);

  useOverlayDismiss({
    enabled: isSearchOpen,
    containerRef: searchContainerRef,
    onDismiss: closeSearchDropdown,
  });

  useModalDismiss({
    enabled: fabOpen,
    onDismiss: () => setFabOpen(false),
  });

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

  const handleConfirmDeleteCategory = async () => {
    if (!userId || !pendingDeleteCategory) return;
    setDeletingCategory(true);
    setError("");
    try {
      await deleteRecipeCategory(userId, pendingDeleteCategory.categoryId);
      const deletedId = pendingDeleteCategory.categoryId;
      setCategories((prev) => prev.filter((c) => c.categoryId !== deletedId));
      setRecipes((prev) =>
        prev.map((r) => ({
          ...r,
          categories: r.categories.filter((c) => c.categoryId !== deletedId),
        })),
      );
      setPendingDeleteCategory(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo eliminar la categoría.");
      setPendingDeleteCategory(null);
    } finally {
      setDeletingCategory(false);
    }
  };

  const handleOpenRecipe = (recipeId: number) => {
    setIsSearchOpen(false);
    const trimmed = search.trim();
    const ret: RecipeReturnNav = trimmed ? { kind: "home", q: trimmed } : { kind: "home" };
    navigate(appendRecipeReturnNav(`/home/recipes/${recipeId}`, ret));
  };

  const handleImportFromSearchUrl = async () => {
    if (!userId || !isSearchUrl || importingFromUrl) return;
    setImportError("");
    setImportingFromUrl(true);
    try {
      const preview = await previewRecipeFromUrl(userId, searchTrimmed);
      setIsSearchOpen(false);
      navigate("/home/recipes/new", {
        state: { importPreview: preview },
      });
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "No se pudo importar la receta.");
    } finally {
      setImportingFromUrl(false);
    }
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
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
              e.preventDefault();
              if (isSearchUrl && !importingFromUrl) {
                void handleImportFromSearchUrl();
                return;
              }
              const first = searchResults[0];
              if (!first) return;
              if (first.type === "category") {
                handleOpenCategory(first.id);
              } else {
                handleOpenRecipe(first.id);
              }
            }}
            placeholder="Buscar categoría / receta / Importar receta desde enlace"
            aria-label="Buscar categoría / receta / Importar receta desde enlace"
          />
          {search.trim() && isSearchOpen && (
            <div className="home-search__dropdown" role="listbox" aria-label="Resultados de búsqueda">
              {isSearchUrl && (
                <button type="button" onClick={handleImportFromSearchUrl} disabled={importingFromUrl}>
                  {importingFromUrl ? "⏳ Importando receta..." : "🌐 Importar receta desde este enlace"}
                </button>
              )}
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
      {importError && <p className="home-error">{importError}</p>}

      <div className="home-grid">
        {categories.map((c) => (
          <CategoryCard
            key={c.categoryId}
            category={c}
            previewRecipes={recipesByCategoryId.get(c.categoryId) ?? []}
            onOpenCategory={handleOpenCategory}
            onEditCategory={(category) => setEditingCategory(category)}
            onDeleteCategory={(category) => setPendingDeleteCategory(category)}
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

      <ConfirmDialog
        open={pendingDeleteCategory != null}
        title="¿Eliminar esta categoría?"
        message={
          pendingDeleteCategory
            ? (() => {
                const count = recipesByCategoryId.get(pendingDeleteCategory.categoryId)?.length ?? 0;
                if (count > 0) {
                  return `Se eliminará "${pendingDeleteCategory.name}". Las ${count} receta${count === 1 ? "" : "s"} de esta categoría no se borrarán; solo dejarán de estar agrupadas aquí.`;
                }
                return `Se eliminará la categoría "${pendingDeleteCategory.name}". Esta acción no se puede deshacer.`;
              })()
            : ""
        }
        cancelLabel="Cancelar"
        confirmLabel={deletingCategory ? "Eliminando…" : "Sí, eliminar"}
        confirmVariant="danger"
        onCancel={() => {
          if (!deletingCategory) setPendingDeleteCategory(null);
        }}
        onConfirm={() => void handleConfirmDeleteCategory()}
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