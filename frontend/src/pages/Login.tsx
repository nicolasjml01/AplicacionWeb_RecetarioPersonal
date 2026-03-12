import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

export function Login() {
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginValue, password);
      navigate('/home', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <img src="/logo.png" alt="App logo" className="auth-logo" />
      <h1 className="auth-title">Log in</h1>
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="login">Email or username</label>
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
        <div className="form-group">
          <div className="form-label-row">
            <label htmlFor="password">Password</label>
            <Link to="/forgot-password" className="auth-link auth-link--small">Forgot password?</Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input"
            required
          />
        </div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>
      <p className="auth-footer">
        Don't have an account? <Link to="/register" className="auth-link">Create account</Link>
      </p>
    </>
  );
}