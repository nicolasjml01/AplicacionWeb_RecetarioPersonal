import { useEffect, useMemo, useRef, useState } from "react";
import type { UnitOfMeasureDto } from "../../types/shopping";
import { ImageEditorDialog } from "../recipe/editor/ImageEditorDialog";
import { applyImageEdits, isEditableImage, type ImageEdits } from "../../utils/imageEditing";
import type { IngredientCategoryOption } from "../../utils/ingredientCatalogUi";

type IngredientEntryDialogProps = {
  open: boolean;
  ingredientName: string;
  quantityText: string;
  unitText: string;
  units: UnitOfMeasureDto[];
  loadingUnits?: boolean;
  saving?: boolean;
  error?: string;
  title?: string;
  quantityLabel?: string;
  unitLabel?: string;
  availableUnitsLabel?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  deleteLabel?: string;
  quantityPlaceholder?: string;
  unitPlaceholder?: string;
  showDelete?: boolean;
  onQuantityChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onRequestClose?: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  onDelete?: () => void;
  /**
   * When true (typically a brand-new name not picked from search), shows category + optional photo
   * so the user can classify the ingredient and attach an image like in the recipe mini-editor.
   */
  showCreateExtras?: boolean;
  ingredientCategoryOptions?: IngredientCategoryOption[];
  selectedIngredientCategoryId?: number | null;
  onSelectedIngredientCategoryIdChange?: (id: number | null) => void;
  createImageFile?: File | null;
  onCreateImageFileChange?: (file: File | null) => void;
  createExtrasLabels?: {
    category?: string;
    imageHint?: string;
    pickImage?: string;
    editImage?: string;
    removeImage?: string;
  };
};

