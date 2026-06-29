import type { UnitOfMeasureDto } from "../types/shopping";

/** Built-in aliases for import parsing (ES/EN tokens → catalog display name). */
export const BASE_UNIT_ALIASES: Record<string, string> = {
  g: "Gramo",
  gr: "Gramo",
  gram: "Gramo",
  grams: "Gramo",
  gramo: "Gramo",
  gramos: "Gramo",
  kilogramo: "Kilogramo",
  kilogramos: "Kilogramo",
  kg: "Kilogramo",
  k: "Kilogramo",
  ml: "Mililitro",
  mililitro: "Mililitro",
  mililitros: "Mililitro",
  l: "Litro",
  litro: "Litro",
  litros: "Litro",
  unidad: "Unidad",
  unidades: "Unidad",
  ud: "Unidad",
  uds: "Unidad",
  count: "Unidad",
  unit: "Unidad",
  units: "Unidad",
  piece: "Unidad",
  pieces: "Unidad",
  cucharada: "Cucharada",
  cucharadas: "Cucharada",
  cucharadita: "Cucharadita",
  cucharaditas: "Cucharadita",
  pizca: "Pizca",
  pizcas: "Pizca",
  vaso: "Vaso",
  vasos: "Vaso",
  taza: "Taza",
  tazas: "Taza",
  bolsa: "Bolsa",
  bolsas: "Bolsa",
  manojo: "Manojo",
  manojos: "Manojo",
  diente: "Diente",
  dientes: "Diente",
  ramita: "Ramita",
  ramitas: "Ramita",
  hoja: "Hoja",
  hojas: "Hoja",
};

const SPOON_UNITS =
  "cucharada|cucharadas|cucharadita|cucharaditas|pizca|pizcas|vaso|vasos|taza|tazas|bolsa|bolsas|manojo|manojos|diente|dientes|ramita|ramitas|hoja|hojas";

export function escapeRegexToken(token: string): string {
  return token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildUnitResolveMap(units: UnitOfMeasureDto[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const [alias, name] of Object.entries(BASE_UNIT_ALIASES)) {
    map.set(alias.toLowerCase(), name);
  }
  for (const u of units) {
    const canonical = u.name.trim();
    if (!canonical) continue;
    map.set(canonical.toLowerCase(), canonical);
    const sym = u.symbol?.trim();
    if (sym) map.set(sym.toLowerCase(), canonical);
  }
  return map;
}

export function resolveUnitToken(token: string, units: UnitOfMeasureDto[]): string {
  const key = token.toLowerCase().replace(/\.$/, "");
  const map = buildUnitResolveMap(units);
  if (map.has(key)) return map.get(key)!;
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/** Regex fragment for units glued to numbers (100g, 2chrd). */
export function buildGluedUnitPattern(units: UnitOfMeasureDto[]): string {
  const tokens = new Set<string>([
    "g",
    "gr",
    "gram",
    "grams",
    "gramo",
    "gramos",
    "kg",
    "k",
    "ml",
    "mililitro",
    "mililitros",
    "l",
    "litro",
    "litros",
    "count",
    "unit",
    "units",
    "ud",
    "uds",
    "unidad",
    "unidades",
  ]);
  for (const u of units) {
    const sym = u.symbol?.trim();
    if (sym && sym.length <= 12) tokens.add(sym);
    const shortName = u.name.trim();
    if (shortName.length <= 12) tokens.add(shortName);
  }
  return [...tokens]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegexToken)
    .join("|");
}

export function buildSpacedUnitPattern(units: UnitOfMeasureDto[]): string {
  const map = buildUnitResolveMap(units);
  const extra = [...map.keys()].filter((k) => k.length <= 20 && !k.includes(" "));
  const tokens = new Set<string>([...extra, ...SPOON_UNITS.split("|")]);
  return [...tokens]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegexToken)
    .join("|");
}

export function isKnownUnitToken(token: string, units: UnitOfMeasureDto[]): boolean {
  const key = token.toLowerCase().replace(/\.$/, "");
  return buildUnitResolveMap(units).has(key);
}
