import type { RecipeDto, RecipeMediaDto } from "../types/recipes";

/**
 * Cover for cards: first global gallery item by display_order, else first media of the first step.
 */
export function getRecipeCoverMedia(recipe: RecipeDto): RecipeMediaDto | null {
  const global = [...recipe.recipeLevelMedia].sort((a, b) => a.displayOrder - b.displayOrder);
  if (global.length > 0) return global[0]!;

  const steps = [...recipe.steps].sort((a, b) => a.stepNumber - b.stepNumber);
  for (const s of steps) {
    const stepMedia = [...s.media].sort((a, b) => a.displayOrder - b.displayOrder);
    if (stepMedia.length > 0) return stepMedia[0]!;
  }
  return null;
}
