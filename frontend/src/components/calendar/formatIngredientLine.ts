import type { RecipeIngredientDto } from "../../types/recipes";

export function formatIngredientQuantity(quantity: number): string {
  if (Number.isInteger(quantity)) return String(quantity);
  return String(Number(quantity.toFixed(2)));
}

export function formatIngredientUnit(row: RecipeIngredientDto): string {
  const unit = row.unitOfMeasure?.symbol?.trim() || row.unitOfMeasure?.name?.trim();
  return unit || "—";
}

/** Short label for calendar day ingredient chips. */
export function formatIngredientLine(row: RecipeIngredientDto): string {
  const qty = formatIngredientQuantity(row.quantity);
  const unit = formatIngredientUnit(row);
  const name = row.ingredient.name;
  if (unit !== "—") return `${qty} ${unit} ${name}`;
  return `${qty} ${name}`;
}
