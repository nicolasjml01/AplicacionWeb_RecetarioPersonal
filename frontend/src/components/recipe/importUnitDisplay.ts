import type { UnitOfMeasureDto } from "../../types/shopping";

/** Short labels for import cards when the full unit name does not fit. */
const UNIT_SHORT_BY_NAME: Record<string, string> = {
  unidad: "ud",
  unidades: "ud",
  kilogramo: "kg",
  kilogramos: "kg",
  gramo: "g",
  gramos: "g",
  litro: "l",
  litros: "l",
  mililitro: "ml",
  mililitros: "ml",
  cucharada: "cda",
  cucharadas: "cdas",
  cucharadita: "cdta",
  cucharaditas: "cdtas",
  cucharón: "cdón",
  cucharones: "cdónes",
  pizca: "pizca",
  pizcas: "pizcas",
  taza: "tza",
  tazas: "tzas",
  onza: "oz",
  onzas: "oz",
};

const MAX_UNIT_LABEL_LEN = 7;

export function defaultUnitName(
  unit: { name: string; symbol: string | null } | null | undefined,
): string {
  return unit?.name?.trim() ?? "";
}

function shortLabelForName(name: string): string {
  const key = name.trim().toLowerCase();
  if (!key) return "—";
  if (UNIT_SHORT_BY_NAME[key]) return UNIT_SHORT_BY_NAME[key];
  if (name.length <= MAX_UNIT_LABEL_LEN) return name;
  return name.slice(0, MAX_UNIT_LABEL_LEN - 1) + "…";
}

/** Compact unit text for import ingredient pills (symbol or acronym). */
export function displayUnitLabel(unitName: string, units: UnitOfMeasureDto[]): string {
  const trimmed = unitName.trim();
  if (!trimmed) return "—";

  const match = units.find((u) => u.name.toLowerCase() === trimmed.toLowerCase());
  const symbol = match?.symbol?.trim();
  if (symbol) return symbol;

  if (match?.name) {
    const fromCatalog = UNIT_SHORT_BY_NAME[match.name.toLowerCase()];
    if (fromCatalog) return fromCatalog;
    if (match.name.length <= MAX_UNIT_LABEL_LEN) return match.name;
  }

  return shortLabelForName(trimmed);
}
