import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import {
  applyImageEdits,
  NO_EDITS,
  renderCroppedPreviewBlob,
  type ImageEdits,
} from "../../../utils/imageEditing";
import {
  ImageEditorLivePreview,
  type ImageEditorPreviewContext,
} from "./ImageEditorLivePreview";
import { ModalBackdrop } from "../../ui/ModalBackdrop";

type Props = {
  open: boolean;
  file: File | Blob;
  fileName?: string;
  // When reopening on a previous edit, restore the previous values.
  initialEdits?: ImageEdits | null;
  // When true, blocks the buttons and Esc so the parent can show an async save.
  saving?: boolean;
  // Optional error message shown next to the footer buttons.
  errorMessage?: string;
  /** Frames shown in the live preview strip above the cropper. */
  previewContext?: ImageEditorPreviewContext;
  recipeTitle?: string;
  showCoverTile?: boolean;
  onCancel: () => void;
  // Parent decides when to rasterize using the returned edits.
  onApply: (edits: ImageEdits) => void;
};

type SessionProps = Omit<Props, "open">;

type AspectKey = "free" | "1:1" | "4:3" | "16:9";

const ASPECTS: { key: AspectKey; label: string; value: number | undefined }[] = [
  { key: "free", label: "Libre", value: undefined },
  { key: "1:1", label: "1:1", value: 1 },
  { key: "4:3", label: "4:3", value: 4 / 3 },
  { key: "16:9", label: "16:9", value: 16 / 9 },
];

function imageEditorSessionKey(file: File | Blob, initialEdits?: ImageEdits | null): string {
  const filePart =
    file instanceof File ? `${file.name}:${file.size}:${file.lastModified}` : `blob:${file.size}`;
  return `${filePart}:${JSON.stringify(initialEdits ?? null)}`;
}

function initialRotation(initialEdits?: ImageEdits | null): ImageEdits["rotation"] {
  return initialEdits?.rotation ?? 0;
}

// Mini image editor. Rotation/flip are pre-baked into the cropper's source
// image, so croppedAreaPixels are in the same space applyImageEdits crops
// from later. Brightness/contrast/saturation use CSS filter for live preview.
export function ImageEditorDialog({ open, file, initialEdits, ...rest }: Props) {
  if (!open) return null;
  return (
    <ImageEditorDialogSession
      key={imageEditorSessionKey(file, initialEdits)}
      file={file}
      initialEdits={initialEdits}
      {...rest}
    />
  );
}

