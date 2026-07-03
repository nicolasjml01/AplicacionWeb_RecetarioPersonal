import { useCallback, useEffect, useMemo, useState } from "react";
import { getRecipeIngredients } from "../../api/recipes";
import type { DayPlanDto, MealBlockDto } from "../../types/calendar";
import type { RecipeIngredientDto } from "../../types/recipes";
import type { RecipeReturnNav } from "../../utils/recipeReturnNav";
import { CalendarDayEntryRow } from "./CalendarDayEntryRow";
import { ReorderButtons } from "./ReorderButtons";
import { collectRecipeIngredientImageUrls, preloadIngredientImages } from "../../utils/preloadImages";

type Props = {
  userId: number;
  dayPlan: DayPlanDto | null;
  loading: boolean;
  busy: boolean;
  recipeReturnNav: RecipeReturnNav;
  onReorderMealBlocks: (fromIndex: number, toIndex: number) => void;
  onReorderEntries: (blockIndex: number, fromIndex: number, toIndex: number) => void;
  onRemoveEntry: (calendarEntryId: number) => void;
  onImportRecipe: (recipeId: number, recipeTitle: string) => void;
  onImportBlock: (calendarEntryIds: number[]) => void;
};

type DragEntry = { blockIndex: number; entryIndex: number };

