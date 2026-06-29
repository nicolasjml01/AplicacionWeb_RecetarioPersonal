import { useEffect, useRef } from "react";

type Props = {
  id: number;
  title: string;
  subtitle?: string | null;
  /** Photo or custom leading block; use with {@code variant="tile"}. */
  leading?: React.ReactNode;
  /** Letter avatar when there is no image (meal types). */
  avatarLetter?: string;
  variant?: "tile" | "row";
  openMenuId: number | null;
  onToggleMenu: (id: number) => void;
  onCloseMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
};

export function ManageableItemCard({
  id,
  title,
  subtitle,
  leading,
  avatarLetter,
  variant = "tile",
  openMenuId,
  onToggleMenu,
  onCloseMenu,
  onEdit,
  onDelete,
  disabled = false,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const menuOpen = openMenuId === id;

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        onCloseMenu();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen, onCloseMenu]);

  const showAvatar = variant === "tile" && !leading && avatarLetter;

  return (
    <article
      className={`account-manage-card account-manage-card--${variant}`}
      ref={wrapRef}
    >
      {variant === "tile" && (leading || showAvatar) ? (
        <div className="account-manage-card__media">
          {leading ??
            (showAvatar ? (
              <div className="account-manage-card__avatar" aria-hidden>
                {avatarLetter}
              </div>
            ) : null)}
        </div>
      ) : null}
      {variant === "row" && leading}
      <div className="account-manage-card__body">
        <h3 className="account-manage-card__title">{title}</h3>
        {subtitle ? <p className="account-manage-card__subtitle">{subtitle}</p> : null}
      </div>
      <div className="account-manage-card__menu-wrap category-recipe-card__menu-wrap">
        <button
          type="button"
          className="recipe-detail__menu-trigger"
          onClick={() => (menuOpen ? onCloseMenu() : onToggleMenu(id))}
          aria-label={`Acciones de ${title}`}
          aria-expanded={menuOpen}
          disabled={disabled}
        >
          ⋯
        </button>
        {menuOpen && (
          <div className="recipe-detail__menu" role="menu" aria-label="Acciones">
            <button
              type="button"
              role="menuitem"
              className="recipe-detail__menu-item"
              onClick={onEdit}
              disabled={disabled}
            >
              Editar
            </button>
            <button
              type="button"
              role="menuitem"
              className="recipe-detail__menu-item recipe-detail__menu-item--danger"
              onClick={onDelete}
              disabled={disabled}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
