import { useEffect } from "react";

type Options = {
  enabled?: boolean;
  onDismiss: () => void;
  closeOnEscape?: boolean;
};

/** Escape closes the active modal or overlay (when enabled). */
export function useModalDismiss({
  enabled = true,
  onDismiss,
  closeOnEscape = true,
}: Options) {
  useEffect(() => {
    if (!enabled || !closeOnEscape) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onDismiss();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, closeOnEscape, onDismiss]);
}
