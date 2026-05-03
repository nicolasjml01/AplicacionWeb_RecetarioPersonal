const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

/** Resolves relative `/media/...` URLs from the API against the configured base. */
export function resolveMediaUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}