export function IngredientEntryDialog({
  open,
  ingredientName,
  quantityText,
  unitText,
  units,
  loadingUnits = false,
  saving = false,
  error = "",
  title = "Ingrediente",
  quantityLabel = "Cantidad",
  unitLabel = "Unidad de medida",
  availableUnitsLabel = "Unidades disponibles",
  cancelLabel = "Cancelar",
  confirmLabel = "Guardar",
  deleteLabel = "Borrar",
  quantityPlaceholder = "Ej. 2",
  unitPlaceholder = "Ej. gramos, litros, unidades...",
  showDelete = false,
  onQuantityChange,
  onUnitChange,
  onRequestClose,
  onCancel,
  onConfirm,
  onDelete,
  showCreateExtras = false,
  ingredientCategoryOptions = [],
  selectedIngredientCategoryId = null,
  onSelectedIngredientCategoryIdChange,
  createImageFile = null,
  onCreateImageFileChange,
  createExtrasLabels = {},
}: IngredientEntryDialogProps) {
  const filteredUnits = useMemo(() => {
    const q = unitText.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => u.name.toLowerCase().includes(q));
  }, [unitText, units]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageEditorFile, setImageEditorFile] = useState<File | null>(null);
  const [imageEditorSaving, setImageEditorSaving] = useState(false);
  const [imageEditorError, setImageEditorError] = useState("");

  useEffect(() => {
    if (!createImageFile) {
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(createImageFile);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [createImageFile]);

  const lx = {
    category: createExtrasLabels.category ?? "Categoría en tu despensa",
    imageHint:
      createExtrasLabels.imageHint ??
      "Opcional. Puedes recortar y ajustar como en las fotos de la receta.",
    pickImage: createExtrasLabels.pickImage ?? "Elegir foto",
    editImage: createExtrasLabels.editImage ?? "Editar foto",
    removeImage: createExtrasLabels.removeImage ?? "Quitar foto",
  };

  if (!open) return null;

  const canChangeCategory = Boolean(onSelectedIngredientCategoryIdChange);
  const canChangeImage = Boolean(onCreateImageFileChange);

  const handlePickImage = () => fileInputRef.current?.click();

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!onCreateImageFileChange) return;
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      return;
    }
    if (isEditableImage(f)) {
      setImageEditorFile(f);
      setImageEditorError("");
    } else {
      onCreateImageFileChange(f);
    }
  };

  const handleImageEditorApply = async (edits: ImageEdits) => {
    if (!imageEditorFile || !onCreateImageFileChange) return;
    setImageEditorSaving(true);
    setImageEditorError("");
    try {
      const blob = await applyImageEdits(imageEditorFile, edits);
      const ext = blob.type === "image/png" ? "png" : "jpg";
      const out = new File([blob], `ingredient.${ext}`, { type: blob.type || "image/jpeg" });
      onCreateImageFileChange(out);
      setImageEditorFile(null);
    } catch {
      setImageEditorError("No se pudo procesar la imagen.");
    } finally {
      setImageEditorSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="ingredient-dialog">
        <button
          type="button"
          className="ingredient-dialog__close"
          onClick={() => (onRequestClose ? onRequestClose() : onCancel())}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h2 className="ingredient-dialog__title">{title}</h2>
        <p className="ingredient-dialog__ingredient">{ingredientName}</p>

        {showCreateExtras && (canChangeCategory || canChangeImage) && (
          <div className="ingredient-dialog__create-extras">
            {canChangeCategory && (
              <label className="ingredient-dialog__field ingredient-dialog__field--full">
                <span>{lx.category}</span>
                <select
                  className="ingredient-dialog__input"
                  value={
                    selectedIngredientCategoryId == null
                      ? ""
                      : String(selectedIngredientCategoryId)
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    onSelectedIngredientCategoryIdChange?.(
                      raw === "" ? null : Number(raw),
                    );
                  }}
                  disabled={ingredientCategoryOptions.length === 0}
                >
                  {ingredientCategoryOptions.length === 0 ? (
                    <option value="">—</option>
                  ) : (
                    ingredientCategoryOptions.map((o) => (
                      <option key={o.categoryId} value={String(o.categoryId)}>
                        {o.categoryName}
                      </option>
                    ))
                  )}
                </select>
              </label>
            )}

            {canChangeImage && (
              <div className="ingredient-dialog__image-block">
                <p className="ingredient-dialog__image-hint">{lx.imageHint}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="ingredient-dialog__file-input"
                  onChange={handleFileInputChange}
                />
                {previewUrl && (
                  <div className="ingredient-dialog__image-preview-wrap">
                    <img src={previewUrl} alt="" className="ingredient-dialog__image-preview" />
                  </div>
                )}
                <div className="ingredient-dialog__image-actions">
                  <button type="button" className="btn btn--secondary" onClick={handlePickImage}>
                    {lx.pickImage}
                  </button>
                  {createImageFile && isEditableImage(createImageFile) && (
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => {
                        setImageEditorFile(createImageFile);
                        setImageEditorError("");
                      }}
                    >
                      {lx.editImage}
                    </button>
                  )}
                  {createImageFile && (
                    <button
                      type="button"
                      className="btn btn--secondary"
                      onClick={() => onCreateImageFileChange?.(null)}
                    >
                      {lx.removeImage}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="ingredient-dialog__row">
          <label className="ingredient-dialog__field">
            <span>{quantityLabel}</span>
            <input
              className="ingredient-dialog__input"
              type="number"
              step="0.01"
              min="0"
              value={quantityText}
              onChange={(e) => onQuantityChange(e.target.value)}
              placeholder={quantityPlaceholder}
            />
          </label>

          <label className="ingredient-dialog__field">
            <span>{unitLabel}</span>
            <input
              className="ingredient-dialog__input"
              value={unitText}
              onChange={(e) => onUnitChange(e.target.value)}
              placeholder={unitPlaceholder}
            />
          </label>
        </div>

        <div className="ingredient-dialog__units">
          <p>{availableUnitsLabel}</p>
          <div className="ingredient-dialog__units-list">
            {loadingUnits ? (
              <div className="ingredient-dialog__hint">Cargando unidades...</div>
            ) : filteredUnits.length === 0 ? (
              <div className="ingredient-dialog__hint">No hay coincidencias para "{unitText}".</div>
            ) : (
              filteredUnits.slice(0, 10).map((u) => (
                <button
                  key={u.unitId}
                  type="button"
                  className="ingredient-dialog__unit-option"
                  onClick={() => onUnitChange(u.name)}
                >
                  {u.symbol ? `${u.name} (${u.symbol})` : u.name}
                </button>
              ))
            )}
          </div>
        </div>

        {error && <p className="home-error ingredient-dialog__error">{error}</p>}

        <div className="ingredient-dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={saving}>
            {cancelLabel}
          </button>
          {showDelete && onDelete && (
            <button type="button" className="btn ingredient-dialog__delete-btn" onClick={onDelete} disabled={saving}>
              {deleteLabel}
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={onConfirm} disabled={saving}>
            {saving ? "Guardando..." : confirmLabel}
          </button>
        </div>
      </div>

      {imageEditorFile && (
        <ImageEditorDialog
          open
          file={imageEditorFile}
          fileName={imageEditorFile.name}
          saving={imageEditorSaving}
          errorMessage={imageEditorError}
          onCancel={() => {
            setImageEditorFile(null);
            setImageEditorError("");
          }}
          onApply={(edits) => void handleImageEditorApply(edits)}
        />
      )}
    </div>
  );
}
