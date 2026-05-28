import type { CSSProperties } from "react";
import { IngredientThumb } from "../ingredient/IngredientThumb";
import { RecipeMiniTilePreview } from "../recipe/RecipeMiniTile";
import { editsToFilter, type ImageEdits } from "../../utils/imageEditing";

type Props = {
  previewSrc: string;
  /** CSS filter from pending brightness/contrast/saturation edits. */
  imageStyle?: CSSProperties;
};

/** How an ingredient photo appears in recipes and the shopping list. */
export function IngredientUploadLayoutPreview({ previewSrc }: Pick<Props, "previewSrc">) {
  return (
    <div className="upload-layout-preview">
      <p className="upload-layout-preview__label">Vista en recetas y cesta</p>
      <IngredientThumb previewSrc={previewSrc} size="card" />
      <p className="upload-layout-preview__hint">
        La imagen se ajusta sin recortar. Si queda mucho espacio en blanco, usa una foto más cercana al
        producto.
      </p>
    </div>
  );
}

type RecipeProps = Props & {
  edits?: ImageEdits | null;
  recipeTitle?: string;
  /** True when this file will be first in the gallery (cover). */
  isCoverCandidate?: boolean;
};

/** How recipe photos appear in the editor gallery and category/home cards. */
export function RecipeUploadLayoutPreview({
  previewSrc,
  edits,
  recipeTitle = "Tu receta",
  isCoverCandidate = true,
  imageStyle,
}: RecipeProps) {
  const filterStyle = imageStyle ?? editsToFilter(edits);

  return (
    <div className="upload-layout-preview upload-layout-preview--recipe">
      <p className="upload-layout-preview__label">Cómo se verá al subir</p>
      <div className="upload-layout-preview__recipe-row">
        <div className="upload-layout-preview__frame">
          <p className="upload-layout-preview__frame-label">Galería de la receta</p>
          <div className="upload-layout-preview__media-strip">
            <img src={previewSrc} alt="" style={filterStyle} />
          </div>
        </div>
        {isCoverCandidate && (
          <div className="upload-layout-preview__frame upload-layout-preview__frame--tile">
            <p className="upload-layout-preview__frame-label">Portada en listados</p>
            <RecipeMiniTilePreview title={recipeTitle} coverImageUrl={previewSrc} layout="comfortable" />
          </div>
        )}
      </div>
      <p className="upload-layout-preview__hint">
        En la galería y como portada la foto usa recorte tipo tarjeta (4:3). La primera imagen del lote será la
        portada si aún no hay otras en la galería.
      </p>
    </div>
  );
}
