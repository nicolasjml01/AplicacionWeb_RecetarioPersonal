import { useState } from "react";
import type { RecipeDto, RecipeCategoryDto } from "../../types/recipes";
import { RecipeMiniTile } from "../recipe/RecipeMiniTile";

type Props = {
  category: RecipeCategoryDto;
  previewRecipes: RecipeDto[];
  onOpenCategory: (categoryId: number) => void;
  onEditCategory: (category: RecipeCategoryDto) => void;
};

export function CategoryCard({ category, previewRecipes, onOpenCategory, onEditCategory }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);

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
      <div className="home-category-card__menu-wrap">
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
              className="recipe-detail__menu-item"
              onClick={() => {
                setMenuOpen(false);
                onEditCategory(category);
              }}
            >
              Editar categoría
            </button>
          </div>
        )}
      </div>
    </article>
  );
}