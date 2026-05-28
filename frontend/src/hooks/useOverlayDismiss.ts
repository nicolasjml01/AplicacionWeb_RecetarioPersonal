import { useEffect, type RefObject } from "react";
import { useModalDismiss } from "./useModalDismiss";

type Options = {
  enabled: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onDismiss: () => void;
  closeOnEscape?: boolean;
};

/** Escape or click/tap outside `containerRef` dismisses dropdowns, FAB menus, etc. */
export function useOverlayDismiss({
  enabled,
  containerRef,
  onDismiss,
  closeOnEscape = true,
}: Options) {
  useModalDismiss({ enabled, onDismiss, closeOnEscape });

  useEffect(() => {
    if (!enabled) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        onDismiss();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [enabled, containerRef, onDismiss]);
}
