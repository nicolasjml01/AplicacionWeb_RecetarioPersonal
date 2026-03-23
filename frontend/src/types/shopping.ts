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
}

export interface UpdateShoppingListItemRequest {
  bought?: boolean;
  quantity?: number;
  measurementUnit?: string | null;
}
