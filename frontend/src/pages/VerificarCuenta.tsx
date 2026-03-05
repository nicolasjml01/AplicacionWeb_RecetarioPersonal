import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { verificar } from '../api/auth'
import './Auth.css'

export default function VerificarCuenta() {
  const navigate = useNavigate()
  const location = useLocation()
  const nombreUsuario = (location.state as { nombreUsuario?: string })?.nombreUsuario ?? ''
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const usuario = await verificar(nombreUsuario, codigo)
    if (usuario) {
      navigate('/', { state: { usuario } })
    } else {
      setError('Código incorrecto. Prueba con 123456 (dato de prueba).')
    }
  }

  return (
    <div className="auth-card">
      <h1>Verificar cuenta</h1>
      <p className="auth-hint">Usuario: <strong>{nombreUsuario || '—'}</strong></p>
      <form onSubmit={handleSubmit}>
        <label>
          Código de verificación
          <input
            type="text"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ej. 123456"
            required
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit">Inicio</button>
        <p className="auth-link">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </form>
    </div>
  )
}
