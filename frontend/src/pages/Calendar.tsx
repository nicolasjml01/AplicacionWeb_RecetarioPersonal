import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getCurrentUserId } from "../auth/session";
import {
  getCalendarRange,
  getDayPlan,
  removeCalendarEntry,
  reorderCalendarEntries,
  reorderDayMeals,
} from "../api/calendar";
import { AddCalendarEntryModal } from "../components/calendar/AddCalendarEntryModal";
import { CalendarDateNavigator } from "../components/calendar/CalendarDateNavigator";
import { CalendarDayView } from "../components/calendar/CalendarDayView";
import { CalendarMonthView } from "../components/calendar/CalendarMonthView";
import { CalendarWeekView } from "../components/calendar/CalendarWeekView";
import { CreateMealTypeModal } from "../components/calendar/CreateMealTypeModal";
import { ImportDayShoppingDialog } from "../components/calendar/ImportDayShoppingDialog";
import { ImportRecipeIngredientsDialog } from "../components/recipe/ImportRecipeIngredientsDialog";
import type { CalendarRangeDto, CalendarViewMode, DayPlanDto } from "../types/calendar";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeekSunday,
  parseIsoDate,
  startOfMonth,
  startOfWeekMonday,
  toIsoDate,
  todayIso,
} from "../utils/calendarDates";
import type { RecipeReturnNav } from "../utils/recipeReturnNav";

function viewModeFromParam(value: string | null): CalendarViewMode {
  if (value === "week" || value === "month") return value;
  return "day";
}

function dateFromParam(value: string | null): string {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return todayIso();
}

