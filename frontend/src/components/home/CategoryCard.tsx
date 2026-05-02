import type { RecipeDto, RecipeCategoryDto } from "../../types/recipes";

type Props = {
  category: RecipeCategoryDto;
  previewRecipes: RecipeDto[];
  onOpenCategory: (categoryId: number) => void;
};

export function CategoryCard({ category, previewRecipes, onOpenCategory }: Props) {
  return (
    <button className="home-category-card" onClick={() => onOpenCategory(category.categoryId)}>
      <div className="home-category-card__title">{category.name}</div>
      <div className="home-category-card__preview">
        {previewRecipes.length === 0 ? (
          <div className="home-category-card__empty">Sin recetas todavía</div>
        ) : (
          previewRecipes.slice(0, 4).map((r) => (
            <div key={r.recipeId} className="home-category-card__item">
              {r.title}
            </div>
          ))
        )}
      </div>
    </button>
  );
}