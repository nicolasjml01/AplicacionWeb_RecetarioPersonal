import { useMemo, useState, type FormEvent } from "react";
import type { IngredientDto } from "../../types/shopping";
import type { IngredientCategoryOption } from "../../utils/ingredientCatalogUi";
import { defaultIngredientCategoryId } from "../../utils/ingredientCatalogUi";
import { IngredientImagePicker } from "../ingredient/IngredientImagePicker";
import { ModalBackdrop, ModalPanel } from "../ui/ModalBackdrop";

type Props = {
  open: boolean;
  ingredient: IngredientDto | null;
  categoryOptions: IngredientCategoryOption[];
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (name: string, categoryId: number | null, imageFile: File | null) => void;
};

type FormProps = Omit<Props, "open" | "ingredient"> & {
  ingredient: IngredientDto;
};

function EditOwnedIngredientForm({
  ingredient,
  categoryOptions,
  saving = false,
  error = "",
  onClose,
  onSave,
}: FormProps) {
  const [name, setName] = useState(ingredient.name);
  const [categoryId, setCategoryId] = useState<number | null>(
    ingredient.categoryId ?? defaultIngredientCategoryId(categoryOptions),
  );
  const [imageFile, setImageFile] = useState<File | null>(null);

  const categorySelectOptions = useMemo(() => categoryOptions, [categoryOptions]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, categoryId, imageFile);
  };

  return (
    <ModalBackdrop onDismiss={onClose} disabled={saving}>
      <ModalPanel
        className="create-recipe-dialog cal-modal"
        aria-labelledby="edit-owned-ingredient-title"
      >
        <form onSubmit={handleSubmit}>
          <h2 id="edit-owned-ingredient-title" className="create-recipe-dialog__title">
            Editar ingrediente
          </h2>

          <IngredientImagePicker
            imageFile={imageFile}
            onImageFileChange={setImageFile}
            existingImageUrl={ingredient.imageUrl}
            disabled={saving}
            labels={{
              hint: "Puedes añadir o cambiar la foto; se verá en recetas, la cesta y tu despensa.",
            }}
          />

          <label className="form-group">
            <span>Nombre</span>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={saving}
            />
          </label>
          <label className="form-group">
            <span>Categoría</span>
            <select
              className="form-input"
              value={categoryId ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setCategoryId(v === "" ? null : Number(v));
              }}
              disabled={saving || categorySelectOptions.length === 0}
            >
              {categorySelectOptions.length === 0 ? (
                <option value="">Sin categorías</option>
              ) : (
                categorySelectOptions.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>
                    {c.categoryName}
                  </option>
                ))
              )}
            </select>
          </label>
          {error && <p className="home-error">{error}</p>}
          <div className="create-recipe-dialog__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving || !name.trim()}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </ModalPanel>
    </ModalBackdrop>
  );
}

export function EditOwnedIngredientModal({ open, ingredient, ...rest }: Props) {
  if (!open || !ingredient) return null;
  return (
    <EditOwnedIngredientForm
      key={ingredient.ingredientId}
      ingredient={ingredient}
      {...rest}
    />
  );
}
