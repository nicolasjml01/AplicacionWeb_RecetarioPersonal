import { useState, type FormEvent } from "react";
import type { UnitOfMeasureDto } from "../../types/shopping";
import { ModalBackdrop, ModalPanel } from "../ui/ModalBackdrop";

type Props = {
  open: boolean;
  unit: UnitOfMeasureDto | null;
  saving?: boolean;
  error?: string;
  onClose: () => void;
  onSave: (name: string, symbol: string) => void;
};

type FormProps = Omit<Props, "open" | "unit"> & { unit: UnitOfMeasureDto };

function EditUnitForm({ unit, saving = false, error = "", onClose, onSave }: FormProps) {
  const [name, setName] = useState(unit.name);
  const [symbol, setSymbol] = useState(unit.symbol ?? "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSave(trimmedName, symbol.trim());
  };

  return (
    <ModalBackdrop onDismiss={onClose} disabled={saving}>
      <ModalPanel className="create-recipe-dialog cal-modal" aria-labelledby="edit-unit-title">
        <form onSubmit={handleSubmit}>
          <h2 id="edit-unit-title" className="create-recipe-dialog__title">
            Editar unidad de medida
          </h2>
          <label className="form-group">
            <span>Nombre</span>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cucharada"
              autoFocus
              disabled={saving}
            />
          </label>
          <label className="form-group">
            <span>Abreviatura (para escribir e importar)</span>
            <input
              className="form-input"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="chrd, ml, kg…"
              maxLength={20}
              disabled={saving}
            />
          </label>
          <p className="account-page__hint account-page__hint--inline">
            Al importar o escribir ingredientes puedes usar la abreviatura (p. ej. «2 chrd harina»).
          </p>
          {error && <p className="home-error">{error}</p>}
          <div className="create-recipe-dialog__actions">
            <button type="button" className="btn btn--secondary" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving || !name.trim()}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </ModalPanel>
    </ModalBackdrop>
  );
}

export function EditUnitModal({ open, unit, ...rest }: Props) {
  if (!open || !unit) return null;
  return <EditUnitForm key={unit.unitId} unit={unit} {...rest} />;
}
