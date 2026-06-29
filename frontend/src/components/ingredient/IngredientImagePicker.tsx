import { useEffect, useRef, useState } from "react";
import { IngredientUploadLayoutPreview } from "../media/UploadLayoutPreview";
import { ImageEditorDialog } from "../recipe/editor/ImageEditorDialog";
import { applyImageEdits, isEditableImage, type ImageEdits } from "../../utils/imageEditing";
import { resolveMediaUrl } from "../../utils/mediaUrl";

type Labels = {
  hint?: string;
  pickImage?: string;
  editImage?: string;
  removeImage?: string;
};

type Props = {
  imageFile: File | null;
  onImageFileChange: (file: File | null) => void;
  /** Shown when no new file is selected (e.g. current ingredient image). */
  existingImageUrl?: string | null;
  disabled?: boolean;
  labels?: Labels;
  className?: string;
};

const DEFAULT_LABELS: Required<Labels> = {
  hint: "Opcional. La vista previa muestra cómo se verá en recetas y en la cesta.",
  pickImage: "Elegir foto",
  editImage: "Editar foto",
  removeImage: "Quitar foto",
};

/** Pick, crop/edit and preview an ingredient image (create or edit owned ingredient). */
export function IngredientImagePicker({
  imageFile,
  onImageFileChange,
  existingImageUrl,
  disabled = false,
  labels = {},
  className = "",
}: Props) {
  const lx = {
    hint: labels.hint ?? DEFAULT_LABELS.hint,
    pickImage: labels.pickImage ?? DEFAULT_LABELS.pickImage,
    editImage: labels.editImage ?? DEFAULT_LABELS.editImage,
    removeImage: labels.removeImage ?? DEFAULT_LABELS.removeImage,
  };
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageEditorFile, setImageEditorFile] = useState<File | null>(null);
  const [imageEditorSaving, setImageEditorSaving] = useState(false);
  const [imageEditorError, setImageEditorError] = useState("");

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  const existingPreview =
    !imageFile && existingImageUrl?.trim()
      ? resolveMediaUrl(existingImageUrl.trim())
      : null;
  const displayPreviewUrl = previewUrl ?? existingPreview;

  const handlePickImage = () => fileInputRef.current?.click();

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    if (isEditableImage(f)) {
      setImageEditorFile(f);
      setImageEditorError("");
    } else {
      onImageFileChange(f);
    }
  };

  const handleImageEditorApply = async (edits: ImageEdits) => {
    if (!imageEditorFile) return;
    setImageEditorSaving(true);
    setImageEditorError("");
    try {
      const blob = await applyImageEdits(imageEditorFile, edits);
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const out = new File([blob], `ingredient.${ext}`, { type: blob.type || "image/jpeg" });
      onImageFileChange(out);
      setImageEditorFile(null);
    } catch {
      setImageEditorError("No se pudo procesar la imagen.");
    } finally {
      setImageEditorSaving(false);
    }
  };

  const rootClass = ["ingredient-dialog__image-block", className].filter(Boolean).join(" ");

  return (
    <>
      <div className={rootClass}>
        <p className="ingredient-dialog__image-hint">{lx.hint}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="ingredient-dialog__file-input"
          disabled={disabled}
          onChange={handleFileInputChange}
        />
        {displayPreviewUrl && (
          <div className="ingredient-dialog__image-preview-wrap">
            <IngredientUploadLayoutPreview previewSrc={displayPreviewUrl} />
          </div>
        )}
        <div className="ingredient-dialog__image-actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handlePickImage}
            disabled={disabled}
          >
            {imageFile || existingPreview ? "Cambiar foto" : lx.pickImage}
          </button>
          {imageFile && isEditableImage(imageFile) && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setImageEditorFile(imageFile);
                setImageEditorError("");
              }}
              disabled={disabled}
            >
              {lx.editImage}
            </button>
          )}
          {imageFile && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => onImageFileChange(null)}
              disabled={disabled}
            >
              {lx.removeImage}
            </button>
          )}
        </div>
      </div>

      {imageEditorFile && (
        <ImageEditorDialog
          open
          file={imageEditorFile}
          fileName={imageEditorFile.name}
          previewContext="ingredient"
          saving={imageEditorSaving}
          errorMessage={imageEditorError}
          onCancel={() => {
            setImageEditorFile(null);
            setImageEditorError("");
          }}
          onApply={(edits) => void handleImageEditorApply(edits)}
        />
      )}
    </>
  );
}
