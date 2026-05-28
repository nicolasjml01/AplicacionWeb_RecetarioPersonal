/**
 * API root URL.
 * - Empty string: same origin (Vite proxy in dev, nginx in Docker/VM).
 * - Set VITE_API_URL only when the browser must call the backend on another host (e.g. phone → LAN IP:8080).
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "";
