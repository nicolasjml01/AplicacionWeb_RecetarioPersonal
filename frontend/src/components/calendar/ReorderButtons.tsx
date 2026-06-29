type Props = {
  label: string;
  onUp: () => void;
  onDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
};

/** Up/down reorder controls for touch devices (drag handles stay on desktop). */
export function ReorderButtons({
  label,
  onUp,
  onDown,
  canMoveUp,
  canMoveDown,
  disabled,
}: Props) {
  return (
    <div className="cal-reorder-btn-group" role="group" aria-label={label}>
      <button
        type="button"
        className="cal-reorder-btn"
        disabled={disabled || !canMoveUp}
        aria-label={`Subir: ${label}`}
        onClick={onUp}
      >
        ↑
      </button>
      <button
        type="button"
        className="cal-reorder-btn"
        disabled={disabled || !canMoveDown}
        aria-label={`Bajar: ${label}`}
        onClick={onDown}
      >
        ↓
      </button>
    </div>
  );
}
