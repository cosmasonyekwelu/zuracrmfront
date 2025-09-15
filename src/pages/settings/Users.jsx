// src/pages/settings/users.jsx
/**
 * Backend (one of two mount styles is active):
 *   A) Mount at "/users" AND routes define "/" inside  => real path: /api/users
 *   B) Mount at "/" AND routes define "/users" inside  => real path: /api/users
 *   C) (buggy) Mount at "/users" AND routes define "/users" => real path: /api/users/users
 *
 * This UI auto-detects the working base (tries "/users/users" first, then "/users").
 */
import { useEffect, useMemo, useRef, useState } from "react";
import API from "../../services/api";
import SettingsLayout from "./SettingsLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const ROLES = [
  { value: "user", label: "User" },
  { value: "read_only", label: "Read-only" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Administrator" },
];
const isAdminRole = (r) => String(r || "").toLowerCase() === "admin";

export default function UsersSettings() {
  const { user: me } = useAuth() || {};
  const meId = me?._id || me?.id || null;
  const iAmAdmin = isAdminRole(me?.role);

  const [base, setBase] = useState("/users");      // detected API base for users
  const probedRef = useRef(false);                 // StrictMode guard

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [inviteForm, setInviteForm] = useState({ email: "", role: "user" });
  const [inviteBusy, setInviteBusy] = useState(false);

  const [rowBusy, setRowBusy] = useState({});
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [apiWarning, setApiWarning] = useState(""); // shown if neither base works

  const setRowLoading = (id, v) => setRowBusy((m) => ({ ...m, [id]: !!v }));
  const showOk = (t) => { setMsg(t); setErr(""); setTimeout(() => setMsg(""), 1800); };
  const showErr = (t) => { setErr(t || "Something went wrong"); setMsg(""); };

  // ---- base detection: try "/users/users" first, then "/users"
  const detectBase = async () => {
    if (probedRef.current) return;
    probedRef.current = true;

    const candidates = ["/users/users", "/users"];
    for (const b of candidates) {
      const r = await API.get(b, { validateStatus: () => true });
      const data = Array.isArray(r.data) ? r.data : r.data?.items;
      if (r.status >= 200 && r.status < 300 && Array.isArray(data)) {
        setBase(b);
        setUsers(data);
        setApiWarning("");
        return;
      }
    }
    setApiWarning(
      "Users API not found. Ensure either: (1) api.use('/', usersRoutes) with r.get('/users', ...) OR (2) api.use('/users', usersRoutes) with r.get('/', ...)."
    );
  };

  const loadUsers = async () => {
    const r = await API.get(base, { validateStatus: () => true });
    if (r.status >= 200 && r.status < 300) {
      const arr = Array.isArray(r.data) ? r.data : (r.data?.items || []);
      setUsers(arr);
    } else {
      setErr(r?.data?.error || "Failed to load users");
    }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(""); setMsg("");
      await detectBase();
      setLoading(false);
    })();
  }, []);

  // ---- derived
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter(u =>
      (u.name || "").toLowerCase().includes(s) ||
      (u.email || "").toLowerCase().includes(s) ||
      (u.role || "").toLowerCase().includes(s)
    );
  }, [q, users]);

  const adminCount = useMemo(
    () => users.filter(u => isAdminRole(u.role) && u.active !== false).length,
    [users]
  );

  // ---- actions
  const invite = async (e) => {
    e.preventDefault();
    if (!base) return;
    setInviteBusy(true); setMsg(""); setErr("");
    try {
      const email = String(inviteForm.email || "").trim();
      if (!/\S+@\S+\.\S+/.test(email)) throw new Error("Enter a valid email address.");
      const role = iAmAdmin ? inviteForm.role : "user";
      const r = await API.post(`${base}/invite`, { email, role }, { validateStatus: () => true });
      if (r.status >= 200 && r.status < 300) {
        setInviteForm({ email: "", role });
        showOk("Invitation sent.");
        await loadUsers();
      } else {
        showErr(r?.data?.error || "Failed to invite");
      }
    } catch (e2) {
      showErr(e2?.message || "Failed to invite");
    } finally {
      setInviteBusy(false);
    }
  };

  const toggleActive = async (u) => {
    setMsg(""); setErr("");
    if (!iAmAdmin) return showErr("Only an Administrator can suspend or activate users.");
    if (!u || !u._id) return;
    if (u._id === meId) return showErr("You cannot change your own active status.");
    if (isAdminRole(u.role) && u.active !== false && adminCount <= 1) {
      return showErr("Cannot suspend the last Administrator.");
    }

    const next = !(u.active !== false);
    const prev = u.active !== false;
    setRowLoading(u._id, true);
    setUsers(ls => ls.map(x => x._id === u._id ? { ...x, active: next } : x));
    try {
      const r = await API.patch(`${base}/${u._id}`, { active: next }, { validateStatus: () => true });
      if (r.status >= 200 && r.status < 300) {
        showOk(next ? "User activated." : "User suspended.");
      } else {
        // rollback
        setUsers(ls => ls.map(x => x._id === u._id ? { ...x, active: prev } : x));
        showErr(r?.data?.error || "Failed to update status");
      }
    } finally {
      setRowLoading(u._id, false);
    }
  };

  const changeRole = async (u, nextRole) => {
    setMsg(""); setErr("");
    if (!iAmAdmin) return showErr("Only an Administrator can change roles.");
    if (!u || !u._id) return;
    if (u._id === meId) return showErr("You cannot change your own role.");
    if (!ROLES.some(r => r.value === nextRole)) return showErr("Unknown role.");
    if (isAdminRole(u.role) && !isAdminRole(nextRole) && adminCount <= 1) {
      return showErr("Cannot demote the last Administrator.");
    }
    if (!window.confirm(`Change role for ${u.name || u.email} from ${u.role} → ${nextRole}?`)) return;

    const prev = u.role;
    setRowLoading(u._id, true);
    setUsers(ls => ls.map(x => x._id === u._id ? { ...x, role: nextRole } : x));
    try {
      const r = await API.patch(`${base}/${u._id}`, { role: nextRole }, { validateStatus: () => true });
      if (r.status >= 200 && r.status < 300) {
        showOk("Role updated.");
      } else {
        setUsers(ls => ls.map(x => x._id === u._id ? { ...x, role: prev } : x));
        showErr(r?.data?.error || "Failed to change role");
      }
    } finally {
      setRowLoading(u._id, false);
    }
  };

  const removeUser = async (u) => {
    setMsg(""); setErr("");
    if (!iAmAdmin) return showErr("Only an Administrator can remove users.");
    if (!u || !u._id) return;
    if (u._id === meId) return showErr("You cannot remove yourself.");
    if (isAdminRole(u.role) && adminCount <= 1) {
      return showErr("Cannot remove the last Administrator.");
    }
    if (!window.confirm(`Remove ${u.name || u.email}?`)) return;

    setRowLoading(u._id, true);
    try {
      const r = await API.delete(`${base}/${u._id}`, { validateStatus: () => true });
      if (r.status >= 200 && r.status < 300) {
        setUsers(ls => ls.filter(x => x._id !== u._id));
        showOk("User removed.");
      } else {
        showErr(r?.data?.error || "Failed to remove user");
      }
    } finally {
      setRowLoading(u._id, false);
    }
  };

  // ---- UI
  return (
    <SettingsLayout>
      <h2 style={{ margin: "6px 0 10px" }}>Users</h2>

      {apiWarning && (
        <div className="note err" style={{ marginBottom: 10 }}>
          {apiWarning}
        </div>
      )}
      {(msg || err) && (
        <div className={`note ${err ? "err" : "ok"}`} style={{ marginBottom: 10 }}>
          {err || msg}
        </div>
      )}

      {/* Invite */}
      <div className="card shadow-lg" style={{ marginBottom: 14 }}>
        <form onSubmit={invite} className="row" style={{ alignItems: "center", gap: 10 }}>
          <input
            className="input"
            type="email"
            placeholder="Invite by email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
            required
          />
          <select
            className="input"
            value={inviteForm.role}
            onChange={(e) => setInviteForm(f => ({ ...f, role: e.target.value }))}
            disabled={!iAmAdmin}
            title={iAmAdmin ? "Select role for invite" : "Only Administrators can set invite role"}
          >
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button className="btn btn-primary" disabled={inviteBusy}>
            {inviteBusy ? "Sending…" : "Send invite"}
          </button>
        </form>
      </div>

      {/* Users table */}
      <div className="card shadow-lg">
        <div className="row" style={{ alignItems: "center" }}>
          <input className="input" placeholder="Search users" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="pill pill--sky">Total: {filtered.length}</div>
          <div className="pill">{`Admins: ${users.filter(u => isAdminRole(u.role) && u.active !== false).length}`}</div>
        </div>

        {loading ? (
          <div style={{ padding: 20, color: "#64748b" }}>Loading…</div>
        ) : (
          <table className="table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ width: 220 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const myRowBusy = !!rowBusy[u._id];
                const canEditRole = iAmAdmin && u._id !== meId;
                const active = u.active !== false;

                return (
                  <tr key={u._id}>
                    <td style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={u.name || u.email} size={36} />
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <div style={{ fontWeight: 700 }}>{u.name || "—"}</div>
                      </div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <select
                        className="input"
                        value={u.role || "user"}
                        onChange={(e) => changeRole(u, e.target.value)}
                        disabled={!canEditRole || myRowBusy}
                        title={canEditRole ? "Change role (Admin only)" : (u._id === meId ? "You cannot change your own role" : "Only Administrators can change roles")}
                      >
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <span className={`chip ${active ? "chip--emerald" : "chip--rose"}`}>
                        {active ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <button
                          className="btn btn-outline"
                          onClick={() => toggleActive(u)}
                          disabled={myRowBusy || !iAmAdmin}
                          title={iAmAdmin ? "" : "Only Administrators can suspend/activate users"}
                        >
                          {active ? "Suspend" : "Activate"}
                        </button>
                        <button
                          className="btn btn-ghost"
                          onClick={() => removeUser(u)}
                          disabled={myRowBusy || !iAmAdmin}
                          title={iAmAdmin ? "" : "Only Administrators can remove users"}
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                    No users
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </SettingsLayout>
  );
}
