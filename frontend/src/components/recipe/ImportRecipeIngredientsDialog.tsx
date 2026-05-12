import { useCallback, useEffect, useState } from "react";
import { getRecipeIngredients, importRecipeIngredientsToShoppingList } from "../../api/recipes";
import type { RecipeIngredientDto } from "../../types/recipes";

type Props = {
  open: boolean;
  userId: number | null;
  recipeId: number | null;
  recipeTitle?: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
};

function orderedVisibleIds(all: RecipeIngredientDto[], idSet: Set<number>): number[] {
  return all.filter((r) => idSet.has(r.recipeIngredientId)).map((r) => r.recipeIngredientId);
}

export function ImportRecipeIngredientsDialog({
  open,
  userId,
  recipeId,
  recipeTitle,
  onClose,
  onSuccess,
}: Props) {
  const [rows, setRows] = useState<RecipeIngredientDto[]>([]);
  /** Ingredientes que siguen en pantalla (se importarán). */
  const [visibleIds, setVisibleIds] = useState<number[]>([]);
  /** Orden LIFO de ids quitados, para Deshacer / Ctrl+Z. */
  const [removedStack, setRemovedStack] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !userId || recipeId == null || !Number.isFinite(recipeId)) {
      setRows([]);
      setVisibleIds([]);
      setRemovedStack([]);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    void getRecipeIngredients(userId, recipeId)
      .then((list) => {
        if (cancelled) return;
        const sorted = [...list].sort((a, b) => a.displayOrder - b.displayOrder);
        setRows(sorted);
        setVisibleIds(sorted.map((r) => r.recipeIngredientId));
        setRemovedStack([]);
      })
      .catch((e) => {
        if (!cancelled) {
          setRows([]);
          setVisibleIds([]);
          setRemovedStack([]);
          setError(e instanceof Error ? e.message : "No se pudieron cargar los ingredientes.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, userId, recipeId]);

  const removeFromView = useCallback((id: number) => {
    setVisibleIds((prev) => prev.filter((x) => x !== id));
    setRemovedStack((prev) => [...prev, id]);
    setError("");
  }, []);

  const undoLastRemoveStable = useCallback(() => {
    setRemovedStack((stack) => {
      if (stack.length === 0) return stack;
      const id = stack[stack.length - 1]!;
      setVisibleIds((prev) => {
        const nextSet = new Set([...prev, id]);
        return orderedVisibleIds(rows, nextSet);
      });
      return stack.slice(0, -1);
    });
  }, [rows]);

  const resetAllVisible = useCallback(() => {
    setVisibleIds(rows.map((r) => r.recipeIngredientId));
    setRemovedStack([]);
    setError("");
  }, [rows]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoLastRemoveStable();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, undoLastRemoveStable]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!userId || recipeId == null) return;
    if (visibleIds.length === 0) {
      setError("Deja al menos un ingrediente en pantalla, o pulsa Cancelar.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await importRecipeIngredientsToShoppingList(userId, recipeId, {
        recipeIngredientIds: visibleIds,
      });
      const n = visibleIds.length;
      onSuccess(n === 1 ? "1 ingrediente añadido a la cesta." : `${n} ingredientes añadidos a la cesta.`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron añadir los ingredientes.");
    } finally {
      setSubmitting(false);
    }
  };

  const titleRecipe = recipeTitle?.trim() ? ` — ${recipeTitle.trim()}` : "";
  const visibleSet = new Set(visibleIds);
  const visibleRows = rows.filter((r) => visibleSet.has(r.recipeIngredientId));
  const canUndo = removedStack.length > 0;
  const canReset = rows.length > 0 && visibleIds.length !== rows.length;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="create-recipe-dialog import-ingredients-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-ingredients-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="import-ingredients-title" className="create-recipe-dialog__title">
          Añadir a la lista de la compra{titleRecipe}
        </h2>
        <p className="create-recipe-dialog__msg import-ingredients-dialog__hint">
          Toca una tarjeta para quitar lo que no necesites comprar. Lo que siga visible se añadirá a la cesta.{" "}
          <strong>Deshacer</strong> recupera el último que quitaste.
        </p>

        {loading && <p className="create-recipe-hint">Cargando ingredientes…</p>}
        {error && <p className="home-error import-ingredients-dialog__error">{error}</p>}

        {!loading && rows.length === 0 && !error && (
          <p className="create-recipe-hint">Esta receta no tiene ingredientes para importar.</p>
        )}

        {!loading && rows.length > 0 && (
          <>
            <div className="import-ingredients-dialog__toolbar">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => undoLastRemoveStable()}
                disabled={!canUndo || submitting}
                title="Recuperar el último ingrediente quitado"
              >
                Deshacer
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={resetAllVisible}
                disabled={!canReset || submitting}
              >
                Mostrar todos
              </button>
            </div>

            {visibleRows.length === 0 ? (
              <p className="create-recipe-hint import-ingredients-dialog__empty-grid">
                No queda nada para comprar en pantalla. Pulsa <strong>Deshacer</strong> o <strong>Mostrar todos</strong>.
              </p>
            ) : (
              <div
                className="recipe-detail__ingredients-grid import-ingredients-dialog__grid"
                aria-label="Ingredientes a añadir (toca una tarjeta para quitar)"
              >
                {visibleRows.map((row) => {
                  const unitLabel = row.unitOfMeasure?.symbol ?? row.unitOfMeasure?.name ?? "—";
                  return (
                    <button
                      key={row.recipeIngredientId}
                      type="button"
                      className="recipe-detail__ingredient-card import-ingredients-dialog__card"
                      onClick={() => removeFromView(row.recipeIngredientId)}
                      aria-label={`Quitar ${row.ingredient.name} de la compra (ya lo tengo)`}
                    >
                      <div className="recipe-detail__ingredient-image-wrap">
                        <img src="/logoShoppingList.png" alt="" className="recipe-detail__ingredient-image" />
                      </div>
                      <p className="recipe-detail__ingredient-name">{row.ingredient.name}</p>
                      <div className="recipe-detail__ingredient-pills">
                        <span>{row.quantity}</span>
                        <span>{unitLabel}</span>
                      </div>
                      <span className="import-ingredients-dialog__card-hint">Toca para quitar</span>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        <div className="create-recipe-dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleSubmit()}
            disabled={submitting || loading || rows.length === 0 || visibleIds.length === 0}
          >
            {submitting ? "Añadiendo…" : `Añadir a la cesta (${visibleIds.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}
