import { useCallback, useEffect, useState } from "react";
import { getRecipeIngredients, importRecipeIngredientsToShoppingList } from "../../api/recipes";
import type { RecipeIngredientDto } from "../../types/recipes";
import { ImportIngredientEditDialog } from "./ImportIngredientEditDialog";
import { ImportShoppingIngredientCard } from "./ImportShoppingIngredientCard";
import { defaultUnitName, displayUnitLabel } from "./importUnitDisplay";
import { useShoppingUnits } from "./useShoppingUnits";

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

function buildInitialQuantities(rows: RecipeIngredientDto[]): Record<number, number> {
  const map: Record<number, number> = {};
  for (const r of rows) map[r.recipeIngredientId] = r.quantity;
  return map;
}

function buildInitialUnitNames(rows: RecipeIngredientDto[]): Record<number, string> {
  const map: Record<number, string> = {};
  for (const r of rows) map[r.recipeIngredientId] = defaultUnitName(r.unitOfMeasure);
  return map;
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
  const [visibleIds, setVisibleIds] = useState<number[]>([]);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [unitNames, setUnitNames] = useState<Record<number, string>>({});
  const [removedStack, setRemovedStack] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editQuantityText, setEditQuantityText] = useState("");
  const [editUnitText, setEditUnitText] = useState("");
  const [editError, setEditError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { units, loadingUnits } = useShoppingUnits(open);

  useEffect(() => {
    if (!open || !userId || recipeId == null || !Number.isFinite(recipeId)) {
      setRows([]);
      setVisibleIds([]);
      setQuantities({});
      setUnitNames({});
      setRemovedStack([]);
      setEditingId(null);
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
        setQuantities(buildInitialQuantities(sorted));
        setUnitNames(buildInitialUnitNames(sorted));
        setRemovedStack([]);
        setEditingId(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setRows([]);
          setVisibleIds([]);
          setQuantities({});
          setUnitNames({});
          setRemovedStack([]);
          setEditingId(null);
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
    setQuantities(buildInitialQuantities(rows));
    setUnitNames(buildInitialUnitNames(rows));
    setRemovedStack([]);
    setEditingId(null);
    setError("");
  }, [rows]);

  const openEdit = useCallback(
    (row: RecipeIngredientDto) => {
      const id = row.recipeIngredientId;
      setEditingId(id);
      setEditQuantityText(String(quantities[id] ?? row.quantity));
      setEditUnitText(unitNames[id] ?? defaultUnitName(row.unitOfMeasure));
      setEditError("");
    },
    [quantities, unitNames],
  );

  const closeEdit = useCallback(() => {
    setEditingId(null);
    setEditError("");
  }, []);

  const confirmEdit = useCallback(() => {
    if (editingId == null) return;
    const qty = Number(editQuantityText);
    if (!Number.isFinite(qty) || qty <= 0) {
      setEditError("La cantidad debe ser un número mayor que cero.");
      return;
    }
    setQuantities((prev) => ({ ...prev, [editingId]: qty }));
    setUnitNames((prev) => ({ ...prev, [editingId]: editUnitText.trim() }));
    closeEdit();
    setError("");
  }, [editingId, editQuantityText, editUnitText, closeEdit]);

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
    const items = visibleIds.map((id) => {
      const row = rows.find((r) => r.recipeIngredientId === id);
      const q = quantities[id] ?? row?.quantity;
      if (q == null || !Number.isFinite(q) || q <= 0) return null;
      const unit = unitNames[id] ?? (row ? defaultUnitName(row.unitOfMeasure) : "");
      return {
        recipeIngredientId: id,
        quantity: q,
        unitName: unit.trim() || null,
      };
    });
    if (items.some((x) => x == null)) {
      setError("Revisa las cantidades: deben ser mayores que cero.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await importRecipeIngredientsToShoppingList(userId, recipeId, {
        items: items as { recipeIngredientId: number; quantity: number }[],
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
          Toca la imagen para quitar lo que no compres. Toca cantidad o unidad para editar (como en la
          cesta). <strong>Deshacer</strong> recupera el último que quitaste.
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
                aria-label="Ingredientes a añadir"
              >
                {visibleRows.map((row) => {
                  const id = row.recipeIngredientId;
                  const unitName = unitNames[id] ?? defaultUnitName(row.unitOfMeasure);
                  const qty = quantities[id] ?? row.quantity;
                  return (
                    <ImportShoppingIngredientCard
                      key={id}
                      name={row.ingredient.name}
                      ingredientImageUrl={row.ingredient.imageUrl}
                      quantity={qty}
                      unitLabel={displayUnitLabel(unitName, units)}
                      unitTitle={unitName.trim() || undefined}
                      disabled={submitting}
                      onEdit={() => openEdit(row)}
                      onRemove={() => removeFromView(id)}
                    />
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

      <ImportIngredientEditDialog
        open={editingId != null}
        ingredientName={
          editingId != null
            ? rows.find((r) => r.recipeIngredientId === editingId)?.ingredient.name ?? ""
            : ""
        }
        quantityText={editQuantityText}
        unitText={editUnitText}
        units={units}
        loadingUnits={loadingUnits}
        error={editError}
        onQuantityChange={setEditQuantityText}
        onUnitChange={setEditUnitText}
        onCancel={closeEdit}
        onConfirm={confirmEdit}
      />
    </div>
  );
}
