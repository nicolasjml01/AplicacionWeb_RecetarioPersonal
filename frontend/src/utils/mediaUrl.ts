import { API_BASE } from "../config/apiBase";

/** Blob/data URLs from file pickers — use as-is for upload previews. */
export function isLocalMediaUrl(url: string): boolean {
  const u = url.trim();
  return u.startsWith("blob:") || u.startsWith("data:");
}

/** Resolves relative `/media/...` URLs from the API against the configured base. */
export function resolveMediaUrl(url: string): string {
  if (isLocalMediaUrl(url) || url.startsWith("http://") || url.startsWith("https://")) {
    return url.trim();
  }
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}
