import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import type { UsuarioDto } from './api/auth'
import Login from './pages/Login'
import NuevaCuenta from './pages/NuevaCuenta'
import VerificarCuenta from './pages/VerificarCuenta'
import './App.css'

function Inicio() {
  const location = useLocation()
  const usuario = (location.state as { usuario?: UsuarioDto })?.usuario

  return (
    <div className="app">
      <header className="app-header">
        <h1>Recetario Personal</h1>
        <p>Gestiona tus recetas y planifica tus menús semanales</p>
        {usuario ? (
          <p className="welcome">Bienvenido, <strong>{usuario.nombre}</strong> ({usuario.nombreUsuario})</p>
        ) : (
          <p>
            <Link to="/login">Iniciar sesión</Link>
            {' · '}
            <Link to="/nueva-cuenta">Nueva cuenta</Link>
          </p>
        )}
      </header>
      <main className="app-main">
        <section>
          <h2>Tus recetas</h2>
          <p>Aquí podrás crear, organizar y consultar tus recetas personales.</p>
        </section>
        <section>
          <h2>Planificación de menús</h2>
          <p>Más adelante añadiremos un calendario semanal y la lista de la compra.</p>
        </section>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/login" element={<Login />} />
        <Route path="/nueva-cuenta" element={<NuevaCuenta />} />
        <Route path="/verificar-cuenta" element={<VerificarCuenta />} />
      </Routes>
    </BrowserRouter>
  )
}
