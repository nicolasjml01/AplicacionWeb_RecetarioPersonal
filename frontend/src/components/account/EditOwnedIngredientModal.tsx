import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { IngredientDto } from "../../types/shopping";
import type { IngredientCategoryOption } from "../../utils/ingredientCatalogUi";
import { defaultIngredientCategoryId } from "../../utils/ingredientCatalogUi";
import { IngredientThumb } from "../ingredient/IngredientThumb";
import { ModalBackdrop, ModalPanel } from "../ui/ModalBackdrop";

type Props = {
  open: boolean;
  ingredient: IngredientDto | null;
  categoryOptions: IngredientCategoryOption[];
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (name: string, categoryId: number | null) => void;
};

export function EditOwnedIngredientModal({
  open,
  ingredient,
  categoryOptions,
  saving = false,
  error = "",
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  useEffect(() => {
    if (!open || !ingredient) return;
    setName(ingredient.name);
    setCategoryId(
      ingredient.categoryId ??
        defaultIngredientCategoryId(categoryOptions),
    );
  }, [open, ingredient, categoryOptions]);

  const categorySelectOptions = useMemo(() => categoryOptions, [categoryOptions]);

  if (!open || !ingredient) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed, categoryId);
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
          <div className="account-edit-ingredient-preview">
            <IngredientThumb imageUrl={ingredient.imageUrl} size="card" alt={ingredient.name} />
          </div>
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
