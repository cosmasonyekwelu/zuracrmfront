// src/pages/Contacts.jsx
/**
 * GET    /contacts?search=  -> [{_id, firstName,lastName,email,phone,title}]
 * POST   /contacts
 * PATCH  /contacts/:id
 * DELETE /contacts/:id
 */
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";

const DEFAULT_CONTACT = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  title: "",
};

const toForm = (row = {}) =>
  Object.fromEntries(
    Object.entries(DEFAULT_CONTACT).map(([k, v]) => [k, row[k] ?? v])
  );

const normalizePhone = (v = "") => v.replace(/[^\d+]/g, "");
const trim = (v) => (typeof v === "string" ? v.trim() : v);

export default function Contacts() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(DEFAULT_CONTACT);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    const r = await API.get("/contacts", { params: { search: q } });
    setRows(Array.isArray(r.data?.items) ? r.data.items : (Array.isArray(r.data) ? r.data : []));
  };
  useEffect(() => {
    load().catch(() => {});
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q]);

  const fullName = (c) => [c.firstName, c.lastName].filter(Boolean).join(" ");

  const startEdit = (row) => {
    setEditing(row._id);
    setForm(toForm(row)); // ensure all fields are strings (controlled inputs)
    setErr("");
  };

  const resetForm = () => setForm(DEFAULT_CONTACT);
  const cancel = () => {
    setEditing(null);
    resetForm();
    setErr("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");

    const payload = {
      firstName: trim(form.firstName) || "",
      lastName: trim(form.lastName) || "",
      email: trim(form.email) || undefined,
      phone: trim(form.phone) ? normalizePhone(form.phone) : undefined,
      title: trim(form.title) || "",
    };

    try {
      if (editing) {
        const { _id, ...body } = { ...form, ...payload };
        await API.patch(`/contacts/${editing}`, body);
        setRows((rs) => rs.map((x) => (x._id === editing ? { ...x, ...body } : x)));
      } else {
        const r = await API.post("/contacts", payload);
        const item = r.data?.item || r.data; // support both {item} and raw doc
        setRows((rs) => [item, ...rs]);
      }
      cancel();
    } catch (e2) {
      setErr(e2?.response?.data?.message || e2?.message || "Failed to save contact");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete contact?")) return;
    await API.delete(`/contacts/${id}`);
    setRows((rs) => rs.filter((x) => x._id !== id));
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((c) => {
      const name = (fullName(c) || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      const title = (c.title || "").toLowerCase();
      return name.includes(s) || email.includes(s) || phone.includes(s) || title.includes(s);
    });
  }, [q, rows]);

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />
        <div className="container" style={{ padding: "8px 0" }}>
          <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Contacts</h2>
            <span className="pill pill--sky">Total {filtered.length}</span>
          </div>

          <div className="card shadow-lg" style={{ marginBottom: 14 }}>
            <form onSubmit={submit} className="row" style={{ flexWrap: "wrap", gap: 10 }}>
              <input
                className="input"
                placeholder="First name"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Last name"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
              <input
                className="input"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save" : "Add contact"}
                </button>
                {editing && (
                  <button type="button" className="btn btn-ghost" onClick={cancel}>
                    Cancel
                  </button>
                )}
              </div>
              {err && (
                <div className="note err" style={{ marginTop: 6 }}>
                  {err}
                </div>
              )}
            </form>
          </div>

          <div className="card shadow-lg">
            <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
              <input
                className="input"
                placeholder="Search contacts…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Title</th>
                  <th style={{ width: 150 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong>{fullName(c) || "—"}</strong>
                    </td>
                    <td>{c.email || "—"}</td>
                    <td>{c.phone || "—"}</td>
                    <td>{c.title || "—"}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn btn-outline" onClick={() => startEdit(c)}>
                          Edit
                        </button>
                        <button className="btn btn-ghost" onClick={() => remove(c._id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                      No contacts
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
