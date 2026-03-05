import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registro } from '../api/auth'
import './Auth.css'

export default function NuevaCuenta() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState('')
  const [nombreUsuario, setNombreUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [correo, setCorreo] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const usuario = await registro(nombre, nombreUsuario, password, correo)
    if (usuario) {
      navigate('/verificar-cuenta', { state: { nombreUsuario } })
    } else {
      setError('Ya existe un usuario o correo con esos datos.')
    }
  }

  return (
    <div className="auth-card">
      <h1>Nueva cuenta</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Nombre
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </label>
        <label>
          Nombre de usuario
          <input
            type="text"
            value={nombreUsuario}
            onChange={(e) => setNombreUsuario(e.target.value)}
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label>
          Correo
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit">Crear cuenta</button>
        <p className="auth-link">
          <Link to="/login">Volver al inicio de sesión</Link>
        </p>
      </form>
    </div>
  )
}
