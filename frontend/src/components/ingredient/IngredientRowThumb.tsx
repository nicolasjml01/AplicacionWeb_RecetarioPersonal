import { useObjectUrlPreview } from "../../hooks/useObjectUrlPreview";
import { IngredientThumb } from "./IngredientThumb";

type Props = {
  name?: string | null;
  imageUrl?: string | null;
  pendingImageFile?: File | null;
  size?: "card" | "compact";
};

export function IngredientRowThumb({
  name,
  imageUrl,
  pendingImageFile,
  size = "card",
}: Props) {
  const pendingPreview = useObjectUrlPreview(pendingImageFile);
  return (
    <IngredientThumb
      name={name}
      imageUrl={pendingPreview ? null : imageUrl}
      previewSrc={pendingPreview}
      size={size}
    />
  );
}
