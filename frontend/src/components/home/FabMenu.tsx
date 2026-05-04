import { useRef } from "react";

type Props = {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  onAddCategory: () => void;
  onAddRecipe: () => void;
  onOpenDrafts: () => void;
};

export function FabMenu({
  open,
  onOpen,
  onClose,
  onToggle,
  onAddCategory,
  onAddRecipe,
  onOpenDrafts,
}: Props) {
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    onOpen();
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => {
      onClose();
      closeTimerRef.current = null;
    }, 220);
  };

  return (
    <div className="home-fab-wrap" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {open && (
        <div id="home-fab-menu" className="home-fab-menu" role="menu" aria-label="Acciones de creación">
          <button type="button" onClick={onAddCategory} role="menuitem">
            Añadir categoría
          </button>
          <button type="button" onClick={onAddRecipe} role="menuitem">
            Añadir receta
          </button>
          <button type="button" onClick={onOpenDrafts} role="menuitem">
            Borradores
          </button>
        </div>
      )}
      <button
        type="button"
        className="home-fab"
        onClick={onToggle}
        aria-label="Añadir"
        aria-expanded={open}
        aria-controls="home-fab-menu"
      >
        +
      </button>
    </div>
  );
}