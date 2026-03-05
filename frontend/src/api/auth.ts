/**
 * Cliente de la API de autenticación (backend Spring).
 * Base URL: donde corre tu backend (por defecto puerto 8080).
 */
const API_BASE = 'http://localhost:8080/api/auth'

export interface UsuarioDto {
  id: number
  nombre: string
  nombreUsuario: string
  correo: string
  verificado: boolean
}

export async function login(idUsuario: string, password: string): Promise<UsuarioDto | null> {
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idUsuario, password }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function registro(
  nombre: string,
  nombreUsuario: string,
  password: string,
  correo: string
): Promise<UsuarioDto | null> {
  const res = await fetch(`${API_BASE}/registro`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, nombreUsuario, password, correo }),
  })
  if (!res.ok) return null
  return res.json()
}

export async function verificar(nombreUsuario: string, codigo: string): Promise<UsuarioDto | null> {
  const res = await fetch(`${API_BASE}/verificar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombreUsuario, codigo }),
  })
  if (!res.ok) return null
  return res.json()
}
