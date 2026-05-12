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

export interface RecipeIngredientDto {
  recipeIngredientId: number;
  ingredient: {
    ingredientId: number;
    name: string;
    categoryId: number | null;
    categoryName: string | null;
    imageUrl?: string | null;
  };
  quantity: number;
  unitOfMeasure: {
    unitId: number;
    name: string;
    symbol: string | null;
  } | null;
  displayOrder: number;
}

export type RecipePublicationState = "DRAFT" | "PUBLISHED";

export interface RecipeDto {
  recipeId: number;
  ownerUserId: number;
  title: string;
  publicationState: RecipePublicationState;
  categories: RecipeCategoryDto[];
  ingredients: RecipeIngredientDto[];
  steps: RecipeStepDto[];
  recipeLevelMedia: RecipeMediaDto[];
}
