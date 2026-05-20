import { IngredientThumb } from "../../ingredient/IngredientThumb";
import { RecipeMiniTilePreview } from "../RecipeMiniTile";

export type ImageEditorPreviewContext = "plain" | "recipe" | "ingredient";

type Props = {
  previewSrc: string | null;
  loading?: boolean;
  context: ImageEditorPreviewContext;
  recipeTitle?: string;
  showCoverTile?: boolean;
};

/** Live strip above the cropper: exact saved output + optional in-app frames. */
export function ImageEditorLivePreview({
  previewSrc,
  loading = false,
  context,
  recipeTitle = "Tu receta",
  showCoverTile = true,
}: Props) {
  return (
    <div className="image-editor__live-preview" aria-live="polite">
      <p className="image-editor__live-preview-title">Lo que se guardará (solo el recuadro de abajo)</p>
      <div className="image-editor__live-preview-row">
        <div className="image-editor__live-preview-saved">
          <span className="image-editor__live-preview-tag">Archivo final</span>
          <div className="image-editor__live-preview-saved-frame">
            {loading && <span className="image-editor__live-preview-placeholder">Actualizando…</span>}
            {!loading && previewSrc && (
              <img src={previewSrc} alt="" className="image-editor__live-preview-saved-img" />
            )}
            {!loading && !previewSrc && (
              <span className="image-editor__live-preview-placeholder">Mueve el recuadro para ver la vista previa</span>
            )}
          </div>
        </div>

        {context === "recipe" && previewSrc && !loading && (
          <>
            <div className="image-editor__live-preview-context">
              <span className="image-editor__live-preview-tag">Galería</span>
              <div className="upload-layout-preview__media-strip">
                <img src={previewSrc} alt="" />
              </div>
            </div>
            {showCoverTile && (
              <div className="image-editor__live-preview-context image-editor__live-preview-context--tile">
                <span className="image-editor__live-preview-tag">Portada</span>
                <RecipeMiniTilePreview title={recipeTitle} coverImageUrl={previewSrc} layout="comfortable" />
              </div>
            )}
          </>
        )}

        {context === "ingredient" && previewSrc && !loading && (
          <div className="image-editor__live-preview-context">
            <span className="image-editor__live-preview-tag">Recetas y cesta</span>
            <IngredientThumb previewSrc={previewSrc} size="card" />
          </div>
        )}
      </div>
      <p className="image-editor__live-preview-hint">
        {context === "ingredient"
          ? "Fuera del recuadro no se guarda. En la app la foto se muestra entera, sin recortar de nuevo."
          : "Fuera del recuadro blanco no se guarda. En galería y portada se vuelve a encuadrar en 4:3."}
      </p>
    </div>
  );
}
