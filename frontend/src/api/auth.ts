import type { User, RegisterRequest, LoginRequest } from "../types/auth";
import { API_BASE } from "../config/apiBase";

// Calls POST /api/auth/login. Throws on failure.
export async function login(login: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password } satisfies LoginRequest),
  });

  if (!res.ok) {
    const msg =
      res.status === 401
        ? "Username or password incorrect."
        : "Error logging in.";
    throw new Error(msg);
  }

  return res.json() as Promise<User>;
}

// Calls POST /api/auth/register. Throws with backend message on validation/duplicate error.
export async function register(data: RegisterRequest): Promise<User> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let message = "Error creating account.";
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // if the body is not JSON, we leave the default message
    }
    throw new Error(message);
  }

  return res.json() as Promise<User>;
}
