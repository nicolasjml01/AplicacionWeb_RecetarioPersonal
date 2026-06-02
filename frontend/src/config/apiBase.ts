/**
 * API root URL. Leave empty in .env so nginx proxies /api and /media (Docker / VM).
 * Set VITE_API_URL only if the browser must call another host explicitly.
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "";
