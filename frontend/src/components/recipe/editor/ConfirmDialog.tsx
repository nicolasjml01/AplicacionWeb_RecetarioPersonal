import type { FormEvent } from "react";
import { ModalBackdrop, ModalPanel } from "../../ui/ModalBackdrop";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmVariant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = "primary",
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm();
  };

  return (
    <ModalBackdrop onDismiss={onCancel}>
      <ModalPanel className="create-recipe-dialog" aria-labelledby="confirm-dialog-title">
        <form onSubmit={handleSubmit}>
          <h2 id="confirm-dialog-title" className="create-recipe-dialog__title">
            {title}
          </h2>
          <p className="create-recipe-dialog__msg">{message}</p>
          <div className="create-recipe-dialog__actions">
            <button type="button" className="btn btn--secondary" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              type="submit"
              className={`btn ${confirmVariant === "danger" ? "create-recipe-dialog__btn-danger" : "btn--primary"}`}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </ModalPanel>
    </ModalBackdrop>
  );
}
