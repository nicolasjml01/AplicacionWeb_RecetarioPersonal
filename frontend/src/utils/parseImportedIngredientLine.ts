export type ParsedImportedIngredient = {
  rawText: string;
  ingredientName: string;
  quantity: number | null;
  measurementUnit: string | null;
};

const NUMBER_TOKEN =
  "(\\d+(?:[.,]\\d+)?|\\d+\\s*/\\s*\\d+|[½¼¾⅓⅔])";

/** Units that may appear glued to the number: 100g, 20ml, 2count */
const GLUED_UNIT =
  "g|gr|gram|grams|gramo|gramos|kg|kilogramo|kilogramos|ml|mililitro|mililitros|l|litro|litros|count|unit|units|ud|uds|unidad|unidades";

const RE_QTY_GLUED_UNIT_NAME = new RegExp(
  `^${NUMBER_TOKEN}\\s*(${GLUED_UNIT})\\s+(.+)$`,
  "iu",
);

const RE_QTY_UNIT_NAME = new RegExp(
  `^${NUMBER_TOKEN}\\s+(${GLUED_UNIT}|cucharada|cucharadas|cucharadita|cucharaditas|pizca|pizcas|vaso|vasos|taza|tazas|bolsa|bolsas|manojo|manojos|diente|dientes|ramita|ramitas|hoja|hojas)\\s+(?:de\\s+|del\\s+)?(.+)$`,
  "iu",
);

const RE_QTY_NAME = new RegExp(`^${NUMBER_TOKEN}\\s+(.+)$`, "iu");

const RE_UNIT_NAME = new RegExp(
  `^(${GLUED_UNIT}|cucharada|cucharadas|cucharadita|cucharaditas|pizca|pizcas|vaso|vasos|taza|tazas|bolsa|bolsas|manojo|manojos|diente|dientes|ramita|ramitas|hoja|hojas)\\s+(.+)$`,
  "iu",
);

const UNIT_TO_CATALOG: Record<string, string> = {
  g: "Gramo",
  gr: "Gramo",
  gram: "Gramo",
  grams: "Gramo",
  gramo: "Gramo",
  gramos: "Gramo",
  kg: "Kilogramo",
  kilogramo: "Kilogramo",
  kilogramos: "Kilogramo",
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
};

function normalizeUnit(token: string): string {
  const key = token.toLowerCase().replace(/\.$/, "");
  return UNIT_TO_CATALOG[key] ?? token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function parseQuantityToken(token: string): number | null {
  const t = token.trim();
  if (t === "½") return 0.5;
  if (t === "¼") return 0.25;
  if (t === "¾") return 0.75;
  if (t === "⅓") return 1 / 3;
  if (t === "⅔") return 2 / 3;
  const frac = /^(\d+)\s*\/\s*(\d+)$/.exec(t.replace(",", "."));
  if (frac) {
    const num = Number(frac[1]);
    const den = Number(frac[2]);
    if (den > 0 && Number.isFinite(num)) return num / den;
  }
  const n = Number(t.replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function shouldKeepAsWholeLine(line: string): boolean {
  if (line.length > 100) return true;
  const commaParts = line.split(",").map((p) => p.trim()).filter(Boolean);
  if (commaParts.length >= 2) {
    const hasLeadingNumber = /^\d/.test(line);
    if (!hasLeadingNumber || commaParts.length >= 3) return true;
    if (/\s+y\s+/i.test(line)) return true;
  }
  if (/\s+y\s+/i.test(line) && line.length > 45) return true;
  return false;
}

function build(
  rawText: string,
  ingredientName: string,
  quantity: number | null,
  measurementUnit: string | null,
): ParsedImportedIngredient {
  return { rawText, ingredientName, quantity, measurementUnit };
}

function tryQtyUnitName(
  trimmed: string,
  re: RegExp,
): ParsedImportedIngredient | null {
  const m = re.exec(trimmed);
  if (!m) return null;
  const quantity = parseQuantityToken(m[1]);
  const unit = normalizeUnit(m[2]);
  const name = m[3].trim();
  if (!name) return null;
  return build(trimmed, name, quantity, unit);
}

/**
 * Best-effort parse of a single ingredient line from external recipe sites (ES/EN).
 */
export function parseImportedIngredientLine(
  rawText: string,
  existing?: {
    ingredientName?: string | null;
    quantity?: number | null;
    measurementUnit?: string | null;
  },
): ParsedImportedIngredient {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return build("", "", null, null);
  }

  if (
    existing?.quantity != null &&
    Number.isFinite(existing.quantity) &&
    existing.ingredientName?.trim() &&
    existing.ingredientName.trim() !== trimmed
  ) {
    return build(
      trimmed,
      existing.ingredientName.trim(),
      existing.quantity,
      existing.measurementUnit?.trim() || null,
    );
  }

  if (shouldKeepAsWholeLine(trimmed)) {
    return build(trimmed, trimmed, null, null);
  }

  const glued = tryQtyUnitName(trimmed, RE_QTY_GLUED_UNIT_NAME);
  if (glued) return glued;

  const spaced = tryQtyUnitName(trimmed, RE_QTY_UNIT_NAME);
  if (spaced) return spaced;

  const mQtyName = RE_QTY_NAME.exec(trimmed);
  if (mQtyName) {
    const quantity = parseQuantityToken(mQtyName[1]);
    const name = mQtyName[2].trim();
    if (name) {
      return build(trimmed, name, quantity, null);
    }
  }

  const mUnitName = RE_UNIT_NAME.exec(trimmed);
  if (mUnitName) {
    const unit = normalizeUnit(mUnitName[1]);
    const name = mUnitName[2].trim();
    if (name) {
      return build(trimmed, name, null, unit);
    }
  }

  return build(trimmed, trimmed, null, null);
}
