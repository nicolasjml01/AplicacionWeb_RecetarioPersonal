import { useCallback, useState } from "react";
import type { RecipeMediaDto } from "../../../types/recipes";
import { resolveMediaUrl } from "../../../utils/mediaUrl";

type Props = {
  /** Sorted by displayOrder */
  media: RecipeMediaDto[];
  dense?: boolean;
  addLabel?: string;
  disabled?: boolean;
  onAdd: () => void;
  onRemove: (mediaId: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  // Optional: enables the pencil button on image thumbnails to re-edit them.
  onEdit?: (mediaId: number) => void;
  hideHint?: boolean;
};

/**
 * Horizontal strip: thumbnails, drag to reorder (native DnD), delete, add.
 */
export function MediaStripEditor({
  media,
  dense = false,
  addLabel = "Añadir",
  disabled = false,
  onAdd,
  onRemove,
  onReorder,
  onEdit,
  hideHint = false,
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((i: number) => {
    setDragIndex(i);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (toIndex: number) => {
      if (dragIndex == null || dragIndex === toIndex) return;
      onReorder(dragIndex, toIndex);
      setDragIndex(null);
    },
    [dragIndex, onReorder],
  );

  return (
    <div className={`media-strip ${dense ? "media-strip--dense" : ""}`}>
      <div className="media-strip__scroll">
        {media.map((m, i) => (
          <div
            key={m.mediaId}
            className={`media-strip__cell ${dragIndex === i ? "media-strip__cell--drag" : ""}`}
            draggable={!disabled}
            onDragStart={() => handleDragStart(i)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(i)}
          >
            <div className="media-strip__thumb-wrap">
              {m.contentType.startsWith("video/") ? (
                <video className="media-strip__thumb" muted playsInline src={resolveMediaUrl(m.url)} />
              ) : (
                <img className="media-strip__thumb" src={resolveMediaUrl(m.url)} alt="" />
              )}
              {!disabled && onEdit && !m.contentType.startsWith("video/") && (
                <button
                  type="button"
                  className="media-strip__edit"
                  onClick={() => onEdit(m.mediaId)}
                  aria-label="Editar imagen"
                  title="Editar imagen"
                >
                  ✎
                </button>
              )}
              {!disabled && (
                <button
                  type="button"
                  className="media-strip__remove"
                  onClick={() => onRemove(m.mediaId)}
                  aria-label="Quitar archivo"
                >
                  ×
                </button>
              )}
            </div>
            {i === 0 && <span className="media-strip__cover-badge">Portada</span>}
          </div>
        ))}
        {!disabled && (
          <button type="button" className="media-strip__add" onClick={onAdd} aria-label={addLabel}>
            <span className="media-strip__add-plus">+</span>
            <span className="media-strip__add-text">{addLabel}</span>
          </button>
        )}
      </div>
      {!hideHint && (
        <p className="media-strip__hint">Arrastra las miniaturas para cambiar el orden (la primera es la portada).</p>
      )}
    </div>
  );
}