export function Calendar() {
  const userId = getCurrentUserId();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<CalendarViewMode>(() =>
    viewModeFromParam(searchParams.get("view")),
  );
  const [selectedIso, setSelectedIso] = useState(() => dateFromParam(searchParams.get("date")));
  const [dayPlan, setDayPlan] = useState<DayPlanDto | null>(null);
  const [range, setRange] = useState<CalendarRangeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [mealTypeModalOpen, setMealTypeModalOpen] = useState(false);
  const [shoppingImportOpen, setShoppingImportOpen] = useState(false);
  const [shoppingImportEntryIds, setShoppingImportEntryIds] = useState<number[]>([]);
  const [recipeImport, setRecipeImport] = useState<{
    recipeId: number;
    title: string;
  } | null>(null);

  const selectedDate = useMemo(() => parseIsoDate(selectedIso), [selectedIso]);
  const isTodaySelected = selectedIso === todayIso();
  const weekMonday = useMemo(() => startOfWeekMonday(selectedDate), [selectedDate]);
  const monthAnchor = useMemo(() => startOfMonth(selectedDate), [selectedDate]);

  const recipeReturnNav = useMemo<RecipeReturnNav>(
    () => ({ kind: "calendar", view: viewMode, date: selectedIso }),
    [viewMode, selectedIso],
  );

  const dayCalendarEntryIds = useMemo(() => {
    if (!dayPlan) return [];
    return dayPlan.mealBlocks.flatMap((block) =>
      block.entries.map((entry) => entry.calendarEntryId),
    );
  }, [dayPlan]);

  useEffect(() => {
    const view = searchParams.get("view");
    const date = searchParams.get("date");
    if (view === viewMode && date === selectedIso) return;
    const p = new URLSearchParams();
    p.set("view", viewMode);
    p.set("date", selectedIso);
    setSearchParams(p, { replace: true });
  }, [viewMode, selectedIso, searchParams, setSearchParams]);

  const loadDay = useCallback(async (options?: { silent?: boolean }) => {
    if (!userId) return;
    if (!options?.silent) setLoading(true);
    setError("");
    try {
      const plan = await getDayPlan(userId, selectedIso);
      setDayPlan(plan);
    } catch (e) {
      if (!options?.silent) setDayPlan(null);
      setError(e instanceof Error ? e.message : "Error cargando el día.");
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [userId, selectedIso]);

  const loadRange = useCallback(
    async (from: string, to: string, options?: { silent?: boolean }) => {
      if (!userId) return;
      if (!options?.silent) setLoading(true);
      setError("");
      try {
        const data = await getCalendarRange(userId, from, to);
        setRange(data);
      } catch (e) {
        if (!options?.silent) setRange(null);
        setError(e instanceof Error ? e.message : "Error cargando el calendario.");
      } finally {
        if (!options?.silent) setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    if (!userId) return;
    if (viewMode === "day") {
      void loadDay();
    } else if (viewMode === "week") {
      const from = toIsoDate(weekMonday);
      const to = toIsoDate(endOfWeekSunday(weekMonday));
      void loadRange(from, to);
    } else {
      const from = toIsoDate(startOfMonth(monthAnchor));
      const to = toIsoDate(endOfMonth(monthAnchor));
      void loadRange(from, to);
    }
  }, [userId, viewMode, selectedIso, weekMonday, monthAnchor, loadDay, loadRange]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const refresh = useCallback(
    (options?: { silent?: boolean }) => {
      if (viewMode === "day") void loadDay(options);
      else if (viewMode === "week") {
        void loadRange(toIsoDate(weekMonday), toIsoDate(endOfWeekSunday(weekMonday)), options);
      } else {
        void loadRange(toIsoDate(startOfMonth(monthAnchor)), toIsoDate(endOfMonth(monthAnchor)), options);
      }
    },
    [viewMode, loadDay, loadRange, weekMonday, monthAnchor],
  );

  const goPrev = () => {
    if (viewMode === "day") setSelectedIso(toIsoDate(addDays(selectedDate, -1)));
    else if (viewMode === "week") setSelectedIso(toIsoDate(addDays(selectedDate, -7)));
    else setSelectedIso(toIsoDate(addMonths(selectedDate, -1)));
  };

  const goNext = () => {
    if (viewMode === "day") setSelectedIso(toIsoDate(addDays(selectedDate, 1)));
    else if (viewMode === "week") setSelectedIso(toIsoDate(addDays(selectedDate, 7)));
    else setSelectedIso(toIsoDate(addMonths(selectedDate, 1)));
  };

  const goToday = () => {
    setSelectedIso(todayIso());
    if (viewMode !== "day") setViewMode("day");
  };

  const selectDayFromGrid = (iso: string) => {
    setSelectedIso(iso);
    setViewMode("day");
  };

  const persistMealOrder = async (
    blocks: DayPlanDto["mealBlocks"],
    previousBlocks: DayPlanDto["mealBlocks"],
  ) => {
    if (!userId) return;
    setDayPlan((prev) => (prev ? { ...prev, mealBlocks: blocks } : prev));
    setBusy(true);
    try {
      await reorderDayMeals(
        userId,
        selectedIso,
        blocks.map((b, i) => ({ mealTypeId: b.mealType.mealTypeId, sortOrder: i })),
      );
    } catch (e) {
      setDayPlan((prev) => (prev ? { ...prev, mealBlocks: previousBlocks } : prev));
      setError(e instanceof Error ? e.message : "No se pudo reordenar.");
    } finally {
      setBusy(false);
    }
  };

  const handleReorderMealBlocks = (fromIndex: number, toIndex: number) => {
    if (!dayPlan || fromIndex === toIndex) return;
    const previousBlocks = dayPlan.mealBlocks;
    const next = [...previousBlocks];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(toIndex, 0, moved);
    void persistMealOrder(next, previousBlocks);
  };

  const handleReorderEntries = async (blockIndex: number, fromIndex: number, toIndex: number) => {
    if (!userId || !dayPlan || fromIndex === toIndex) return;
    const block = dayPlan.mealBlocks[blockIndex];
    if (!block) return;
    const previousBlocks = dayPlan.mealBlocks;
    const entries = [...block.entries];
    const [moved] = entries.splice(fromIndex, 1);
    if (!moved) return;
    entries.splice(toIndex, 0, moved);
    const nextBlocks = previousBlocks.map((b, i) =>
      i === blockIndex ? { ...b, entries } : b,
    );
    setDayPlan((prev) => (prev ? { ...prev, mealBlocks: nextBlocks } : prev));
    setBusy(true);
    try {
      await reorderCalendarEntries(
        userId,
        selectedIso,
        entries.map((e, i) => ({ calendarEntryId: e.calendarEntryId, sortOrder: i })),
      );
    } catch (e) {
      setDayPlan((prev) => (prev ? { ...prev, mealBlocks: previousBlocks } : prev));
      setError(e instanceof Error ? e.message : "No se pudo reordenar.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveEntry = async (calendarEntryId: number) => {
    if (!userId) return;
    setBusy(true);
    try {
      await removeCalendarEntry(userId, calendarEntryId);
      setToast("Comida quitada del día.");
      await loadDay();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo quitar.");
    } finally {
      setBusy(false);
    }
  };

  if (!userId) {
    return (
      <div className="cal-page">
        <p className="home-error">Inicia sesión para ver el calendario.</p>
      </div>
    );
  }

  const fitViewport = viewMode === "week" || viewMode === "month";

  return (
    <div className={`cal-page${fitViewport ? " cal-page--fit" : ""}`}>
      <div className="cal-toolbar">
        <div className="cal-toolbar__left">
        <div className="cal-view-tabs" role="tablist" aria-label="Vista del calendario">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={viewMode === mode}
              className={`cal-view-tab${viewMode === mode ? " cal-view-tab--active" : ""}`}
              onClick={() => setViewMode(mode)}
            >
              {mode === "day" ? "Día" : mode === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="cal-today-btn"
          disabled={isTodaySelected && viewMode === "day"}
          onClick={goToday}
        >
          Hoy
        </button>
        </div>

        {viewMode === "day" && (
          <div className="cal-toolbar__actions">
            <button type="button" className="btn btn--primary" onClick={() => setAddOpen(true)}>
              + Receta
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setMealTypeModalOpen(true)}
            >
              + Tipo de comida
            </button>
          </div>
        )}
      </div>

      <section className="cal-date-panel" aria-label="Navegación de fecha">
        <div className="cal-date-panel__inner">
          <CalendarDateNavigator
            viewMode={viewMode}
            selectedIso={selectedIso}
            onSelectIso={setSelectedIso}
            onPrev={goPrev}
            onNext={goNext}
          />
          {viewMode === "day" && (
            <button
              type="button"
              className="btn btn--secondary cal-day-import-btn"
              disabled={loading || busy || dayCalendarEntryIds.length === 0}
              title={
                dayCalendarEntryIds.length === 0
                  ? "Añade recetas al día para importar ingredientes"
                  : "Sumar ingredientes de todas las comidas del día"
              }
              onClick={() => {
                setShoppingImportEntryIds(dayCalendarEntryIds);
                setShoppingImportOpen(true);
              }}
            >
              Añadir día a la cesta
            </button>
          )}
        </div>
      </section>

      {toast && <p className="cal-toast">{toast}</p>}
      {error && <p className="home-error cal-page__error">{error}</p>}

      <section className="cal-content-panel" aria-label="Calendario">
        <main className="cal-main">
        {viewMode === "day" && (
          <CalendarDayView
            userId={userId}
            dayPlan={dayPlan}
            loading={loading}
            busy={busy}
            recipeReturnNav={recipeReturnNav}
            onReorderMealBlocks={handleReorderMealBlocks}
            onReorderEntries={(blockIndex, from, to) => void handleReorderEntries(blockIndex, from, to)}
            onRemoveEntry={(id) => void handleRemoveEntry(id)}
            onImportRecipe={(recipeId, title) => setRecipeImport({ recipeId, title })}
            onImportBlock={(ids) => {
              setShoppingImportEntryIds(ids);
              setShoppingImportOpen(true);
            }}
          />
        )}
        {viewMode === "week" && (
          <CalendarWeekView
            range={range}
            weekMonday={weekMonday}
            loading={loading}
            onSelectDay={selectDayFromGrid}
          />
        )}
        {viewMode === "month" && (
          <CalendarMonthView
            range={range}
            monthAnchor={monthAnchor}
            loading={loading}
            selectedIso={selectedIso}
            onSelectDay={selectDayFromGrid}
          />
        )}
        </main>
      </section>

      <AddCalendarEntryModal
        open={addOpen}
        userId={userId}
        planDate={selectedIso}
        onClose={() => setAddOpen(false)}
        onAdded={(count) => {
          setToast(
            count === 1 ? "1 receta añadida al calendario." : `${count} recetas añadidas al calendario.`,
          );
          refresh({ silent: true });
        }}
      />

      <CreateMealTypeModal
        open={mealTypeModalOpen}
        userId={userId}
        onClose={() => setMealTypeModalOpen(false)}
        onCreated={(msg) => {
          setToast(msg);
          if (viewMode === "day") void loadDay();
        }}
      />

      <ImportDayShoppingDialog
        open={shoppingImportOpen}
        userId={userId}
        planDate={selectedIso}
        calendarEntryIds={shoppingImportEntryIds}
        onClose={() => setShoppingImportOpen(false)}
        onSuccess={setToast}
      />

      <ImportRecipeIngredientsDialog
        open={recipeImport != null}
        userId={userId}
        recipeId={recipeImport?.recipeId ?? null}
        recipeTitle={recipeImport?.title}
        onClose={() => setRecipeImport(null)}
        onSuccess={setToast}
      />
    </div>
  );
}
