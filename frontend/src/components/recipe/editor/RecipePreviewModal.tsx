import type { RecipeCategoryDto, RecipeMediaDto } from "../../../types/recipes";
import { resolveMediaUrl } from "../../../utils/mediaUrl";
import { ModalBackdrop, ModalPanel } from "../../ui/ModalBackdrop";

type Props = {
  open: boolean;
  title: string;
  categories: RecipeCategoryDto[];
  steps: { stepNumber: number; content: string; media: RecipeMediaDto[] }[];
  globalMedia: RecipeMediaDto[];
  publishing: boolean;
  error: string;
  onClose: () => void;
  onPublish: () => void;
};

export function RecipePreviewModal({
  open,
  title,
  categories,
  steps,
  globalMedia,
  publishing,
  error,
  onClose,
  onPublish,
}: Props) {
  if (!open) return null;

  const sortedGlobal = [...globalMedia].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <ModalBackdrop onDismiss={onClose} disabled={publishing}>
      <ModalPanel className="create-recipe-preview" aria-labelledby="preview-title">
        <h2 id="preview-title" className="create-recipe-preview__title">
          Previsualización
        </h2>
        <p className="create-recipe-preview__subtitle">
          Revisa cómo quedará la receta. Cuando estés conforme, publícala para que aparezca en el inicio.
        </p>

        <div className="create-recipe-preview__block">
          <h3 className="create-recipe-preview__label">Nombre</h3>
          <p className="create-recipe-preview__value">{title.trim() || "—"}</p>
        </div>

        {categories.length > 0 && (
          <div className="create-recipe-preview__block">
            <h3 className="create-recipe-preview__label">Etiquetas</h3>
            <ul className="recipe-detail__chips">
              {categories.map((c) => (
                <li key={c.categoryId}>{c.name}</li>
              ))}
            </ul>
          </div>
        )}

        {sortedGlobal.length > 0 && (
          <div className="create-recipe-preview__block">
            <h3 className="create-recipe-preview__label">Galería</h3>
            <div className="create-recipe-preview__media-row">
              {sortedGlobal.map((m) => (
                <figure key={m.mediaId} className="create-recipe-preview__fig">
                  {m.contentType.startsWith("video/") ? (
                    <video className="create-recipe-preview__thumb" muted playsInline src={resolveMediaUrl(m.url)} />
                  ) : (
                    <img className="create-recipe-preview__thumb" src={resolveMediaUrl(m.url)} alt="" />
                  )}
                </figure>
              ))}
            </div>
          </div>
        )}

        <div className="create-recipe-preview__block">
          <h3 className="create-recipe-preview__label">Pasos</h3>
          <ol className="create-recipe-preview__steps">
            {steps.map((s, i) => (
              <li key={i}>
                <p className="create-recipe-preview__step-text">{s.content.trim() || "(vacío)"}</p>
                {s.media.length > 0 && (
                  <div className="create-recipe-preview__media-row create-recipe-preview__media-row--small">
                    {[...s.media]
                      .sort((a, b) => a.displayOrder - b.displayOrder)
                      .map((m) => (
                        <figure key={m.mediaId} className="create-recipe-preview__fig">
                          {m.contentType.startsWith("video/") ? (
                            <video
                              className="create-recipe-preview__thumb"
                              muted
                              playsInline
                              src={resolveMediaUrl(m.url)}
                            />
                          ) : (
                            <img className="create-recipe-preview__thumb" src={resolveMediaUrl(m.url)} alt="" />
                          )}
                        </figure>
                      ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>

        {error && <p className="home-error">{error}</p>}

        <div className="create-recipe-preview__actions">
          <button type="button" className="btn btn--secondary" onClick={onClose} disabled={publishing}>
            Volver a editar
          </button>
          <button type="button" className="btn btn--primary" onClick={onPublish} disabled={publishing}>
            {publishing ? "Publicando…" : "Publicar"}
          </button>
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}
