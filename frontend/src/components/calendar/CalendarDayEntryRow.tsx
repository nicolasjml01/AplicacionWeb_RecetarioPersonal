import { useState } from "react";
import { Link } from "react-router-dom";
import { RECIPE_DEFAULT_COVER_PATH } from "../../constants/recipeAssets";
import type { CalendarEntryDto } from "../../types/calendar";
import type { RecipeIngredientDto } from "../../types/recipes";
import { appendRecipeReturnNav, type RecipeReturnNav } from "../../utils/recipeReturnNav";
import { IngredientThumb } from "../ingredient/IngredientThumb";
import { resolveMediaUrl } from "../../utils/mediaUrl";
import { formatIngredientQuantity, formatIngredientUnit } from "./formatIngredientLine";
import { CalendarEntryViewToggle, type CalendarEntryMobilePanel } from "./CalendarEntryViewToggle";
import { ReorderButtons } from "./ReorderButtons";

type Props = {
  entry: CalendarEntryDto;
  recipeReturnNav: RecipeReturnNav;
  ingredients: RecipeIngredientDto[] | undefined;
  ingredientsLoading?: boolean;
  busy?: boolean;
  isDragging?: boolean;
  isDropTarget?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onRemove: () => void;
  onImportToBasket: () => void;
};

export function CalendarDayEntryRow({
  entry,
  recipeReturnNav,
  ingredients,
  ingredientsLoading,
  busy,
  isDragging,
  isDropTarget,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onRemove,
  onImportToBasket,
}: Props) {
  const [mobilePanel, setMobilePanel] = useState<CalendarEntryMobilePanel>("recipe");
  const imgSrc = entry.coverImageUrl
    ? resolveMediaUrl(entry.coverImageUrl)
    : RECIPE_DEFAULT_COVER_PATH;
  const recipePath = appendRecipeReturnNav(`/home/recipes/${entry.recipeId}`, recipeReturnNav);
  const sorted =
    ingredients != null ? [...ingredients].sort((a, b) => a.displayOrder - b.displayOrder) : [];

  return (
    <div
      className={[
        "cal-day-entry-row",
        `cal-day-entry-row--panel-${mobilePanel}`,
        isDragging ? "cal-day-entry-row--dragging" : "",
        isDropTarget ? "cal-day-entry-row--drop-target" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="cal-day-entry-row__mobile-toolbar">
        {onMoveUp && onMoveDown && (
          <ReorderButtons
            label={entry.recipeTitle}
            onUp={onMoveUp}
            onDown={onMoveDown}
            canMoveUp={canMoveUp}
            canMoveDown={canMoveDown}
            disabled={busy}
          />
        )}
        <CalendarEntryViewToggle value={mobilePanel} onChange={setMobilePanel} />
      </div>

      <div className="cal-day-entry-row__recipe">
        <button
          type="button"
          className="cal-drag-handle cal-day-entry-row__handle cal-drag-handle--desktop-only"
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

        <article className="cal-day-recipe-card">
          <Link to={recipePath} className="cal-day-recipe-card__title">
            {entry.recipeTitle}
          </Link>
          <div className="cal-day-recipe-card__media-wrap">
            <Link
              to={recipePath}
              className="cal-day-recipe-card__media"
              aria-label={`Ver receta ${entry.recipeTitle}`}
            >
              <img src={imgSrc} alt="" className="cal-day-recipe-card__img" loading="lazy" />
            </Link>
            <button
              type="button"
              className="cal-day-recipe-card__remove"
              title="Quitar del día"
              disabled={busy}
              aria-label={`Quitar ${entry.recipeTitle} del día`}
              onClick={onRemove}
            >
              ✕
            </button>
          </div>
        </article>
      </div>

      <div className="cal-day-entry-row__ingredients-panel">
        <h4 className="cal-day-entry-row__ingredients-heading">Ingredientes</h4>
        {ingredientsLoading && <p className="cal-hint">Cargando ingredientes…</p>}
        {!ingredientsLoading && sorted.length === 0 && (
          <p className="cal-hint">Sin ingredientes en la receta.</p>
        )}
        {!ingredientsLoading && sorted.length > 0 && (
          <div className="cal-day-entry-row__ingredients-grid" role="list" aria-label="Ingredientes">
            {sorted.map((row) => (
              <article
                key={row.recipeIngredientId}
                className="recipe-detail__ingredient-card cal-day-ingredient-card"
                role="listitem"
              >
                <IngredientThumb
                  name={row.ingredient.name}
                  imageUrl={row.ingredient.imageUrl}
                  size="compact"
                  alt={row.ingredient.name}
                />
                <p className="recipe-detail__ingredient-name">{row.ingredient.name}</p>
                <div className="recipe-detail__ingredient-pills">
                  <span>{formatIngredientQuantity(row.quantity)}</span>
                  <span>{formatIngredientUnit(row)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="cal-day-entry-row__import">
        <button
          type="button"
          className="btn btn--secondary cal-day-entry-row__import-btn"
          disabled={busy}
          onClick={onImportToBasket}
        >
          Añadir a la cesta
        </button>
      </div>
    </div>
  );
}
