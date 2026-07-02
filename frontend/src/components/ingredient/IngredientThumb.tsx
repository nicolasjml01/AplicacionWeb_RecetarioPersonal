import { useEffect, useRef, useState } from "react";
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
  loading?: "eager" | "lazy";
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
  loading = "eager",
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const preview = previewSrc?.trim();
  const hasPreview = Boolean(preview);
  const hasRemoteImage = hasIngredientImage(imageUrl) && !imageFailed;
  const showImage = hasPreview || hasRemoteImage;
  const label = name?.trim() || alt.trim();
  const letter = ingredientInitialLetter(label);
  const imageAlt = alt || label || "Ingrediente";
  const src = showImage
    ? hasPreview
      ? preview!
      : resolveMediaUrl(imageUrl!.trim())
    : "";

  useEffect(() => {
    setImageFailed(false);
    setImageLoaded(false);
  }, [imageUrl, previewSrc]);

  useEffect(() => {
    if (!showImage) return;
    if (hasPreview) {
      setImageLoaded(true);
      return;
    }
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) {
      setImageLoaded(true);
    }
  }, [showImage, hasPreview, src]);

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

  return (
    <div className={rootClass}>
      {!imageLoaded && (
        <span className="ingredient-thumb__avatar ingredient-thumb__avatar--placeholder" aria-hidden>
          {letter}
        </span>
      )}
      <img
        ref={imgRef}
        src={src}
        alt={imageAlt}
        className={[
          "ingredient-thumb__img",
          imageLoaded ? "ingredient-thumb__img--loaded" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        loading={loading}
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={() => {
          setImageFailed(true);
          setImageLoaded(false);
        }}
      />
    </div>
  );
}
