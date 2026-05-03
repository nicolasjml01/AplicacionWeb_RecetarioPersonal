import { RECIPE_DEFAULT_COVER_PATH } from "../../constants/recipeAssets";
import type { RecipeDto } from "../../types/recipes";
import { getRecipeCoverMedia } from "../../utils/recipeCover";
import { resolveMediaUrl } from "../../utils/mediaUrl";

type Layout = "compact" | "comfortable";

type Props = {
  recipe: RecipeDto;
  layout?: Layout;
  className?: string;
};

/**
 * Title + cover thumbnail, or default app image when there is no media.
 */
export function RecipeMiniTile({ recipe, layout = "comfortable", className = "" }: Props) {
  const cover = getRecipeCoverMedia(recipe);
  const rootClass = [
    "recipe-mini-tile",
    layout === "compact" ? "recipe-mini-tile--compact" : "recipe-mini-tile--comfortable",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      <div className="recipe-mini-tile__media">
        {cover ? (
          cover.contentType.startsWith("video/") ? (
            <video
              className="recipe-mini-tile__img"
              src={resolveMediaUrl(cover.url)}
              muted
              playsInline
              preload="metadata"
              aria-hidden
            />
          ) : (
            <img
              className="recipe-mini-tile__img"
              src={resolveMediaUrl(cover.url)}
              alt=""
              loading="lazy"
            />
          )
        ) : (
          <div className="recipe-mini-tile__fallback" aria-hidden>
            <img
              src={RECIPE_DEFAULT_COVER_PATH}
              alt=""
              className="recipe-mini-tile__default-cover"
              loading="lazy"
            />
          </div>
        )}
      </div>
      <div className="recipe-mini-tile__title" title={recipe.title}>
        {recipe.title}
      </div>
    </div>
  );
}
