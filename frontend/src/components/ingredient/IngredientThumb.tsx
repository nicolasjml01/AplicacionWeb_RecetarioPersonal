import { useEffect, useState } from "react";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { hasIngredientImage, ingredientInitialLetter } from "../../utils/ingredientImage";

type Size = "card" | "compact";

type Props = {
  imageUrl?: string | null;
  /** Raw preview URL (e.g. object URL while picking a file). */
  previewSrc?: string | null;
  /** Shown as letter avatar when there is no image (or it fails to load). */
  name?: string | null;
  size?: Size;
  alt?: string;
  className?: string;
};

/**
 * Ingredient visual: custom photo when available, otherwise initial letter (like meal types).
 */
export function IngredientThumb({
  imageUrl,
  previewSrc,
  name,
  size = "card",
  alt = "",
  className = "",
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl, previewSrc]);
  const preview = previewSrc?.trim();
  const hasPreview = Boolean(preview);
  const hasRemoteImage = hasIngredientImage(imageUrl) && !imageFailed;
  const showImage = hasPreview || hasRemoteImage;
  const label = name?.trim() || alt.trim();
  const letter = ingredientInitialLetter(label);
  const imageAlt = alt || label || "Ingrediente";

  const rootClass = ["ingredient-thumb", `ingredient-thumb--${size}`, className]
    .filter(Boolean)
    .join(" ");

  if (!showImage) {
    return (
      <div className={rootClass} aria-hidden={!label}>
        <span className="ingredient-thumb__avatar">{letter}</span>
      </div>
    );
  }

  const src = hasPreview ? preview! : resolveMediaUrl(imageUrl!.trim());

  return (
    <div className={rootClass}>
      <img
        src={src}
        alt={imageAlt}
        className="ingredient-thumb__img"
        loading="lazy"
        onError={() => {
          setImageFailed(true);
        }}
      />
    </div>
  );
}