export function CalendarDayView({
  userId,
  dayPlan,
  loading,
  busy,
  recipeReturnNav,
  onReorderMealBlocks,
  onReorderEntries,
  onRemoveEntry,
  onImportRecipe,
  onImportBlock,
}: Props) {
  const [dragBlockIndex, setDragBlockIndex] = useState<number | null>(null);
  const [dragEntry, setDragEntry] = useState<DragEntry | null>(null);
  const [ingredientsByRecipeId, setIngredientsByRecipeId] = useState<
    Record<number, RecipeIngredientDto[]>
  >({});
  const [loadedRecipeIdsKey, setLoadedRecipeIdsKey] = useState<string | null>(null);

  const recipeIds = useMemo(() => {
    const ids = new Set<number>();
    for (const block of dayPlan?.mealBlocks ?? []) {
      for (const entry of block.entries) {
        ids.add(entry.recipeId);
      }
    }
    return [...ids];
  }, [dayPlan]);

  const canLoadIngredients = !loading && recipeIds.length > 0;
  const recipeIdsKey = recipeIds.join(",");

  useEffect(() => {
    if (!canLoadIngredients) return;

    let cancelled = false;
    void Promise.all(
      recipeIds.map(async (recipeId) => {
        const list = await getRecipeIngredients(userId, recipeId);
        return [recipeId, list] as const;
      }),
    )
      .then((pairs) => {
        if (cancelled) return;
        const map: Record<number, RecipeIngredientDto[]> = {};
        for (const [id, list] of pairs) {
          map[id] = list;
        }
        setIngredientsByRecipeId(map);
        setLoadedRecipeIdsKey(recipeIdsKey);
        preloadIngredientImages(
          collectRecipeIngredientImageUrls(pairs.flatMap(([, list]) => list)),
          "low",
        );
      })
      .catch(() => {
        if (!cancelled) {
          setIngredientsByRecipeId({});
          setLoadedRecipeIdsKey(recipeIdsKey);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId, recipeIds, recipeIdsKey, canLoadIngredients]);

  const ingredientsMap = canLoadIngredients ? ingredientsByRecipeId : {};
  const ingredientsLoading = canLoadIngredients && loadedRecipeIdsKey !== recipeIdsKey;

  const allowDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  if (loading && !dayPlan) {
    return <p className="cal-hint">Cargando día…</p>;
  }

  const blocks = dayPlan?.mealBlocks ?? [];
  if (blocks.length === 0) {
    return (
      <div className="cal-empty">
        <p>No hay comidas planificadas este día.</p>
        <p className="cal-hint">
          Pulsa <strong>+ Receta</strong> para empezar.
        </p>
      </div>
    );
  }

  return (
    <div className="cal-day-blocks">
      {blocks.map((block, blockIndex) => (
        <MealBlockSection
          key={block.mealType.mealTypeId}
          block={block}
          blockIndex={blockIndex}
          blocksCount={blocks.length}
          busy={busy}
          ingredientsLoading={ingredientsLoading}
          ingredientsByRecipeId={ingredientsMap}
          dragBlockIndex={dragBlockIndex}
          dragEntry={dragEntry}
          onDragBlockStart={() => setDragBlockIndex(blockIndex)}
          onDragBlockEnd={() => setDragBlockIndex(null)}
          onDragEntryStart={(entryIndex) => setDragEntry({ blockIndex, entryIndex })}
          onDragEntryEnd={() => setDragEntry(null)}
          onBlockDrop={() => {
            if (dragBlockIndex != null) {
              onReorderMealBlocks(dragBlockIndex, blockIndex);
              setDragBlockIndex(null);
            }
          }}
          onEntryDrop={(entryIndex) => {
            if (dragEntry && dragEntry.blockIndex === blockIndex) {
              onReorderEntries(blockIndex, dragEntry.entryIndex, entryIndex);
              setDragEntry(null);
            }
          }}
          onAllowDrop={allowDrop}
          recipeReturnNav={recipeReturnNav}
          onRemoveEntry={onRemoveEntry}
          onImportRecipe={onImportRecipe}
          onImportBlock={onImportBlock}
          onReorderMealBlocks={onReorderMealBlocks}
          onReorderEntries={onReorderEntries}
        />
      ))}
    </div>
  );
}

function MealBlockSection({
  block,
  blockIndex,
  blocksCount,
  busy,
  ingredientsLoading,
  ingredientsByRecipeId,
  dragBlockIndex,
  dragEntry,
  onDragBlockStart,
  onDragBlockEnd,
  onDragEntryStart,
  onDragEntryEnd,
  onBlockDrop,
  onEntryDrop,
  onAllowDrop,
  recipeReturnNav,
  onRemoveEntry,
  onImportRecipe,
  onImportBlock,
  onReorderMealBlocks,
  onReorderEntries,
}: {
  block: MealBlockDto;
  blockIndex: number;
  blocksCount: number;
  busy: boolean;
  ingredientsLoading: boolean;
  ingredientsByRecipeId: Record<number, RecipeIngredientDto[]>;
  dragBlockIndex: number | null;
  dragEntry: DragEntry | null;
  onDragBlockStart: () => void;
  onDragBlockEnd: () => void;
  onDragEntryStart: (entryIndex: number) => void;
  onDragEntryEnd: () => void;
  onBlockDrop: () => void;
  onEntryDrop: (entryIndex: number) => void;
  onAllowDrop: (e: React.DragEvent) => void;
  recipeReturnNav: RecipeReturnNav;
  onRemoveEntry: (calendarEntryId: number) => void;
  onImportRecipe: (recipeId: number, recipeTitle: string) => void;
  onImportBlock: (calendarEntryIds: number[]) => void;
  onReorderMealBlocks: (fromIndex: number, toIndex: number) => void;
  onReorderEntries: (blockIndex: number, fromIndex: number, toIndex: number) => void;
}) {
  const entries = block.entries;
  const isBlockDragging = dragBlockIndex === blockIndex;
  const isBlockDropTarget =
    dragBlockIndex != null && dragBlockIndex !== blockIndex;
  const blockEntryIds = entries.map((e) => e.calendarEntryId);

  return (
    <section
      className={[
        "cal-meal-block",
        isBlockDragging ? "cal-meal-block--dragging" : "",
        isBlockDropTarget ? "cal-meal-block--drop-target" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onDragOver={onAllowDrop}
      onDrop={onBlockDrop}
    >
      <header className="cal-meal-block__header">
        <div className="cal-meal-block__title-row">
          <ReorderButtons
            label={block.mealType.name}
            onUp={() => onReorderMealBlocks(blockIndex, blockIndex - 1)}
            onDown={() => onReorderMealBlocks(blockIndex, blockIndex + 1)}
            canMoveUp={blockIndex > 0}
            canMoveDown={blockIndex < blocksCount - 1}
            disabled={busy}
          />
          <button
            type="button"
            className="cal-drag-handle cal-drag-handle--desktop-only"
            draggable={!busy}
            disabled={busy}
            aria-label={`Arrastrar ${block.mealType.name}`}
            title="Arrastrar para reordenar tipo de comida"
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              onDragBlockStart();
            }}
            onDragEnd={onDragBlockEnd}
          >
            ≡
          </button>
          <h3 className="cal-meal-block__title">{block.mealType.name}</h3>
        </div>
        {entries.length > 0 && (
          <button
            type="button"
            className="btn btn--secondary cal-meal-block__import-all"
            disabled={busy}
            onClick={() => onImportBlock(blockEntryIds)}
          >
            {`Añadir ${block.mealType.name} a la cesta`}
          </button>
        )}
      </header>
      <div className="cal-meal-block__entries">
        {entries.map((entry, entryIndex) => {
          const isEntryDragging =
            dragEntry?.blockIndex === blockIndex && dragEntry.entryIndex === entryIndex;
          const isEntryDropTarget =
            dragEntry != null &&
            dragEntry.blockIndex === blockIndex &&
            dragEntry.entryIndex !== entryIndex;

          return (
            <CalendarDayEntryRow
              key={entry.calendarEntryId}
              entry={entry}
              recipeReturnNav={recipeReturnNav}
              ingredients={ingredientsByRecipeId[entry.recipeId]}
              ingredientsLoading={ingredientsLoading}
              busy={busy}
              isDragging={isEntryDragging}
              isDropTarget={isEntryDropTarget}
              canMoveUp={entryIndex > 0}
              canMoveDown={entryIndex < entries.length - 1}
              onMoveUp={() => onReorderEntries(blockIndex, entryIndex, entryIndex - 1)}
              onMoveDown={() => onReorderEntries(blockIndex, entryIndex, entryIndex + 1)}
              onDragStart={() => onDragEntryStart(entryIndex)}
              onDragEnd={onDragEntryEnd}
              onDragOver={onAllowDrop}
              onDrop={() => onEntryDrop(entryIndex)}
              onRemove={() => onRemoveEntry(entry.calendarEntryId)}
              onImportToBasket={() => onImportRecipe(entry.recipeId, entry.recipeTitle)}
            />
          );
        })}
      </div>
    </section>
  );
}
