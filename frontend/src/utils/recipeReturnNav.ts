import type { NavigateFunction } from "react-router-dom";

/** Query params: ret=home|cat|drafts, cid= (cat), q= (home search). */
export type RecipeReturnNav =
  | { kind: "home"; q?: string }
  | { kind: "category"; categoryId: number }
  | { kind: "drafts" };

const KEY_RET = "ret";
const KEY_CID = "cid";
const KEY_Q = "q";

export function parseRecipeReturnNav(params: URLSearchParams): RecipeReturnNav | null {
  const ret = params.get(KEY_RET);
  if (ret === "home") {
    const q = params.get(KEY_Q);
    return { kind: "home", q: q != null && q.length > 0 ? q : undefined };
  }
  if (ret === "cat") {
    const cid = Number(params.get(KEY_CID));
    if (!Number.isFinite(cid)) return null;
    return { kind: "category", categoryId: cid };
  }
  if (ret === "drafts") return { kind: "drafts" };
  return null;
}

export function recipeReturnNavToSearchParams(nav: RecipeReturnNav): URLSearchParams {
  const p = new URLSearchParams();
  if (nav.kind === "home") {
    p.set(KEY_RET, "home");
    if (nav.q) p.set(KEY_Q, nav.q);
  } else if (nav.kind === "category") {
    p.set(KEY_RET, "cat");
    p.set(KEY_CID, String(nav.categoryId));
  } else {
    p.set(KEY_RET, "drafts");
  }
  return p;
}

export function recipeReturnNavToQueryString(nav: RecipeReturnNav | null): string {
  if (!nav) return "";
  return recipeReturnNavToSearchParams(nav).toString();
}

/** Appends return-nav params to a path that may already have a query string. */
export function appendRecipeReturnNav(path: string, nav: RecipeReturnNav | null): string {
  const extra = recipeReturnNavToQueryString(nav);
  if (!extra) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${extra}`;
}

/** Merges existing search (e.g. `editId=1`) with return navigation. */
export function mergeSearchWithReturnNav(baseSearch: string, nav: RecipeReturnNav | null): string {
  const extra = recipeReturnNavToQueryString(nav);
  if (!extra) return baseSearch.replace(/^\?/, "");
  const trimmed = baseSearch.replace(/^\?/, "").replace(/&$/, "");
  return trimmed ? `${trimmed}&${extra}` : extra;
}

export function navigateAfterRecipeEditorExit(
  navigate: NavigateFunction,
  currentParams: URLSearchParams,
): void {
  const nav = parseRecipeReturnNav(currentParams);
  if (nav?.kind === "category") {
    navigate(`/home/categories/${nav.categoryId}`);
    return;
  }
  if (nav?.kind === "drafts") {
    navigate("/home/drafts");
    return;
  }
  if (nav?.kind === "home") {
    if (nav.q) {
      navigate({ pathname: "/home", search: `?q=${encodeURIComponent(nav.q)}` });
    } else {
      navigate("/home");
    }
    return;
  }
  navigate("/home");
}

export function navigateBackFromRecipeDetail(
  navigate: NavigateFunction,
  currentParams: URLSearchParams,
  legacyFromCategoryId?: number | null,
): void {
  const nav = parseRecipeReturnNav(currentParams);
  if (nav?.kind === "category") {
    navigate(`/home/categories/${nav.categoryId}`);
    return;
  }
  if (nav?.kind === "drafts") {
    navigate("/home/drafts");
    return;
  }
  if (nav?.kind === "home") {
    if (nav.q) {
      navigate({ pathname: "/home", search: `?q=${encodeURIComponent(nav.q)}` });
    } else {
      navigate("/home");
    }
    return;
  }
  if (legacyFromCategoryId != null) {
    navigate(`/home/categories/${legacyFromCategoryId}`);
    return;
  }
  navigate("/home");
}
