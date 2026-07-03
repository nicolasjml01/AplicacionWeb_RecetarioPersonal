import type { RecipeCategoryDto, RecipeDto } from "../types/recipes";
import { hasIngredientImage } from "./ingredientImage";
import { resolveMediaUrl } from "./mediaUrl";
import { getRecipeCoverMedia } from "./recipeCover";

export type PreloadPriority = "high" | "normal" | "low";

const MAX_CONCURRENT = 6;

const preloaded = new Set<string>();
const inFlight = new Set<string>();

const highQueue: string[] = [];
const normalQueue: string[] = [];
const lowQueue: string[] = [];

let activeCount = 0;

function queueFor(priority: PreloadPriority): string[] {
  if (priority === "high") return highQueue;
  if (priority === "low") return lowQueue;
  return normalQueue;
}

function dequeueNext(): string | undefined {
  if (highQueue.length > 0) return highQueue.shift();
  if (normalQueue.length > 0) return normalQueue.shift();
  if (lowQueue.length > 0) return lowQueue.shift();
  return undefined;
}

function normalizeMediaUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return resolveMediaUrl(trimmed);
}

function enqueueUrls(urls: Iterable<string | null | undefined>, priority: PreloadPriority): void {
  const queue = queueFor(priority);
  for (const raw of urls) {
    const src = normalizeMediaUrl(raw);
    if (!src || preloaded.has(src) || inFlight.has(src)) continue;
    queue.push(src);
  }
  pump();
}

function pump(): void {
  while (activeCount < MAX_CONCURRENT) {
    let src: string | undefined;
    while (true) {
      const next = dequeueNext();
      if (!next) return;
      if (preloaded.has(next) || inFlight.has(next)) continue;
      src = next;
      break;
    }

    inFlight.add(src);
    activeCount += 1;

    const img = new Image();
    img.decoding = "async";

    const finish = () => {
      inFlight.delete(src);
      preloaded.add(src);
      activeCount -= 1;
      pump();
    };

    img.onload = finish;
    img.onerror = finish;
    img.src = src;
  }
}

/** Warm browser cache for media URLs (deduped per session, priority-aware). */
export function preloadImages(
  urls: Iterable<string | null | undefined>,
  priority: PreloadPriority = "normal",
): void {
  enqueueUrls(urls, priority);
}

/** Same as preloadImages but only for ingredient imageUrl fields. */
export function preloadIngredientImages(
  urls: Iterable<string | null | undefined>,
  priority: PreloadPriority = "normal",
): void {
  const filtered: string[] = [];
  for (const raw of urls) {
    if (hasIngredientImage(raw)) filtered.push(raw!.trim());
  }
  enqueueUrls(filtered, priority);
}

/** Schedule low-priority work when the browser is idle (falls back to timeout). */
export function preloadWhenIdle(
  urls: Iterable<string | null | undefined>,
  priority: PreloadPriority = "low",
): void {
  const run = () => preloadImages(urls, priority);
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(run, { timeout: 4000 });
  } else {
    window.setTimeout(run, 250);
  }
}

export function collectIngredientImageUrls(
  items: Iterable<{ imageUrl?: string | null }>,
): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (hasIngredientImage(item.imageUrl)) out.push(item.imageUrl!.trim());
  }
  return out;
}

export function collectCatalogImageUrls(
  catalog: { ingredients: { imageUrl?: string | null }[] }[],
): string[] {
  return catalog.flatMap((category) => collectIngredientImageUrls(category.ingredients));
}

export function collectRecipeIngredientImageUrls(
  rows: { ingredient: { imageUrl?: string | null } }[],
): string[] {
  return collectIngredientImageUrls(rows.map((row) => row.ingredient));
}

export function collectRecipeCoverUrls(recipes: Iterable<RecipeDto>): string[] {
  const out: string[] = [];
  for (const recipe of recipes) {
    const cover = getRecipeCoverMedia(recipe);
    if (cover && !cover.contentType.startsWith("video/")) {
      out.push(cover.url.trim());
    }
  }
  return out;
}

/** Covers shown on the home grid (up to 4 recipes per category column). */
export function collectVisibleHomeCoverUrls(
  categories: RecipeCategoryDto[],
  recipesByCategoryId: Map<number, RecipeDto[]>,
): string[] {
  const seenRecipeIds = new Set<number>();
  const urls: string[] = [];

  for (const category of categories) {
    const recipes = recipesByCategoryId.get(category.categoryId) ?? [];
    for (const recipe of recipes.slice(0, 4)) {
      if (seenRecipeIds.has(recipe.recipeId)) continue;
      seenRecipeIds.add(recipe.recipeId);

      const cover = getRecipeCoverMedia(recipe);
      if (cover && !cover.contentType.startsWith("video/")) {
        urls.push(cover.url.trim());
      }
    }
  }

  return urls;
}
