/**
 * First display letter for ingredient avatar fallback (e.g. "Berenjena" → "B").
 */
export function ingredientInitialLetter(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  const letter = trimmed.charAt(0).toLocaleUpperCase("es");
  return letter || "?";
}

export function hasIngredientImage(imageUrl?: string | null): boolean {
  return Boolean(imageUrl?.trim());
}
