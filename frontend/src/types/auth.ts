/** User profile from auth endpoints (password never included). */
export interface User {
  id: number;
  name: string;
  lastName: string;
  username: string;
  email: string;
  verified: boolean;
}

/** Login/register response: profile + JWT for Authorization header. */
export interface AuthResponse {
  user: User;
  accessToken: string;
}

/** POST /api/auth/login body; login field accepts username or email. */
export interface LoginRequest {
  login: string;
  password: string;
}

/** POST /api/auth/register body. */
export interface RegisterRequest {
  name: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}
