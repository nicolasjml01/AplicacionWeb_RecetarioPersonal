import type { IngredientDto, UnitOfMeasureDto } from "./shopping";

export interface MealTypeDto {
  mealTypeId: number;
  name: string;
  system: boolean;
  defaultSortOrder: number;
}

export interface CalendarEntryDto {
  calendarEntryId: number;
  ownerUserId: number;
  planDate: string;
  mealType: MealTypeDto;
  recipeId: number;
  recipeTitle: string;
  coverImageUrl: string | null;
  recipeSortOrder: number;
}

export interface MealBlockDto {
  mealType: MealTypeDto;
  mealSortOrder: number;
  entries: CalendarEntryDto[];
}

export interface DayPlanDto {
  date: string;
  mealBlocks: MealBlockDto[];
}

export interface CalendarRangeDayDto {
  date: string;
  entryCount: number;
  mealBlocks: MealBlockDto[];
}

export interface CalendarRangeDto {
  from: string;
  to: string;
  days: CalendarRangeDayDto[];
}

export interface AssignCalendarEntryRequest {
  planDate: string;
  mealTypeId?: number | null;
  mealTypeName?: string | null;
  recipeId: number;
}

export interface MealOrderItemRequest {
  mealTypeId: number;
  sortOrder: number;
}

export interface CalendarEntryOrderItemRequest {
  calendarEntryId: number;
  sortOrder: number;
}

export interface DeleteMealTypeResponse {
  message: string;
  calendarEntriesRemoved: number;
  layoutRowsRemoved: number;
}

export interface DayShoppingImportSelectedEntryDto {
  calendarEntryId: number;
  recipeId: number;
  recipeTitle: string;
  coverImageUrl: string | null;
  mealTypeName: string;
}

export interface DayShoppingImportSourceDto {
  calendarEntryId: number;
  recipeId: number;
  recipeTitle: string;
  recipeIngredientId: number;
  quantity: number;
}

export interface DayShoppingImportLineDto {
  groupKey: string;
  ingredient: IngredientDto;
  unitOfMeasure: UnitOfMeasureDto | null;
  suggestedQuantity: number;
  sources: DayShoppingImportSourceDto[];
}

export interface DayShoppingImportPreviewDto {
  date: string;
  entries: DayShoppingImportSelectedEntryDto[];
  lines: DayShoppingImportLineDto[];
  warnings: string[];
}

export interface ImportDayShoppingItemRequest {
  groupKey: string;
  ingredientId: number;
  quantity: number;
  unitName: string | null;
}

export interface ImportDayShoppingListResponse {
  itemsAdded: number;
}

export type CalendarViewMode = "day" | "week" | "month";

export interface CreateMealTypeRequest {
  name: string;
}

export interface UpdateMealTypeRequest {
  name: string;
}
