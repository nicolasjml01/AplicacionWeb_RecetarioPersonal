export type CalendarEntryMobilePanel = "recipe" | "ingredients";

type Props = {
  value: CalendarEntryMobilePanel;
  onChange: (panel: CalendarEntryMobilePanel) => void;
};

/** Receta / Ingredientes switch shown only on narrow screens (see CSS). */
export function CalendarEntryViewToggle({ value, onChange }: Props) {
  return (
    <div className="cal-entry-view-toggle" role="tablist" aria-label="Vista de la receta">
      <button
        type="button"
        role="tab"
        className={`cal-entry-view-toggle__btn${value === "recipe" ? " cal-entry-view-toggle__btn--active" : ""}`}
        aria-selected={value === "recipe"}
        onClick={() => onChange("recipe")}
      >
        Receta
      </button>
      <button
        type="button"
        role="tab"
        className={`cal-entry-view-toggle__btn${value === "ingredients" ? " cal-entry-view-toggle__btn--active" : ""}`}
        aria-selected={value === "ingredients"}
        onClick={() => onChange("ingredients")}
      >
        Ingredientes
      </button>
    </div>
  );
}
