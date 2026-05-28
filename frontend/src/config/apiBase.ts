/**
 * API root URL.
 * - Dev without VITE_API_URL: empty → requests go to the Vite dev server, which proxies /api and /media to Spring.
 * - Dev/production with VITE_API_URL: direct backend (e.g. http://192.168.1.53:8080 from phone).
 */
export const API_BASE =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "" : "http://localhost:8080");
