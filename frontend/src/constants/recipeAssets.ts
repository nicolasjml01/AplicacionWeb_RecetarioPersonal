const base = import.meta.env.BASE_URL || "/";
const normalizedBase = base.endsWith("/") ? base : `${base}/`;

/**
 * Fichero en `public/logoHome.png` — portada por defecto cuando la receta no tiene foto o vídeo.
 */
export const RECIPE_DEFAULT_COVER_PATH = `${normalizedBase}logoHome.png`;
