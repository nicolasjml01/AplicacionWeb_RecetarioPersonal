import { useObjectUrlPreview } from "../../hooks/useObjectUrlPreview";
import { IngredientThumb } from "./IngredientThumb";

type Props = {
  imageUrl?: string | null;
  pendingImageFile?: File | null;
  size?: "card" | "compact";
};

export function IngredientRowThumb({ imageUrl, pendingImageFile, size = "card" }: Props) {
  const pendingPreview = useObjectUrlPreview(pendingImageFile);
  return (
    <IngredientThumb
      imageUrl={pendingPreview ? null : imageUrl}
      previewSrc={pendingPreview}
      size={size}
    />
  );
}
