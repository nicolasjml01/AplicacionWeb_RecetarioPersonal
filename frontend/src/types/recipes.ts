export interface RecipeCategoryDto {
  categoryId: number;
  name: string;
}

export interface RecipeMediaDto {
  mediaId: number;
  recipeStepId: number | null;
  displayOrder: number;
  url: string;
  contentType: string;
}

export interface RecipeStepDto {
  stepId: number;
  stepNumber: number;
  content: string;
  media: RecipeMediaDto[];
}

export interface RecipeDto {
  recipeId: number;
  ownerUserId: number;
  title: string;
  categories: RecipeCategoryDto[];
  steps: RecipeStepDto[];
  recipeLevelMedia: RecipeMediaDto[];
}
