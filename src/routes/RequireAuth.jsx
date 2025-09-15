import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function RequireAuth() {
  // consider a token "logged-in enough" to render protected pages
  const token = localStorage.getItem("auth.token");
  const authed = !!token;
  const loc = useLocation();

  return authed ? (
    <Outlet />
  ) : (
    <Navigate to="/signin" replace state={{ from: loc }} />
  );
}
