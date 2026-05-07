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
      <div className="home-modal">
        <h3>{title}</h3>
        <form onSubmit={handleSubmit}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Vegetariano"
            maxLength={120}
          />
          {error && <p className="home-error">{error}</p>}
          <div className="home-modal__actions">
            <button type="button" onClick={onClose}>Cancelar</button>
            <button type="submit" disabled={loading}>{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}