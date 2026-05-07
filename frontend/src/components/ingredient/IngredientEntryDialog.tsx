import { useMemo } from "react";
import type { UnitOfMeasureDto } from "../../types/shopping";

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
}: IngredientEntryDialogProps) {
  const filteredUnits = useMemo(() => {
    const q = unitText.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => u.name.toLowerCase().includes(q));
  }, [unitText, units]);

  if (!open) return null;

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
    </div>
  );
}
