export interface RecipeCategoryDto {
    categoryId: number;
    name: string;
}
  
export interface RecipeDto {
    recipeId: number;
    ownerUserId: number;
    title: string;
    description: string | null;
    categories: RecipeCategoryDto[];
}