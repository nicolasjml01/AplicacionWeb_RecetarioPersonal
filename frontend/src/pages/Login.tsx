import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [idUsuario, setIdUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const usuario = await login(idUsuario, password)
    if (usuario) {
      navigate('/', { state: { usuario } })
    } else {
      setError('Usuario o contraseña incorrectos.')
    }
  }

  return (
    <div className="auth-card">
      <h1>Inicio de sesión</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Id usuario
          <input
            type="text"
            value={idUsuario}
            onChange={(e) => setIdUsuario(e.target.value)}
            required
            autoComplete="username"
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        <p className="auth-link">
          <a href="#olvidar">¿Olvidas contraseña?</a>
        </p>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit">Inicio</button>
        <p className="auth-link">
          <Link to="/nueva-cuenta">Nueva cuenta</Link>
        </p>
      </form>
    </div>
  )
}
