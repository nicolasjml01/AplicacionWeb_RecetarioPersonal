import { useMemo, type FormEvent } from "react";
import type { UnitOfMeasureDto } from "../../types/shopping";
import type { IngredientCategoryOption } from "../../utils/ingredientCatalogUi";
import { IngredientImagePicker } from "./IngredientImagePicker";
import { ModalBackdrop } from "../ui/ModalBackdrop";

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
    previewFit?: string;
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
  const trimmedUnitText = unitText.trim();
  const normalizedUnitText = trimmedUnitText.toLowerCase();

  const selectedUnit = useMemo(
    () => units.find((u) => u.name.toLowerCase() === normalizedUnitText) ?? null,
    [normalizedUnitText, units],
  );

  const filteredUnits = useMemo(() => {
    if (!normalizedUnitText) return units;
    return units.filter((u) => u.name.toLowerCase().includes(normalizedUnitText));
  }, [normalizedUnitText, units]);

  const clearSelectedUnit = () => onUnitChange("");

  const lx = {
    category: createExtrasLabels.category ?? "Categoría en tu despensa",
    imageHint:
      createExtrasLabels.imageHint ??
      "Opcional. La vista previa muestra cómo se verá en recetas y en la cesta.",
    pickImage: createExtrasLabels.pickImage ?? "Elegir foto",
    editImage: createExtrasLabels.editImage ?? "Editar foto",
    removeImage: createExtrasLabels.removeImage ?? "Quitar foto",
  };

  if (!open) return null;

  const canChangeCategory = Boolean(onSelectedIngredientCategoryIdChange);
  const canChangeImage = Boolean(onCreateImageFileChange);

  const dismiss = () => (onRequestClose ? onRequestClose() : onCancel());

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!saving) onConfirm();
  };

  return (
    <ModalBackdrop onDismiss={dismiss} disabled={saving}>
      <div
        className="ingredient-dialog"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="ingredient-dialog__close"
          onClick={dismiss}
          aria-label="Cerrar"
          disabled={saving}
        >
          ×
        </button>
        <form onSubmit={handleSubmit}>
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

            {canChangeImage && onCreateImageFileChange && (
              <IngredientImagePicker
                imageFile={createImageFile ?? null}
                onImageFileChange={onCreateImageFileChange}
                disabled={saving}
                labels={{
                  hint: lx.imageHint,
                  pickImage: lx.pickImage,
                  editImage: lx.editImage,
                  removeImage: lx.removeImage,
                }}
              />
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
            ) : selectedUnit ? (
              <div className="ingredient-dialog__unit-selected">
                <span className="ingredient-dialog__unit-selected-label">
                  {selectedUnit.symbol
                    ? `${selectedUnit.name} (${selectedUnit.symbol})`
                    : selectedUnit.name}
                </span>
                <button
                  type="button"
                  className="ingredient-dialog__unit-selected-clear"
                  onClick={clearSelectedUnit}
                  aria-label="Quitar unidad seleccionada"
                  disabled={saving}
                >
                  ×
                </button>
              </div>
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

        <div
          className={`ingredient-dialog__actions${
            showDelete && onDelete ? " ingredient-dialog__actions--three" : " ingredient-dialog__actions--two"
          }`}
        >
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={saving}>
            {cancelLabel}
          </button>
          {showDelete && onDelete && (
            <button
              type="button"
              className="btn create-recipe-dialog__btn-danger"
              onClick={onDelete}
              disabled={saving}
            >
              {deleteLabel}
            </button>
          )}
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Guardando..." : confirmLabel}
          </button>
        </div>
        </form>
      </div>
    </ModalBackdrop>
  );
}
