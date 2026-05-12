export interface UnitOfMeasureDto {
  unitId: number;
  name: string;
  symbol: string | null;
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

/** {@code ingredientCategoryId}: send explicit id (including Propios) to avoid accidental reassignment from an empty JSON body. */
export interface UpdateOwnedIngredientCategoryRequest {
  ingredientCategoryId: number | null;
}

export interface UpdateShoppingListItemRequest {
  bought?: boolean;
  quantity?: number;
  measurementUnit?: string | null;
}
