import { Link } from "react-router-dom";
import { RECIPE_DEFAULT_COVER_PATH } from "../../constants/recipeAssets";
import type { CalendarEntryDto } from "../../types/calendar";
import { appendRecipeReturnNav, type RecipeReturnNav } from "../../utils/recipeReturnNav";
import { resolveMediaUrl } from "../../utils/mediaUrl";

type Props = {
  entry: CalendarEntryDto;
  recipeReturnNav: RecipeReturnNav;
  busy?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onRemove: () => void;
  onImportOne: () => void;
};

export function CalendarEntryCard({
  entry,
  recipeReturnNav,
  busy,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onRemove,
  onImportOne,
}: Props) {
  const imgSrc = entry.coverImageUrl
    ? resolveMediaUrl(entry.coverImageUrl)
    : RECIPE_DEFAULT_COVER_PATH;
  const recipePath = appendRecipeReturnNav(
    `/home/recipes/${entry.recipeId}`,
    recipeReturnNav,
  );

  return (
    <article
      className={[
        "cal-entry-card",
        isDragging ? "cal-entry-card--dragging" : "",
        isDropTarget ? "cal-entry-card--drop-target" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        type="button"
        className="cal-drag-handle cal-entry-card__handle"
        draggable={!busy}
        disabled={busy}
        aria-label={`Arrastrar ${entry.recipeTitle}`}
        title="Arrastrar para reordenar"
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          onDragStart();
        }}
        onDragEnd={onDragEnd}
      >
        ≡
      </button>
      <Link
        to={recipePath}
        className="cal-entry-card__media"
        aria-label={`Ver receta ${entry.recipeTitle}`}
      >
        <img src={imgSrc} alt="" className="cal-entry-card__img" loading="lazy" />
      </Link>
      <div className="cal-entry-card__body">
        <Link to={recipePath} className="cal-entry-card__title">
          {entry.recipeTitle}
        </Link>
        <div className="cal-entry-card__actions">
          <button
            type="button"
            className="cal-icon-btn cal-icon-btn--cart"
            title="A la cesta"
            disabled={busy}
            onClick={onImportOne}
          >
            🛒
          </button>
          <button
            type="button"
            className="cal-icon-btn cal-icon-btn--danger"
            title="Quitar del día"
            disabled={busy}
            onClick={onRemove}
          >
            ✕
          </button>
        </div>
      </div>
    </article>
  );
}
