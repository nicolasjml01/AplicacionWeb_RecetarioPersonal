import { useEffect, useState, type RefObject } from "react";

export type DropdownPlacement = "above" | "below";

type Options = {
  /** Preferred max height in px before clamping to viewport. */
  preferredMaxHeight?: number;
  /** Minimum space required to pick a side. */
  minUsable?: number;
  gap?: number;
};

/**
 * Chooses above/below for a dropdown anchored to a ref, clamping max-height to visible viewport.
 */
export function useDropdownPlacement(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  options: Options = {},
): { placement: DropdownPlacement; maxHeight: number } {
  const preferredMaxHeight = options.preferredMaxHeight ?? 280;
  const minUsable = options.minUsable ?? 120;
  const gap = options.gap ?? 8;

  const [state, setState] = useState({
    placement: "below" as DropdownPlacement,
    maxHeight: preferredMaxHeight,
  });

  useEffect(() => {
    if (!open) return;

    const update = () => {
      const el = anchorRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const spaceAbove = Math.max(0, rect.top - gap);
      const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap);

      let placement: DropdownPlacement = "below";
      if (spaceBelow >= minUsable && spaceBelow >= spaceAbove) {
        placement = "below";
      } else if (spaceAbove >= minUsable) {
        placement = "above";
      } else {
        placement = spaceBelow >= spaceAbove ? "below" : "above";
      }

      const available = placement === "below" ? spaceBelow : spaceAbove;
      const maxHeight = Math.max(
        minUsable,
        Math.min(preferredMaxHeight, available > 0 ? available : preferredMaxHeight),
      );

      setState({ placement, maxHeight });
    };

    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, preferredMaxHeight, minUsable, gap]);

  return state;
}
