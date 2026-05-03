import type { RecipeDto, RecipeCategoryDto } from "../../types/recipes";
import { RecipeMiniTile } from "../recipe/RecipeMiniTile";

type Props = {
  category: RecipeCategoryDto;
  previewRecipes: RecipeDto[];
  onOpenCategory: (categoryId: number) => void;
};

export function CategoryCard({ category, previewRecipes, onOpenCategory }: Props) {
  return (
    <button type="button" className="home-category-card" onClick={() => onOpenCategory(category.categoryId)}>
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
  );
}