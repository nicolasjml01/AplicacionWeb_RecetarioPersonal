// Image edits modeled as plain data so we can keep them in the upload queue
// without rasterizing, and re-open the editor on previous values.

import type { CSSProperties } from "react";

export type ImageEdits = {
  // Crop in the rotated/flipped image space (pixels).
  crop: { x: number; y: number; width: number; height: number } | null;
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  // 100 = neutral.
  brightness: number;
  contrast: number;
  saturation: number;
};

export const NO_EDITS: ImageEdits = {
  crop: null,
  rotation: 0,
  flipH: false,
  brightness: 100,
  contrast: 100,
  saturation: 100,
};

// True when the edits would change the output and require re-rasterizing.
export function hasEdits(edits: ImageEdits): boolean {
  return (
    edits.crop != null ||
    edits.rotation !== 0 ||
    edits.flipH ||
    edits.brightness !== 100 ||
    edits.contrast !== 100 ||
    edits.saturation !== 100
  );
}

// Skip the editor for videos and formats the browser cannot decode.
export function isEditableImage(file: File): boolean {
  if (!file.type.startsWith("image/")) return false;
  if (file.type === "image/heic" || file.type === "image/heif") return false;
  return true;
}

type ApplyOptions = {
  maxLongEdge?: number;
  jpegQuality?: number;
  outputType?: "image/jpeg" | "image/png";
};

// Apply edits to the source and return a new Blob. Order matters so that crop
// coordinates from react-easy-crop line up with what the user saw:
//   1) Pre-render rotated/flipped image into an intermediate canvas.
//   2) Crop that canvas.
//   3) Downscale to maxLongEdge.
//   4) Draw with CSS filters for brightness/contrast/saturation.
export async function applyImageEdits(
  file: File | Blob,
  edits: ImageEdits,
  options: ApplyOptions = {},
): Promise<Blob> {
  const { maxLongEdge = 2048, jpegQuality = 0.92, outputType = "image/jpeg" } = options;

  const img = await loadImage(file);
  const transformed = renderTransformed(img, edits.rotation, edits.flipH);

  const src = edits.crop ?? {
    x: 0,
    y: 0,
    width: transformed.width,
    height: transformed.height,
  };

  let scale = 1;
  const longEdge = Math.max(src.width, src.height);
  if (longEdge > maxLongEdge) scale = maxLongEdge / longEdge;
  const outW = Math.max(1, Math.round(src.width * scale));
  const outH = Math.max(1, Math.round(src.height * scale));

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo de salida.");
  ctx.filter = `brightness(${edits.brightness}%) contrast(${edits.contrast}%) saturate(${edits.saturation}%)`;
  ctx.drawImage(transformed, src.x, src.y, src.width, src.height, 0, 0, outW, outH);

  return canvasToBlob(out, outputType, jpegQuality);
}

// Render the source rotated/flipped into its own canvas. 90/270 swap dims.
function renderTransformed(
  img: HTMLImageElement,
  rotation: ImageEdits["rotation"],
  flipH: boolean,
): HTMLCanvasElement {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const canvas = document.createElement("canvas");

  if (rotation === 90 || rotation === 270) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo intermedio.");

  ctx.translate(canvas.width / 2, canvas.height / 2);
  if (flipH) ctx.scale(-1, 1);
  if (rotation !== 0) ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -w / 2, -h / 2);

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Error exportando la imagen."))),
      type,
      quality,
    );
  });
}

function loadImage(source: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo cargar la imagen."));
    };
    img.src = url;
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = url;
  });
}

/** Small raster of the crop + filters — same pipeline as applyImageEdits (step 2–4). */
export async function renderCroppedPreviewBlob(
  transformedImageUrl: string,
  crop: ImageEdits["crop"],
  filters: Pick<ImageEdits, "brightness" | "contrast" | "saturation">,
  maxLongEdge = 220,
): Promise<Blob> {
  const img = await loadImageFromUrl(transformedImageUrl);
  const src = crop ?? {
    x: 0,
    y: 0,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };

  let scale = 1;
  const longEdge = Math.max(src.width, src.height);
  if (longEdge > maxLongEdge) scale = maxLongEdge / longEdge;
  const outW = Math.max(1, Math.round(src.width * scale));
  const outH = Math.max(1, Math.round(src.height * scale));

  const out = document.createElement("canvas");
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("No se pudo crear el lienzo de vista previa.");
  ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
  ctx.drawImage(img, src.x, src.y, src.width, src.height, 0, 0, outW, outH);

  return canvasToBlob(out, "image/jpeg", 0.88);
}

/** CSS filter for live preview of brightness/contrast/saturation edits. */
export function editsToFilter(edits: ImageEdits | null | undefined): CSSProperties | undefined {
  if (!edits) return undefined;
  const { brightness, contrast, saturation } = edits;
  if (brightness === 100 && contrast === 100 && saturation === 100) return undefined;
  return {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
  };
}
