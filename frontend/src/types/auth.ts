// What the backend returns when doing login or registration (without password)
export interface User {
    id: number;
    name: string;
    lastName: string;
    username: string;
    email: string;
    verified: boolean;
}
// What the frontend sends to the POST /api/auth/login endpoint
export interface LoginRequest {
    login: string;   // can be username or email
    password: string;
}
// What the frontend sends to the POST /api/auth/register endpoint
export interface RegisterRequest {
    name: string;
    lastName: string;
    username: string;
    email: string;
    password: string;
}