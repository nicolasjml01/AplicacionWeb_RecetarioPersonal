import {
  buildGluedUnitPattern,
  buildSpacedUnitPattern,
  isKnownUnitToken,
  resolveUnitToken,
} from "./unitParsing";
import type { UnitOfMeasureDto } from "../types/shopping";

export type ParsedImportedIngredient = {
  rawText: string;
  ingredientName: string;
  quantity: number | null;
  measurementUnit: string | null;
};

const NUMBER_TOKEN =
  "(\\d+(?:[.,]\\d+)?|\\d+\\s*/\\s*\\d+|[½¼¾⅓⅔])";

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
  units: UnitOfMeasureDto[],
): ParsedImportedIngredient | null {
  const m = re.exec(trimmed);
  if (!m) return null;
  const quantity = parseQuantityToken(m[1]);
  const unitToken = m[2];
  if (!isKnownUnitToken(unitToken, units)) return null;
  const unit = resolveUnitToken(unitToken, units);
  const name = m[3].trim();
  if (!name) return null;
  return build(trimmed, name, quantity, unit);
}

function tryQtyGenericUnitName(
  trimmed: string,
  units: UnitOfMeasureDto[],
): ParsedImportedIngredient | null {
  const re = new RegExp(
    `^${NUMBER_TOKEN}\\s+(\\S+)\\s+(?:de\\s+|del\\s+)?(.+)$`,
    "iu",
  );
  const m = re.exec(trimmed);
  if (!m) return null;
  const unitToken = m[2];
  if (!isKnownUnitToken(unitToken, units)) return null;
  const quantity = parseQuantityToken(m[1]);
  const unit = resolveUnitToken(unitToken, units);
  const name = m[3].trim();
  if (!name) return null;
  return build(trimmed, name, quantity, unit);
}

/**
 * Best-effort parse of a single ingredient line from external recipe sites (ES/EN).
 * Pass {@code units} from the user catalog so custom abbreviations (e.g. chrd) resolve correctly.
 */
export function parseImportedIngredientLine(
  rawText: string,
  existing?: {
    ingredientName?: string | null;
    quantity?: number | null;
    measurementUnit?: string | null;
  },
  units: UnitOfMeasureDto[] = [],
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

  const gluedPattern = buildGluedUnitPattern(units);
  const spacedPattern = buildSpacedUnitPattern(units);

  const reGlued = new RegExp(`^${NUMBER_TOKEN}\\s*(${gluedPattern})\\s+(.+)$`, "iu");
  const reSpaced = new RegExp(
    `^${NUMBER_TOKEN}\\s+(${spacedPattern})\\s+(?:de\\s+|del\\s+)?(.+)$`,
    "iu",
  );
  const reUnitName = new RegExp(`^(${spacedPattern})\\s+(.+)$`, "iu");

  const glued = tryQtyUnitName(trimmed, reGlued, units);
  if (glued) return glued;

  const spaced = tryQtyUnitName(trimmed, reSpaced, units);
  if (spaced) return spaced;

  const generic = tryQtyGenericUnitName(trimmed, units);
  if (generic) return generic;

  const reQtyName = new RegExp(`^${NUMBER_TOKEN}\\s+(.+)$`, "iu");
  const mQtyName = reQtyName.exec(trimmed);
  if (mQtyName) {
    const quantity = parseQuantityToken(mQtyName[1]);
    const name = mQtyName[2].trim();
    if (name) {
      return build(trimmed, name, quantity, null);
    }
  }

  const mUnitName = reUnitName.exec(trimmed);
  if (mUnitName) {
    const unitToken = mUnitName[1];
    if (isKnownUnitToken(unitToken, units)) {
      const unit = resolveUnitToken(unitToken, units);
      const name = mUnitName[2].trim();
      if (name) {
        return build(trimmed, name, null, unit);
      }
    }
  }

  return build(trimmed, trimmed, null, null);
}
