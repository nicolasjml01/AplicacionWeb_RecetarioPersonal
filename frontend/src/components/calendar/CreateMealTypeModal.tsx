import { useState, type FormEvent } from "react";
import { createMealType } from "../../api/mealTypes";
import { ModalBackdrop, ModalPanel } from "../ui/ModalBackdrop";

type Props = {
  open: boolean;
  userId: number;
  onClose: () => void;
  onCreated: (message: string) => void;
};

export function CreateMealTypeModal({ open, userId, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Escribe un nombre para la categoría.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createMealType(userId, { name: trimmed });
      setName("");
      onCreated(`Categoría "${trimmed}" creada.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la categoría.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalBackdrop onDismiss={onClose} disabled={submitting}>
      <ModalPanel className="create-recipe-dialog cal-modal" aria-labelledby="create-meal-type-title">
        <form onSubmit={(e) => void handleSubmit(e)}>
          <h2 id="create-meal-type-title" className="create-recipe-dialog__title">
            Nueva categoría de comida
          </h2>
          <p className="create-recipe-dialog__msg">
            Por ejemplo: Merienda, Tentempié, Brunch… Los tipos Desayuno, Comida y Cena son del sistema.
          </p>
          <label className="form-group">
            <span>Nombre</span>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Merienda"
              autoFocus
              disabled={submitting}
            />
          </label>
          {error && <p className="home-error">{error}</p>}
          <div className="create-recipe-dialog__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? "Guardando…" : "Crear"}
            </button>
          </div>
        </form>
      </ModalPanel>
    </ModalBackdrop>
  );
}
