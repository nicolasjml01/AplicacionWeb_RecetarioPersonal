import { type ReactNode, useEffect, useId } from "react";
import { useModalDismiss } from "../../hooks/useModalDismiss";
import { isTopModal, registerModal, unregisterModal } from "../../hooks/modalStack";

type ModalBackdropProps = {
  onDismiss: () => void;
  children: ReactNode;
  className?: string;
  role?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  disabled?: boolean;
};

export function ModalBackdrop({
  onDismiss,
  children,
  className = "modal-backdrop",
  role = "presentation",
  closeOnBackdrop = true,
  closeOnEscape = true,
  disabled = false,
}: ModalBackdropProps) {
  const active = !disabled;
  const modalId = useId();

  useEffect(() => {
    if (!active) return;
    registerModal(modalId);
    return () => unregisterModal(modalId);
  }, [active, modalId]);

  const dismissIfTop = () => {
    if (isTopModal(modalId)) {
      (document.activeElement as HTMLElement | null)?.blur?.();
      onDismiss();
    }
  };

  useModalDismiss({
    enabled: active,
    onDismiss: dismissIfTop,
    closeOnEscape,
  });

  return (
    <div
      className={className}
      role={role}
      onMouseDown={(e) => {
        if (active && closeOnBackdrop && e.target === e.currentTarget) {
          dismissIfTop();
        }
      }}
    >
      {children}
    </div>
  );
}

type ModalPanelProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
};

/** Inner dialog panel: stops backdrop clicks from bubbling. */
export function ModalPanel({
  children,
  className,
  id,
  "aria-labelledby": ariaLabelledby,
  "aria-label": ariaLabel,
}: ModalPanelProps) {
  return (
    <div
      className={className}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledby}
      aria-label={ariaLabel}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
