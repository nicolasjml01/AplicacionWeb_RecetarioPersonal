export interface UnitOfMeasureDto {
  unitId: number;
  name: string;
  symbol: string | null;
  /** True when created by the current user (editable in Account). */
  userOwned: boolean;
}

export interface UpdateOwnedUnitRequest {
  name: string;
  symbol?: string | null;
}

export interface DeleteOwnedUnitResponse {
  message: string;
  recipeIngredientLinesCleared: number;
  shoppingListItemsCleared: number;
}

export interface IngredientDto {
  ingredientId: number;
  name: string;
  categoryId: number | null;
  categoryName: string | null;
  /** Present when the user (or catalog) has a custom image; use as {@code img} src with API base if relative. */
  imageUrl?: string | null;
}

export interface ShoppingListItemDto {
  shoppingListItemId: number;
  userId: number;
  ingredient: IngredientDto;
  quantity: number;
  unitOfMeasure: UnitOfMeasureDto | null;
  bought: boolean;
}

export interface IngredientCategoryCatalogDto {
  categoryId: number;
  categoryName: string;
  ingredients: IngredientDto[];
}

export interface CreateShoppingListItemRequest {
  ingredientName: string;
  quantity: number;
  measurementUnit: string;
  /** Omit or null → backend assigns default category "Propios". */
  ingredientCategoryId?: number | null;
}

export interface UpdateOwnedIngredientRequest {
  name: string;
  /** Omit or null → backend assigns "Propios". */
  ingredientCategoryId?: number | null;
}

export interface DeleteOwnedIngredientResponse {
  message: string;
  shoppingListItemsRemoved: number;
  recipeIngredientLinesRemoved: number;
  recentEntriesRemoved: number;
}

export interface UpdateShoppingListItemRequest {
  bought?: boolean;
  quantity?: number;
  measurementUnit?: string | null;
}
