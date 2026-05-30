import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import { PasswordInput } from "../components/ui/PasswordInput";

export function Login() {
  const [loginValue, setLoginValue] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(loginValue, password);
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <img src="/logo.png" alt="Logo de la aplicación" className="auth-logo" />
      <h1 className="auth-title">Iniciar sesión</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="login">Correo o nombre de usuario</label>
          <input
            id="login"
            type="text"
            autoComplete="username"
            value={loginValue}
            onChange={(e) => setLoginValue(e.target.value)}
            className="form-input"
            required
          />
        </div>
        <PasswordInput
          id="password"
          label="Contraseña"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? "Iniciando sesión…" : "Iniciar sesión"}
        </button>
      </form>
      <p className="auth-footer">
        ¿No tienes cuenta?{" "}
        <Link to="/register" className="auth-link">
          Crear cuenta
        </Link>
      </p>
    </>
  );
}
