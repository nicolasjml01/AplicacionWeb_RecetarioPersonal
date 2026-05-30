import { IngredientThumb } from "./IngredientThumb";

type Props = {
  name: string;
  imageUrl?: string | null;
  onClick: () => void;
};

/** Catalog picker tile (shopping pantry categories). */
export function IngredientCatalogTile({ name, imageUrl, onClick }: Props) {
  return (
    <button type="button" className="ingredient-catalog-tile" onClick={onClick}>
      <IngredientThumb name={name} imageUrl={imageUrl} size="card" alt={name} />
      <span className="ingredient-catalog-tile__name">{name}</span>
    </button>
  );
}
