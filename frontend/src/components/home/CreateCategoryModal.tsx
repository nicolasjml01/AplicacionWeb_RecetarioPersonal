import { useState, type FormEvent } from "react";
import { ModalBackdrop, ModalPanel } from "../ui/ModalBackdrop";

type Props = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
  title?: string;
  submitLabel?: string;
  initialName?: string;
};

type FormProps = Omit<Props, "open">;

function CreateCategoryForm({
  loading,
  onClose,
  onSubmit,
  title = "Nueva etiqueta",
  submitLabel = "Guardar",
  initialName = "",
}: FormProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");

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
      setError(err instanceof Error ? err.message : "Error al crear etiqueta.");
    }
  };

  return (
    <ModalBackdrop onDismiss={onClose} disabled={loading}>
      <ModalPanel className="home-modal home-modal--category">
        <h3 className="home-modal__title">{title}</h3>
        <form className="home-modal__form" onSubmit={handleSubmit}>
          <input
            className="form-input home-modal__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Vegetariano"
            maxLength={120}
            autoFocus
            disabled={loading}
          />
          {error && <p className="home-error">{error}</p>}
          <div className="home-modal__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? "Guardando..." : submitLabel}
            </button>
          </div>
        </form>
      </ModalPanel>
    </ModalBackdrop>
  );
}

export function CreateCategoryModal({ open, initialName = "", ...rest }: Props) {
  if (!open) return null;
  return <CreateCategoryForm key={initialName} initialName={initialName} {...rest} />;
}
