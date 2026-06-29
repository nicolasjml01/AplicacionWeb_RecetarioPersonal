/** Parse quantity from import dialog input (allows comma decimal separator). */
export function parseImportQuantity(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

export function formatImportQuantityForInput(quantity: number): string {
  if (Number.isInteger(quantity)) return String(quantity);
  return String(Number(quantity.toFixed(4))).replace(/\.?0+$/, "");
}
