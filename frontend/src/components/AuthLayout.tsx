import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="auth-layout">
      <aside className="auth-layout__brand" aria-hidden="true">
        <img src="/logo.png" alt="" className="auth-layout__brand-logo" />
        <p className="auth-layout__brand-tagline">Tu recetario personal</p>
      </aside>
      <div className="auth-layout__card">
        <Outlet />
      </div>
    </div>
  );
}
