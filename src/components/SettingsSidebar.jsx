// src/components/SettingsSidebar.jsx
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCallback, useState } from "react";

export default function SettingsSidebar() {
  const { user, logout } = useAuth() || {};
  const [busy, setBusy] = useState(false);

  const logoutNow = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      // Clear client auth synchronously so guards read the correct state
      localStorage.removeItem("auth.token");
      if (typeof logout === "function") {
        await logout(); // best-effort server signout if implemented
      }
    } finally {
      // Hard redirect avoids any stale mounted route/effects
      window.location.replace("/signin");
    }
  }, [logout, busy]);

  const Sec = ({ label }) => (
    <div
      style={{
        opacity: 0.9,
        margin: "12px 0 6px",
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.08,
        fontWeight: 800,
      }}
    >
      {label}
    </div>
  );

  const Item = ({ to, label }) => (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
      style={{ display: "block" }}
      end
    >
      {label}
    </NavLink>
  );

  return (
    <aside className="sidebar settings-sidebar" role="complementary" aria-label="Settings">
      <div style={{ fontWeight: 800, marginBottom: 12, letterSpacing: 0.3 }}>Setup</div>

      <Sec label="General" />
      <Item to="/settings/personal" label="Personal Settings" />
      <Item to="/settings/users" label="Users" />
      <Item to="/settings/company" label="Company Settings" />
      <Item to="/settings/calendar" label="Calendar Booking" />

      <Sec label="Security Control" />
      <Item to="/settings/security" label="Security Policies" />
      <Item to="/settings/roles" label="Roles & Sharing" />
      <Item to="/settings/audit" label="Audit Log" />

      <Sec label="Channels" />
      <Item to="/settings/email" label="Email" />

      <Sec label="Session" />
      <Item to="/home" label="← Back to Home" />
      <button
        type="button"
        className="nav-link"
        onClick={logoutNow}
        disabled={busy}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: busy ? "not-allowed" : "pointer",
          color: "crimson",
          fontWeight: 600,
          marginTop: 6,
          opacity: busy ? 0.7 : 1,
        }}
      >
        {busy ? "Logging out…" : "Log out"}
      </button>

      {user?.role !== "admin" ? null : (
        <>
          <Sec label="Admin (you)" />
          <Item to="/settings/users" label="Manage Users" />
          <Item to="/settings/roles" label="Roles & Sharing" />
          <Item to="/settings/audit" label="Audit Log" />
        </>
      )}
    </aside>
  );
}
