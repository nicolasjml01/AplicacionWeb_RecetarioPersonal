import type { User } from "../types/auth";

const USER_KEY = "currentUser";
const TOKEN_KEY = "accessToken";

/** In-memory session mirrored in localStorage for page reloads. */
export interface Session {
  user: User;
  accessToken: string;
}

export function getSession(): Session | null {
  const rawUser = localStorage.getItem(USER_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  if (!rawUser || !token) return null;
  try {
    const user = JSON.parse(rawUser) as User;
    if (!user?.id) return null;
    return { user, accessToken: token };
  } catch {
    return null;
  }
}

export function getCurrentUser(): User | null {
  return getSession()?.user ?? null;
}

export function getCurrentUserId(): number | null {
  return getCurrentUser()?.id ?? null;
}

export function getAccessToken(): string | null {
  return getSession()?.accessToken ?? null;
}

export function setSession(user: User, accessToken: string): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.setItem(TOKEN_KEY, accessToken);
}

export function clearSession(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}
