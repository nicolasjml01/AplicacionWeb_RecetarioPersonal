import { ingredientImageSrc, INGREDIENT_IMAGE_PLACEHOLDER } from "../../utils/ingredientImage";

type Size = "card" | "compact";

type Props = {
  imageUrl?: string | null;
  /** Raw preview URL (e.g. object URL while picking a file). */
  previewSrc?: string | null;
  size?: Size;
  alt?: string;
  className?: string;
};

/**
 * Ingredient photo frame shared by shopping list, recipe detail, import dialogs, etc.
 */
export function IngredientThumb({
  imageUrl,
  previewSrc,
  size = "card",
  alt = "",
  className = "",
}: Props) {
  const src = previewSrc?.trim() ? previewSrc : ingredientImageSrc(imageUrl);

  return (
    <div
      className={["ingredient-thumb", `ingredient-thumb--${size}`, className].filter(Boolean).join(" ")}
    >
      <img
        src={src}
        alt={alt}
        className="ingredient-thumb__img"
        loading="lazy"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = INGREDIENT_IMAGE_PLACEHOLDER;
        }}
      />
    </div>
  );
}
