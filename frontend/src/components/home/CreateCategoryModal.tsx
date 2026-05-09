import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Props = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  title?: string;
  submitLabel?: string;
  initialName?: string;
};

export function CreateCategoryModal({
  open,
  loading,
  onClose,
  onSubmit,
  title = "Nueva categoría",
  submitLabel = "Guardar",
  initialName = "",
}: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setError("");
  }, [open, initialName]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = name.trim();
    if (!v) return setError("El nombre es obligatorio.");
    setError("");
    try {
      await onSubmit(v);
      setName("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear categoría.");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="home-modal home-modal--category">
        <h3 className="home-modal__title">{title}</h3>
        <form className="home-modal__form" onSubmit={handleSubmit}>
          <input
            className="form-input home-modal__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Vegetariano"
            maxLength={120}
            autoFocus
          />
          {error && <p className="home-error">{error}</p>}
          <div className="home-modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "Guardando..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}