import { IngredientEntryDialog } from "../ingredient/IngredientEntryDialog";
import type { UnitOfMeasureDto } from "../../types/shopping";

type Props = {
  open: boolean;
  ingredientName: string;
  quantityText: string;
  unitText: string;
  units: UnitOfMeasureDto[];
  loadingUnits?: boolean;
  error?: string;
  onQuantityChange: (value: string) => void;
  onUnitChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Same editor as the shopping list "Editar ítem" modal. */
export function ImportIngredientEditDialog({
  open,
  ingredientName,
  quantityText,
  unitText,
  units,
  loadingUnits,
  error,
  onQuantityChange,
  onUnitChange,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <IngredientEntryDialog
      open={open}
      title="Editar ítem"
      ingredientName={ingredientName}
      quantityText={quantityText}
      unitText={unitText}
      units={units}
      loadingUnits={loadingUnits}
      error={error}
      quantityLabel="Cantidad"
      unitLabel="Unidad de medida"
      availableUnitsLabel="Unidades disponibles"
      cancelLabel="Cancelar"
      confirmLabel="Guardar"
      quantityPlaceholder="p. ej. 2"
      unitPlaceholder="p. ej. gramos, litros, unidades…"
      onQuantityChange={onQuantityChange}
      onUnitChange={onUnitChange}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
