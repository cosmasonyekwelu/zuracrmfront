// src/pages/settings/RolesSharing.jsx
/**
 * Endpoints used:
 *   GET  /roles/policy              -> { permissionsByRole: { admin:{}, manager:{}, user:{}, read_only:{} } }
 *   PATCH /roles/policy             -> same shape (admin only)
 *   GET  /users                     -> [{_id,name,email,role,active}]
 *   PATCH /users/:id                -> { role } (admin only; with last-admin guard in backend)
 */
import { useEffect, useMemo, useRef, useState } from "react";
import API from "../../services/api";
import SettingsLayout from "./SettingsLayout.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const MODULES = ["Leads","Contacts","Accounts","Deals","Activities","Documents","Campaigns"];
const ROLES = ["admin","manager","user","read_only"];
const PERM_OPTIONS = [
  { value: "no", label: "No access" },
  { value: "ro", label: "Read" },
  { value: "rw", label: "Read & Write" },
];
const isAdmin = (r) => String(r||"").toLowerCase() === "admin";

const mkDefaultPolicy = () => {
  // sensible defaults: admin=rw, manager=rw, user=ro, read_only=no
  const base = {
    admin: {}, manager: {}, user: {}, read_only: {}
  };
  for (const m of MODULES) {
    base.admin[m] = "rw";
    base.manager[m] = "rw";
    base.user[m] = "ro";
    base.read_only[m] = "no";
  }
  return base;
};

