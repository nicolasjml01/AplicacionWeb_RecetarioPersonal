import { useCallback, useRef, useState } from "react";
import { useOverlayDismiss } from "../../hooks/useOverlayDismiss";
import type { RecipeDto, RecipeCategoryDto } from "../../types/recipes";
import { RecipeMiniTile } from "../recipe/RecipeMiniTile";

type Props = {
  category: RecipeCategoryDto;
  previewRecipes: RecipeDto[];
  onOpenCategory: (categoryId: number) => void;
  onEditCategory: (category: RecipeCategoryDto) => void;
  onDeleteCategory: (category: RecipeCategoryDto) => void;
  onCreateRecipeInCategory: (categoryId: number) => void;
};

export function CategoryCard({
  category,
  previewRecipes,
  onOpenCategory,
  onEditCategory,
  onDeleteCategory,
  onCreateRecipeInCategory,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuWrapRef = useRef<HTMLDivElement | null>(null);
  const isDefaultCategory = category.name.trim().toLowerCase() === "sin categoría";

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useOverlayDismiss({
    enabled: menuOpen,
    containerRef: menuWrapRef,
    onDismiss: closeMenu,
  });

  return (
    <article className="home-category-card home-category-card--with-menu">
      <button type="button" className="home-category-card__open" onClick={() => onOpenCategory(category.categoryId)}>
        <div className="home-category-card__title">{category.name}</div>
        <div className="home-category-card__preview home-category-card__preview--grid">
          {previewRecipes.length === 0 ? (
            <div className="home-category-card__empty home-category-card__empty--span">Sin recetas todavía</div>
          ) : (
            previewRecipes.slice(0, 4).map((r) => (
              <RecipeMiniTile key={r.recipeId} recipe={r} layout="compact" />
            ))
          )}
        </div>
      </button>
      {!isDefaultCategory && (
        <div className="home-category-card__menu-wrap" ref={menuWrapRef}>
          <button
            type="button"
            className="recipe-detail__menu-trigger"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={`Acciones de ${category.name}`}
            aria-expanded={menuOpen}
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="recipe-detail__menu" role="menu" aria-label="Acciones">
              <button
                type="button"
                role="menuitem"
                className="recipe-detail__menu-item recipe-detail__menu-item--primary"
                onClick={() => {
                  setMenuOpen(false);
                  onCreateRecipeInCategory(category.categoryId);
                }}
              >
                Añadir receta
              </button>
              <button
                type="button"
                role="menuitem"
                className="recipe-detail__menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onEditCategory(category);
                }}
              >
                Editar categoría
              </button>
              <button
                type="button"
                role="menuitem"
                className="recipe-detail__menu-item recipe-detail__menu-item--danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDeleteCategory(category);
                }}
              >
                Eliminar categoría
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
