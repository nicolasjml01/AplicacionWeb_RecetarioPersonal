import { IngredientThumb } from "../ingredient/IngredientThumb";
import { formatImportQuantityForInput } from "./importQuantity";

type Props = {
  name: string;
  ingredientImageUrl?: string | null;
  quantity: number;
  unitLabel: string;
  /** Full unit name for tooltip when the pill shows an abbreviation. */
  unitTitle?: string;
  disabled?: boolean;
  onEdit: () => void;
  onRemove: () => void;
};

export function ImportShoppingIngredientCard({
  name,
  ingredientImageUrl,
  quantity,
  unitLabel,
  unitTitle,
  disabled,
  onEdit,
  onRemove,
}: Props) {
  return (
    <article className="recipe-detail__ingredient-card import-ingredients-dialog__card">
      <button
        type="button"
        className="import-ingredients-dialog__card-media-btn"
        disabled={disabled}
        onClick={onRemove}
        aria-label={`Quitar ${name} de la compra (ya lo tengo)`}
      >
        <IngredientThumb imageUrl={ingredientImageUrl} size="card" />
      </button>
      <p className="recipe-detail__ingredient-name">{name}</p>
      <div className="recipe-detail__ingredient-pills import-ingredients-dialog__pills">
        <button
          type="button"
          className="import-ingredients-dialog__pill-btn"
          disabled={disabled}
          onClick={onEdit}
          aria-label={`Editar cantidad y unidad de ${name}`}
        >
          {formatImportQuantityForInput(quantity)}
        </button>
        <button
          type="button"
          className="import-ingredients-dialog__pill-btn import-ingredients-dialog__pill-btn--unit"
          disabled={disabled}
          onClick={onEdit}
          title={unitTitle && unitTitle !== unitLabel ? unitTitle : undefined}
          aria-label={`Editar unidad de ${name}${unitTitle ? ` (${unitTitle})` : ""}`}
        >
          {unitLabel}
        </button>
      </div>
    </article>
  );
}
