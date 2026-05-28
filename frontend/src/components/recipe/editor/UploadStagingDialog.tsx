import { useEffect, useMemo, useState } from "react";
import { RecipeUploadLayoutPreview } from "../../media/UploadLayoutPreview";
import { ModalBackdrop } from "../../ui/ModalBackdrop";
import { ImageEditorDialog } from "./ImageEditorDialog";
import { hasEdits, isEditableImage, type ImageEdits } from "../../../utils/imageEditing";

export type StagingItem = {
  id: string;
  file: File;
  edits: ImageEdits | null;
  // Cached object URL so the thumbnail does not re-read the file on each render.
  previewUrl: string;
  // Videos / HEIC cannot be edited; they go straight to upload.
  editable: boolean;
};

type Props = {
  open: boolean;
  // Files just picked in the OS dialog.
  files: File[];
  contextLabel?: string;
  /** Shown on the listado/cover preview tile. */
  recipeTitle?: string;
  /** False when the gallery already has media (new files are not auto-cover). */
  isCoverCandidate?: boolean;
  onCancel: () => void;
  // Parent rasterizes and uploads in the order received.
  onConfirm: (items: Array<{ file: File; edits: ImageEdits | null }>) => void;
};

// Pre-upload queue: lets the user edit / remove each file before sending.
// Edits are kept as data (no rasterization yet) so reopening the editor on a
// row keeps its previous values.
export function UploadStagingDialog({
  open,
  files,
  contextLabel,
  recipeTitle = "Tu receta",
  isCoverCandidate = true,
  onCancel,
  onConfirm,
}: Props) {
  const [items, setItems] = useState<StagingItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Build rows + preview URLs whenever a new batch comes in.
  useEffect(() => {
    if (!open) return;
    const next: StagingItem[] = files.map((f, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      edits: null,
      previewUrl: URL.createObjectURL(f),
      editable: isEditableImage(f),
    }));
    setItems(next);
    setEditingIndex(null);
    return () => {
      for (const it of next) URL.revokeObjectURL(it.previewUrl);
    };
  }, [open, files]);

  const editedCount = useMemo(
    () => items.reduce((acc, it) => acc + (it.edits && hasEdits(it.edits) ? 1 : 0), 0),
    [items],
  );

  const layoutPreviewItem = useMemo(
    () => items.find((it) => !it.file.type.startsWith("video/")) ?? null,
    [items],
  );

  if (!open) return null;

  const removeAt = (idx: number) => {
    setItems((prev) => {
      const out = prev.slice();
      const [removed] = out.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return out;
    });
  };

  const handleApplyEdits = (edits: ImageEdits) => {
    if (editingIndex == null) return;
    setItems((prev) =>
      prev.map((it, i) => (i === editingIndex ? { ...it, edits } : it)),
    );
    setEditingIndex(null);
  };

  const handleConfirm = () => {
    onConfirm(items.map((it) => ({ file: it.file, edits: it.edits })));
  };

  const editingItem = editingIndex != null ? items[editingIndex] : null;

  return (
    <ModalBackdrop
      className="upload-staging-backdrop"
      role="dialog"
      onDismiss={onCancel}
      disabled={editingIndex != null}
    >
      <div
        className="upload-staging-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Confirmar subida"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="upload-staging__header">
          <h2 className="upload-staging__title">Subir archivos</h2>
          {contextLabel && <p className="upload-staging__context">{contextLabel}</p>}
        </header>

        {layoutPreviewItem && (
          <RecipeUploadLayoutPreview
            previewSrc={layoutPreviewItem.previewUrl}
            edits={layoutPreviewItem.edits}
            recipeTitle={recipeTitle}
            isCoverCandidate={isCoverCandidate}
          />
        )}

        {items.length === 0 ? (
          <p className="upload-staging__empty">No quedan archivos por subir.</p>
        ) : (
          <ul className="upload-staging__list">
            {items.map((it, i) => {
              const edited = it.edits ? hasEdits(it.edits) : false;
              return (
                <li key={it.id} className="upload-staging__row">
                  <div className="upload-staging__thumb-wrap">
                    {it.file.type.startsWith("video/") ? (
                      <video className="upload-staging__thumb" muted playsInline src={it.previewUrl} />
                    ) : (
                      <img
                        className="upload-staging__thumb"
                        src={it.previewUrl}
                        alt=""
                        style={
                          edited && it.edits
                            ? {
                                filter: `brightness(${it.edits.brightness}%) contrast(${it.edits.contrast}%) saturate(${it.edits.saturation}%)`,
                              }
                            : undefined
                        }
                      />
                    )}
                    {edited && <span className="upload-staging__edited">Editada</span>}
                  </div>
                  <div className="upload-staging__info">
                    <p className="upload-staging__name" title={it.file.name}>{it.file.name}</p>
                    <p className="upload-staging__meta">{formatBytes(it.file.size)}</p>
                  </div>
                  <div className="upload-staging__actions">
                    <button
                      type="button"
                      className="btn btn--secondary upload-staging__btn"
                      onClick={() => setEditingIndex(i)}
                      disabled={!it.editable}
                      title={
                        it.editable
                          ? edited
                            ? "Volver a editar"
                            : "Editar imagen"
                          : "Vídeo o formato no editable"
                      }
                    >
                      ✎ Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary upload-staging__btn upload-staging__btn--danger"
                      onClick={() => removeAt(i)}
                    >
                      Quitar
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="upload-staging__footer">
          <p className="upload-staging__summary">
            {items.length === 0
              ? "Lote vacío"
              : `${items.length} archivo${items.length === 1 ? "" : "s"} · ${editedCount} con edición`}
          </p>
          <div className="upload-staging__footer-actions">
            <button type="button" className="btn btn--secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleConfirm}
              disabled={items.length === 0}
            >
              Subir
            </button>
          </div>
        </footer>
      </div>

      {editingItem && (
        <ImageEditorDialog
          open
          file={editingItem.file}
          fileName={editingItem.file.name}
          initialEdits={editingItem.edits}
          previewContext="recipe"
          recipeTitle={recipeTitle}
          showCoverTile={isCoverCandidate}
          onCancel={() => setEditingIndex(null)}
          onApply={handleApplyEdits}
        />
      )}
    </ModalBackdrop>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
