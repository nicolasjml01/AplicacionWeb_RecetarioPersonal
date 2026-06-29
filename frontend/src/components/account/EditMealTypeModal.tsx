import { useState, type FormEvent } from "react";
import type { MealTypeDto } from "../../types/calendar";
import { ModalBackdrop, ModalPanel } from "../ui/ModalBackdrop";

type Props = {
  open: boolean;
  mealType: MealTypeDto | null;
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (name: string) => void;
};

type FormProps = Omit<Props, "open" | "mealType"> & { mealType: MealTypeDto };

function EditMealTypeForm({
  mealType,
  saving = false,
  error = "",
  onClose,
  onSave,
}: FormProps) {
  const [name, setName] = useState(mealType.name);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
  };

  return (
    <ModalBackdrop onDismiss={onClose} disabled={saving}>
      <ModalPanel className="create-recipe-dialog cal-modal" aria-labelledby="edit-meal-type-title">
        <form onSubmit={handleSubmit}>
          <h2 id="edit-meal-type-title" className="create-recipe-dialog__title">
            Editar tipo de comida
          </h2>
          <label className="form-group">
            <span>Nombre</span>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Merienda"
              autoFocus
              disabled={saving}
            />
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

export function EditMealTypeModal({ open, mealType, ...rest }: Props) {
  if (!open || !mealType) return null;
  return <EditMealTypeForm key={mealType.mealTypeId} mealType={mealType} {...rest} />;
}
