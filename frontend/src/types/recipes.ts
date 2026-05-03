export interface RecipeCategoryDto {
  categoryId: number;
  name: string;
}

export interface RecipeMediaDto {
  mediaId: number;
  recipeStepId: number | null;
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
  description: string | null;
  categories: RecipeCategoryDto[];
  steps: RecipeStepDto[];
  recipeLevelMedia: RecipeMediaDto[];
}
