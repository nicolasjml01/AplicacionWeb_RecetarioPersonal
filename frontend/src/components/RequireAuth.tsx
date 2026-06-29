import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSession } from "../auth/session";

/** Redirects to /login when there is no stored JWT session. */
export function RequireAuth() {
  const location = useLocation();
  const session = getSession();
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