function ImageEditorDialogSession({
  file,
  fileName,
  initialEdits,
  saving = false,
  errorMessage,
  previewContext = "recipe",
  recipeTitle = "Tu receta",
  showCoverTile = true,
  onCancel,
  onApply,
}: SessionProps) {
  const [rotation, setRotation] = useState<ImageEdits["rotation"]>(() =>
    initialRotation(initialEdits),
  );
  const [flipH, setFlipH] = useState(() => initialEdits?.flipH ?? false);
  const [aspect, setAspect] = useState<AspectKey>("free");
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(() => initialEdits?.brightness ?? 100);
  const [contrast, setContrast] = useState(() => initialEdits?.contrast ?? 100);
  const [saturation, setSaturation] = useState(() => initialEdits?.saturation ?? 100);
  const [croppedArea, setCroppedArea] = useState<Area | null>(() => initialEdits?.crop ?? null);
  const [transformedUrl, setTransformedUrl] = useState<string | null>(null);
  const [loadingTransform, setLoadingTransform] = useState(true);
  const [resultPreviewUrl, setResultPreviewUrl] = useState<string | null>(null);
  const [resultPreviewLoading, setResultPreviewLoading] = useState(false);
  const lastUrlRef = useRef<string | null>(null);
  const lastPreviewUrlRef = useRef<string | null>(null);
  const previewGenRef = useRef(0);

  useEffect(() => {
    return () => {
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      if (lastPreviewUrlRef.current) URL.revokeObjectURL(lastPreviewUrlRef.current);
      previewGenRef.current += 1;
    };
  }, []);

  // Re-bake the source image whenever rotation/flip changes.
  useEffect(() => {
    let cancelled = false;
    void renderTransformedBlobUrl(file, rotation, flipH).then((url) => {
      if (cancelled) {
        URL.revokeObjectURL(url);
        return;
      }
      if (lastUrlRef.current) URL.revokeObjectURL(lastUrlRef.current);
      lastUrlRef.current = url;
      setTransformedUrl(url);
      setLoadingTransform(false);
      // Crop geometry no longer matches the new orientation.
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    });
    return () => {
      cancelled = true;
    };
  }, [file, rotation, flipH]);

  // Live raster preview (debounced; only after crop settles — avoids flicker while dragging).
  useEffect(() => {
    if (!transformedUrl || loadingTransform) return;

    const gen = ++previewGenRef.current;
    const timer = window.setTimeout(() => {
      setResultPreviewLoading(true);
      void renderCroppedPreviewBlob(transformedUrl, croppedArea, {
        brightness,
        contrast,
        saturation,
      })
        .then((blob) => {
          if (gen !== previewGenRef.current) return;
          const url = URL.createObjectURL(blob);
          if (lastPreviewUrlRef.current) URL.revokeObjectURL(lastPreviewUrlRef.current);
          lastPreviewUrlRef.current = url;
          setResultPreviewUrl(url);
        })
        .catch(() => {
          if (gen !== previewGenRef.current) return;
          setResultPreviewUrl(null);
        })
        .finally(() => {
          if (gen === previewGenRef.current) setResultPreviewLoading(false);
        });
    }, 320);

    return () => window.clearTimeout(timer);
  }, [transformedUrl, loadingTransform, croppedArea, brightness, contrast, saturation]);

  const aspectValue = useMemo(
    () => ASPECTS.find((a) => a.key === aspect)?.value,
    [aspect],
  );

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  const markTransformPending = () => setLoadingTransform(true);

  const rotateLeft = () => {
    markTransformPending();
    setRotation(((rotation + 270) % 360) as ImageEdits["rotation"]);
  };
  const rotateRight = () => {
    markTransformPending();
    setRotation(((rotation + 90) % 360) as ImageEdits["rotation"]);
  };
  const toggleFlip = () => {
    markTransformPending();
    setFlipH((v) => !v);
  };

  const resetAll = () => {
    markTransformPending();
    setRotation(0);
    setFlipH(false);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setAspect("free");
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
  };

  const handleApply = () => {
    const edits: ImageEdits = {
      rotation,
      flipH,
      brightness,
      contrast,
      saturation,
      crop: croppedArea,
    };
    onApply(edits);
  };

  const filterStyle = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;

  return (
    <ModalBackdrop
      className="image-editor-backdrop"
      role="dialog"
      onDismiss={onCancel}
      disabled={saving}
    >
      <div
        className="image-editor-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Editor de imagen"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="image-editor__header">
          <h2 className="image-editor__title">
            Editar imagen{fileName ? ` — ${fileName}` : ""}
          </h2>
          <div className="image-editor__header-actions">
            <button type="button" className="btn btn--secondary image-editor__btn-sm" onClick={resetAll}>
              Restablecer
            </button>
            <button
              type="button"
              className="image-editor__close"
              onClick={onCancel}
              aria-label="Cerrar editor"
            >
              ×
            </button>
          </div>
        </header>

        <div className="image-editor__body">
          <div className="image-editor__canvas-wrap">
            <ImageEditorLivePreview
              previewSrc={resultPreviewUrl}
              loading={resultPreviewLoading}
              context={previewContext}
              recipeTitle={recipeTitle}
              showCoverTile={showCoverTile}
            />
            <div className="image-editor__cropper-area">
              {transformedUrl && !loadingTransform ? (
                <Cropper
                  image={transformedUrl}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspectValue}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid
                  restrictPosition
                  objectFit="contain"
                  style={{
                    containerStyle: { background: "#1a1a1a" },
                    mediaStyle: { filter: filterStyle, transition: "filter 0.05s linear" },
                  }}
                />
              ) : (
                <p className="image-editor__loading">Procesando imagen…</p>
              )}
            </div>
          </div>

          <aside className="image-editor__controls">
            <section className="image-editor__section">
              <p className="image-editor__section-title">Recorte</p>
              <div className="image-editor__chips">
                {ASPECTS.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    className={`image-editor__chip ${aspect === a.key ? "image-editor__chip--active" : ""}`}
                    onClick={() => setAspect(a.key)}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <label className="image-editor__slider-row">
                <span>Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
                <span className="image-editor__slider-value">{zoom.toFixed(2)}×</span>
              </label>
            </section>

            <section className="image-editor__section">
              <p className="image-editor__section-title">Orientación</p>
              <div className="image-editor__row-buttons">
                <button type="button" className="image-editor__btn" onClick={rotateLeft} title="Rotar 90° a la izquierda">
                  ↺ 90°
                </button>
                <button type="button" className="image-editor__btn" onClick={rotateRight} title="Rotar 90° a la derecha">
                  ↻ 90°
                </button>
                <button
                  type="button"
                  className={`image-editor__btn ${flipH ? "image-editor__btn--active" : ""}`}
                  onClick={toggleFlip}
                  title="Voltear horizontal"
                >
                  ⇄ Voltear
                </button>
              </div>
              <p className="image-editor__caption">
                Rotación actual: {rotation}°{flipH ? " · espejada" : ""}
              </p>
            </section>

            <section className="image-editor__section">
              <p className="image-editor__section-title">Ajustes</p>
              <SliderRow label="Brillo" value={brightness} min={50} max={150} onChange={setBrightness} onReset={() => setBrightness(100)} />
              <SliderRow label="Contraste" value={contrast} min={50} max={150} onChange={setContrast} onReset={() => setContrast(100)} />
              <SliderRow label="Saturación" value={saturation} min={0} max={200} onChange={setSaturation} onReset={() => setSaturation(100)} />
            </section>
          </aside>
        </div>

        <footer className="image-editor__footer">
          {errorMessage && (
            <p className="image-editor__error" role="alert">
              {errorMessage}
            </p>
          )}
          <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleApply}
            disabled={loadingTransform || saving}
          >
            {saving ? "Guardando…" : "Aplicar"}
          </button>
        </footer>
      </div>
    </ModalBackdrop>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
  onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  return (
    <label className="image-editor__slider-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="image-editor__slider-value">{value}</span>
      <button type="button" className="image-editor__slider-reset" onClick={onReset} title={`Restablecer ${label.toLowerCase()}`}>
        ↺
      </button>
    </label>
  );
}

// Build a temporary blob URL with the image already rotated/flipped.
async function renderTransformedBlobUrl(
  source: File | Blob,
  rotation: ImageEdits["rotation"],
  flipH: boolean,
): Promise<string> {
  const blob = await applyImageEdits(
    source,
    { ...NO_EDITS, rotation, flipH },
    { outputType: "image/png", maxLongEdge: 4096 },
  );
  return URL.createObjectURL(blob);
}