export default function RolesSharing(){
  const { user: me } = useAuth() || {};
  const iAmAdmin = isAdmin(me?.role);

  // org policy
  const [policy, setPolicy] = useState({ permissionsByRole: mkDefaultPolicy() });
  // users
  const [users, setUsers] = useState([]);

  // ui state
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // /users detection to avoid 404
  const [usersBase, setUsersBase] = useState("/users");
  const [usersApiMissing, setUsersApiMissing] = useState(false);
  const loadOnceRef = useRef(false);

  const showOk = (t) => { setMsg(t); setErr(""); setTimeout(()=>setMsg(""), 1600); };
  const showErr = (t) => { setErr(t || "Something went wrong"); setMsg(""); };

  const detectUsersBase = async () => {
    const candidates = ["/users/users", "/users"];
    for (const b of candidates) {
      const r = await API.get(b, { validateStatus: () => true });
      if (r.status >= 200 && r.status < 300 && Array.isArray(r.data)) {
        setUsersBase(b);
        setUsersApiMissing(false);
        setUsers(r.data);
        return;
      }
    }
    setUsersApiMissing(true);
    setUsers([]);
  };

  const load = async ()=>{
    setBusy(true); setMsg(""); setErr("");
    try {
      const rPolicy = await API.get("/roles/policy", { validateStatus: () => true });
      if (rPolicy.status >= 200 && rPolicy.status < 300) {
        const p = rPolicy.data || {};
        // merge with defaults to keep inputs controlled
        const merged = mkDefaultPolicy();
        const src = p.permissionsByRole || {};
        for (const role of ROLES) {
          for (const mod of MODULES) {
            const v = src?.[role]?.[mod];
            merged[role][mod] = ["no","ro","rw"].includes(v) ? v : merged[role][mod];
          }
        }
        setPolicy({ permissionsByRole: merged });
      } else if (rPolicy.status === 404) {
        // backend route not mounted yet; use defaults and show banner
        setPolicy({ permissionsByRole: mkDefaultPolicy() });
        showErr("Roles policy API not found. Mount /roles/policy on the backend.");
      } else {
        showErr(rPolicy?.data?.error || "Failed to load roles policy");
      }
      await detectUsersBase();
    } finally {
      setBusy(false);
    }
  };

  useEffect(()=>{
    if (loadOnceRef.current) return;
    loadOnceRef.current = true;
    load().catch(()=>{});
  }, []);

  const setPerm = async (role, module, value)=>{
    if (!iAmAdmin) return showErr("Only Administrators can edit policy.");
    const next = structuredClone(policy);
    next.permissionsByRole[role][module] = value;

    // optimistic
    setPolicy(next);
    const r = await API.patch("/roles/policy", next, { validateStatus: () => true });
    if (!(r.status >= 200 && r.status < 300)) {
      // reload to rollback
      await load();
      showErr(r?.data?.error || "Failed to update policy");
    } else {
      showOk("Policy updated.");
    }
  };

  const changeUserRole = async (u, nextRole)=>{
    if (!iAmAdmin) return showErr("Only Administrators can change user roles.");
    if (!ROLES.includes(nextRole)) return showErr("Unknown role.");
    if (u._id === me?._id) {
      // allow self role change? safer to allow promoting? we'll block to avoid lockouts
      return showErr("You cannot change your own role.");
    }
    // optimistic
    const prev = u.role;
    setUsers(us => us.map(x => x._id===u._id ? { ...x, role: nextRole } : x));
    const r = await API.patch(`${usersBase}/${u._id}`, { role: nextRole }, { validateStatus: () => true });
    if (!(r.status >= 200 && r.status < 300)) {
      // rollback
      setUsers(us => us.map(x => x._id===u._id ? { ...x, role: prev } : x));
      showErr(r?.data?.error || "Failed to change role");
    } else {
      showOk("User role updated.");
    }
  };

  const adminsCount = useMemo(
    () => users.filter(u => isAdmin(u.role) && u.active !== false).length,
    [users]
  );

  return (
    <SettingsLayout>
      <h2 style={{margin:"6px 0 10px"}}>Roles & Sharing</h2>

      {usersApiMissing && (
        <div className="note err" style={{ marginBottom: 10 }}>
          Users API not found. Ensure your backend mounts <code>users.routes</code> correctly:
          <pre style={{ marginTop: 6 }}>
{`// users.routes.js defines r.get("/users", ...)
// so mount at root:
api.use("/", usersRoutes);   // yields /api/users`}
          </pre>
        </div>
      )}
      {(msg || err) && (
        <div className={`note ${err ? "err" : "ok"}`} style={{ marginBottom: 10 }}>
          {err || msg}
        </div>
      )}
      {!iAmAdmin && (
        <div className="note" style={{ marginBottom: 10 }}>
          You are not an Administrator. Viewing is allowed; changes are disabled.
        </div>
      )}

      {/* Policy matrix: modules × roles */}
      <div className="card shadow-lg" style={{overflowX:"auto", marginBottom:14}}>
        <table className="table">
          <thead>
            <tr>
              <th style={{minWidth:180}}>Module</th>
              {ROLES.map(r => <th key={r}>{r.replace("_"," ")}</th>)}
            </tr>
          </thead>
          <tbody>
            {MODULES.map(mod => (
              <tr key={mod}>
                <td style={{fontWeight:700}}>{mod}</td>
                {ROLES.map(role => {
                  const val = policy.permissionsByRole?.[role]?.[mod] ?? "no";
                  return (
                    <td key={role}>
                      <select
                        className="input"
                        value={val}
                        disabled={!iAmAdmin}
                        onChange={e => setPerm(role, mod, e.target.value)}
                      >
                        {PERM_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Assign users to built-in roles */}
      <div className="card shadow-lg">
        <h3 style={{margin:"0 0 10px"}}>Assign users to roles</h3>
        <table className="table">
          <thead><tr><th>User</th><th>Email</th><th>Role</th></tr></thead>
          <tbody>
            {users.map(u=>(
              <tr key={u._id}>
                <td>{u.name || "—"}</td>
                <td>{u.email}</td>
                <td>
                  <select
                    className="input"
                    value={u.role || "user"}
                    disabled={!iAmAdmin}
                    onChange={(e)=>{
                      // guard “last admin”
                      if (isAdmin(u.role) && !isAdmin(e.target.value) && adminsCount <= 1) {
                        e.target.value = u.role;
                        return showErr("Cannot demote the last Administrator.");
                      }
                      changeUserRole(u, e.target.value);
                    }}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r.replace("_"," ")}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!users.length && (
              <tr><td colSpan={3} style={{textAlign:"center", padding:16, color:"#64748b"}}>No users</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SettingsLayout>
  );
}
