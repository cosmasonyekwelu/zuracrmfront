import { Navigate, Outlet } from "react-router-dom";

export default function PublicOnly() {
  const token = localStorage.getItem("auth.token");
  return token ? <Navigate to="/home" replace /> : <Outlet />;
}
