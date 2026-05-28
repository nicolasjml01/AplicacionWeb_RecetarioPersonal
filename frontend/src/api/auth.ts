import type { AuthResponse, RegisterRequest, User } from "../types/auth";
import { setSession, clearSession } from "../auth/session";
import { apiFetch } from "./http";
import { API_BASE } from "../config/apiBase";

/** Login without Bearer token; stores session on success. */
export async function login(loginValue: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ login: loginValue, password }),
  });

  if (!res.ok) {
    const msg =
      res.status === 401
        ? "Usuario o contraseña incorrectos."
        : "Error al iniciar sesión.";
    throw new Error(msg);
  }

  const data = (await res.json()) as AuthResponse;
  setSession(data.user, data.accessToken);
  return data.user;
}

/** Register without Bearer token; stores session on success. */
export async function register(data: RegisterRequest): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let message = "Error al crear la cuenta.";
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // ignore non-JSON body
    }
    throw new Error(message);
  }

  const auth = (await res.json()) as AuthResponse;
  setSession(auth.user, auth.accessToken);
  return auth.user;
}

/** Validates stored token against GET /api/auth/me. */
export async function fetchCurrentUser(): Promise<User | null> {
  const res = await apiFetch("/api/auth/me");
  if (!res.ok) return null;
  return res.json() as Promise<User>;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore network errors on logout
  }
  clearSession();
}
