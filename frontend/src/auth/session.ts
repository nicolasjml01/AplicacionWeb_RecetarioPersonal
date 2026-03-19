import type { User } from '../types/auth';

const KEY = 'currentUser';

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function getCurrentUserId(): number | null {
  return getCurrentUser()?.id ?? null;
}