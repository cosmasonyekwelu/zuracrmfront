// src/pages/Leads.jsx
/**
 * REST expected:
 * GET    /leads?search=&page=&limit= -> [{_id, firstName, lastName, email, phone, company, source, status}]
 * POST   /leads                       -> {firstName,lastName,email,phone,company,source,status}
 * PATCH  /leads/:id                   -> any of the above
 * DELETE /leads/:id
 */
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";

const STATUS = ["New", "Contacted", "Qualified", "Unqualified"];

const normalizePhone = (v = "") => v.replace(/[^\d+]/g, "");
const trimOrUndef = (v) => (v && String(v).trim() ? String(v).trim() : undefined);

export default function Leads() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    source: "Web",
    status: "New",
  });
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    const r = await API.get("/leads", { params: { search: q } });
    // thanks to our api.js, GET /leads returns an array for .map()
    setRows(r.data || []);
  };
  useEffect(() => {
    load().catch(() => {});
  }, []); // initial
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q]);

  const fullName = (l) => [l.firstName, l.lastName].filter(Boolean).join(" ");

  const startEdit = (row) => {
    setEditing(row._id);
    setForm({ ...row });
    setErr("");
  };

  const resetForm = () =>
    setForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      company: "",
      source: "Web",
      status: "New",
    });

  const cancel = () => {
    setEditing(null);
    resetForm();
    setErr("");
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr("");

    // Trim + normalize BEFORE validation
    const payload = {
      firstName: trimOrUndef(form.firstName) || "",
      lastName: trimOrUndef(form.lastName) || "",
      email: trimOrUndef(form.email),
      phone: trimOrUndef(form.phone) ? normalizePhone(form.phone) : undefined,
      company: trimOrUndef(form.company) || "",
      source: trimOrUndef(form.source) || "Web",
      status: form.status || "New",
    };

    // Minimal client-side validation to prevent 400s
    if (
      !payload.firstName &&
      !payload.lastName &&
      !payload.company &&
      !payload.email &&
      !payload.phone
    ) {
      setBusy(false);
      setErr("Please enter at least a name, company, email or phone.");
      return;
    }

    try {
      if (editing) {
        const { _id, ...body } = { ...form, ...payload };
        await API.patch(`/leads/${editing}`, body);
        setRows((rs) => rs.map((x) => (x._id === editing ? { ...x, ...body } : x)));
      } else {
        const r = await API.post("/leads", payload);
        setRows((rs) => [r.data, ...rs]);
      }
      cancel();
    } catch (e2) {
      setErr(e2?.message || "Failed to save lead");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this lead?")) return;
    await API.delete(`/leads/${id}`);
    setRows((rs) => rs.filter((x) => x._id !== id));
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (l) =>
        (fullName(l) || "").toLowerCase().includes(s) ||
        (l.email || "").toLowerCase().includes(s) ||
        (l.company || "").toLowerCase().includes(s)
    );
  }, [rows, q]);

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />

        <div className="container" style={{ padding: "8px 0" }}>
          <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Leads</h2>
            <span className="pill pill--sky">Total {filtered.length}</span>
          </div>

          {/* Add/Edit Card */}
          <div className="card shadow-lg" style={{ marginBottom: 14 }}>
            <form onSubmit={save} className="row" style={{ flexWrap: "wrap", gap: 10 }}>
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
                placeholder="Company"
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Source"
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              />
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {STATUS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>

              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Update lead" : "Add lead"}
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

          {/* Toolbar */}
          <div className="card shadow-lg" style={{ marginBottom: 14 }}>
            <div className="row" style={{ alignItems: "center" }}>
              <input
                className="input"
                placeholder="Search leads…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <a className="btn btn-outline" href="/setup/import">
                Import CSV
              </a>
            </div>
          </div>

          {/* Table */}
          <div className="card shadow-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th style={{ width: 170 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l._id}>
                    <td>
                      <strong>{fullName(l) || "—"}</strong>
                    </td>
                    <td>{l.company || "—"}</td>
                    <td>{l.email || "—"}</td>
                    <td>{l.phone || "—"}</td>
                    <td>
                      <span className="chip">{l.source || "—"}</span>
                    </td>
                    <td>
                      <select
                        className="input"
                        value={l.status || "New"}
                        onChange={async (e) => {
                          const status = e.target.value;
                          await API.patch(`/leads/${l._id}`, { status });
                          setRows((rs) => rs.map((x) => (x._id === l._id ? { ...x, status } : x)));
                        }}
                      >
                        {STATUS.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn btn-outline" onClick={() => startEdit(l)}>
                          Edit
                        </button>
                        <button className="btn btn-ghost" onClick={() => remove(l._id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                      No leads
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
