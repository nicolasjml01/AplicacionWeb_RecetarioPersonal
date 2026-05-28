import { useCallback, useEffect, useState } from "react";
import { dayShoppingImportPreview, importDayToShoppingList } from "../../api/calendar";
import { ModalBackdrop, ModalPanel } from "../ui/ModalBackdrop";
import { ImportIngredientEditDialog } from "../recipe/ImportIngredientEditDialog";
import { ImportShoppingIngredientCard } from "../recipe/ImportShoppingIngredientCard";
import { defaultUnitName, displayUnitLabel } from "../recipe/importUnitDisplay";
import { useShoppingUnits } from "../recipe/useShoppingUnits";
import type { DayShoppingImportLineDto } from "../../types/calendar";

type Props = {
  open: boolean;
  userId: number;
  planDate: string;
  calendarEntryIds: number[];
  onClose: () => void;
  onSuccess: (message: string) => void;
};

function buildInitialQuantities(lines: DayShoppingImportLineDto[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const l of lines) map[l.groupKey] = l.suggestedQuantity;
  return map;
}

function buildInitialUnitNames(lines: DayShoppingImportLineDto[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const l of lines) map[l.groupKey] = defaultUnitName(l.unitOfMeasure);
  return map;
}

export function ImportDayShoppingDialog({
  open,
  userId,
  planDate,
  calendarEntryIds,
  onClose,
  onSuccess,
}: Props) {
  const [lines, setLines] = useState<DayShoppingImportLineDto[]>([]);
  const [visibleKeys, setVisibleKeys] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [unitNames, setUnitNames] = useState<Record<string, string>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editQuantityText, setEditQuantityText] = useState("");
  const [editUnitText, setEditUnitText] = useState("");
  const [editError, setEditError] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { units, loadingUnits } = useShoppingUnits(open);

  useEffect(() => {
    if (!open || calendarEntryIds.length === 0) {
      setLines([]);
      setVisibleKeys([]);
      setQuantities({});
      setUnitNames({});
      setEditingKey(null);
      setWarnings([]);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void dayShoppingImportPreview(userId, planDate, calendarEntryIds)
      .then((preview) => {
        if (cancelled) return;
        setLines(preview.lines);
        setVisibleKeys(preview.lines.map((l) => l.groupKey));
        setQuantities(buildInitialQuantities(preview.lines));
        setUnitNames(buildInitialUnitNames(preview.lines));
        setWarnings(preview.warnings);
        setEditingKey(null);
      })
      .catch((e) => {
        if (!cancelled) {
          setLines([]);
          setVisibleKeys([]);
          setQuantities({});
          setUnitNames({});
          setError(e instanceof Error ? e.message : "No se pudo cargar la vista previa.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userId, planDate, calendarEntryIds]);

  const removeLine = useCallback((key: string) => {
    setVisibleKeys((prev) => prev.filter((k) => k !== key));
    setError("");
  }, []);

  const resetVisible = useCallback(() => {
    setVisibleKeys(lines.map((l) => l.groupKey));
    setQuantities(buildInitialQuantities(lines));
    setUnitNames(buildInitialUnitNames(lines));
    setEditingKey(null);
    setError("");
  }, [lines]);

  const openEdit = useCallback(
    (line: DayShoppingImportLineDto) => {
      setEditingKey(line.groupKey);
      setEditQuantityText(String(quantities[line.groupKey] ?? line.suggestedQuantity));
      setEditUnitText(unitNames[line.groupKey] ?? defaultUnitName(line.unitOfMeasure));
      setEditError("");
    },
    [quantities, unitNames],
  );

  const closeEdit = useCallback(() => {
    setEditingKey(null);
    setEditError("");
  }, []);

  const confirmEdit = useCallback(() => {
    if (editingKey == null) return;
    const qty = Number(editQuantityText);
    if (!Number.isFinite(qty) || qty <= 0) {
      setEditError("La cantidad debe ser un número mayor que cero.");
      return;
    }
    setQuantities((prev) => ({ ...prev, [editingKey]: qty }));
    setUnitNames((prev) => ({ ...prev, [editingKey]: editUnitText.trim() }));
    closeEdit();
    setError("");
  }, [editingKey, editQuantityText, editUnitText, closeEdit]);

  if (!open) return null;

  const visibleLines = lines.filter((l) => visibleKeys.includes(l.groupKey));
  const editingLine = editingKey != null ? lines.find((l) => l.groupKey === editingKey) : undefined;

  const handleSubmit = async () => {
    if (visibleLines.length === 0) {
      setError("Deja al menos un ingrediente para importar, o pulsa Cancelar.");
      return;
    }
    const items = visibleLines.map((l) => {
      const q = quantities[l.groupKey] ?? l.suggestedQuantity;
      if (!Number.isFinite(q) || q <= 0) return null;
      const unit = unitNames[l.groupKey] ?? defaultUnitName(l.unitOfMeasure);
      return {
        groupKey: l.groupKey,
        ingredientId: l.ingredient.ingredientId,
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
      const res = await importDayToShoppingList(
        userId,
        planDate,
        calendarEntryIds,
        items as {
          groupKey: string;
          ingredientId: number;
          quantity: number;
          unitName: string | null;
        }[],
      );
      const n = res.itemsAdded;
      onSuccess(
        n === 1 ? "1 ingrediente añadido a la cesta." : `${n} ingredientes añadidos a la cesta.`,
      );
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron importar los ingredientes.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalBackdrop onDismiss={onClose} disabled={submitting}>
      <ModalPanel
        className="create-recipe-dialog import-ingredients-dialog cal-modal--wide"
        aria-labelledby="import-day-title"
      >
        <h2 id="import-day-title" className="create-recipe-dialog__title">
          Día completo a la cesta
        </h2>
        <p className="create-recipe-dialog__msg import-ingredients-dialog__hint">
          Ingredientes sumados de las comidas seleccionadas. Toca la imagen para quitar lo que no
          compres. Toca cantidad o unidad para editar (como en la cesta).
        </p>

        {warnings.length > 0 && (
          <ul className="cal-warnings">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        {loading && <p className="create-recipe-hint">Cargando ingredientes…</p>}
        {error && <p className="home-error">{error}</p>}

        {!loading && lines.length > 0 && (
          <>
            <div className="import-ingredients-dialog__toolbar">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={resetVisible}
                disabled={visibleKeys.length === lines.length || submitting}
              >
                Mostrar todos
              </button>
            </div>
            <div
              className="recipe-detail__ingredients-grid import-ingredients-dialog__grid"
              aria-label="Ingredientes a importar"
            >
              {visibleLines.map((line) => {
                const unitName = unitNames[line.groupKey] ?? defaultUnitName(line.unitOfMeasure);
                const qty = quantities[line.groupKey] ?? line.suggestedQuantity;
                return (
                  <ImportShoppingIngredientCard
                    key={line.groupKey}
                    name={line.ingredient.name}
                    ingredientImageUrl={line.ingredient.imageUrl}
                    quantity={qty}
                    unitLabel={displayUnitLabel(unitName, units)}
                    unitTitle={unitName.trim() || undefined}
                    disabled={submitting}
                    onEdit={() => openEdit(line)}
                    onRemove={() => removeLine(line.groupKey)}
                  />
                );
              })}
            </div>
          </>
        )}

        {!loading && lines.length === 0 && !error && (
          <p className="create-recipe-hint">No hay ingredientes para importar en las comidas elegidas.</p>
        )}

        <div className="create-recipe-dialog__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={submitting}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void handleSubmit()}
            disabled={submitting || loading || visibleLines.length === 0}
          >
            {submitting ? "Añadiendo…" : `Añadir a la cesta (${visibleLines.length})`}
          </button>
        </div>
      </ModalPanel>

      <ImportIngredientEditDialog
        open={editingKey != null}
        ingredientName={editingLine?.ingredient.name ?? ""}
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
    </ModalBackdrop>
  );
}
