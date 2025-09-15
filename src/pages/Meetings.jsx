// src/pages/Meetings.jsx
/**
 * Server accepts either:
 *  - v1: { title, start, end, location, notes, attendees? }
 *  - v2: { title, when, durationMinutes, with, location, status, notes }
 * We send v2 only; your backend normalizer handles both.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import API from "../services/api";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";

const STATUS = ["Scheduled", "Completed", "Cancelled"];
const PAGE_SIZE = 10;

/* ---------------- Helpers ---------------- */

const toLocalDTInput = (d) => {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt)) return "";
  const pad = (x) => String(x).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const fmtWhen = (iso) => {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (isNaN(dt)) return "—";
  return dt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
};

const relativeFromNow = (iso) => {
  if (!iso) return "";
  const dt = new Date(iso);
  if (isNaN(dt)) return "";
  const diff = dt - Date.now(); // >0 future, <0 past
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const r = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (mins < 60) return r.format(Math.sign(diff) * mins, "minute");
  if (hours < 48) return r.format(Math.sign(diff) * hours, "hour");
  return r.format(Math.sign(diff) * days, "day");
};

const addMinutes = (d, m) => new Date(new Date(d).getTime() + (Number(m) || 0) * 60000);

function normalize(m) {
  const start = m.when || m.start || m.startAt;
  const end = m.end || m.endAt;
  const duration =
    m.durationMinutes != null
      ? m.durationMinutes
      : start && end
        ? Math.max(0, Math.round((new Date(end) - new Date(start)) / 60000))
        : 30;

  const withStr =
    m.with ||
    (Array.isArray(m.attendees)
      ? m.attendees.map((a) => a?.name || a?.email).filter(Boolean).join(", ")
      : "");

  return {
    _id: m._id,
    title: m.title || m.subject || "",
    when: start || null,
    durationMinutes: duration,
    with: withStr || "",
    location: m.location || "",
    status: m.status || "Scheduled",
    notes: m.notes || "",
  };
}

// ICS
function toICSDate(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return null;
  const pad = (x) => String(x).padStart(2, "0");
  return (
    dt.getUTCFullYear() +
    pad(dt.getUTCMonth() + 1) +
    pad(dt.getUTCDate()) +
    "T" +
    pad(dt.getUTCHours()) +
    pad(dt.getUTCMinutes()) +
    pad(dt.getUTCSeconds()) +
    "Z"
  );
}
const escapeICS = (s = "") =>
  String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
function icsOf(row) {
  const start = row.when;
  const end = row.durationMinutes ? addMinutes(row.when, row.durationMinutes) : null;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Zura CRM//Meetings//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${row._id || Math.random().toString(36).slice(2)}@zura`,
    `DTSTAMP:${toICSDate(new Date())}`,
    start ? `DTSTART:${toICSDate(start)}` : "",
    end ? `DTEND:${toICSDate(end)}` : "",
    `SUMMARY:${escapeICS(row.title || "Meeting")}`,
    row.location ? `LOCATION:${escapeICS(row.location)}` : "",
    row.notes ? `DESCRIPTION:${escapeICS(row.notes)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}
function download(filename, content, mime = "text/calendar") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ---------------- Component ---------------- */

const EMPTY = {
  title: "",
  whenLocal: "",
  durationMinutes: "30",
  withName: "",
  location: "",
  status: "Scheduled",
  notes: "",
};

export default function Meetings() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("when-asc");
  const [page, setPage] = useState(1);

  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [selected, setSelected] = useState(() => new Set());
  const typingRef = useRef(null);

  // Load
  const fetchMeetings = async (search) => {
    setErr("");
    const r = await API.get("/meetings", { params: { search }, validateStatus: () => true });
    if (r.status >= 200 && r.status < 300) {
      const list = Array.isArray(r.data) ? r.data : r.data?.items ?? [];
      setRows(list.map(normalize));
      setPage(1);
    } else {
      setErr(r?.data?.error || "Failed to load meetings.");
    }
  };

  useEffect(() => { fetchMeetings("").catch(() => setErr("Failed to load meetings.")); }, []);
  useEffect(() => {
    clearTimeout(typingRef.current);
    typingRef.current = setTimeout(() => { fetchMeetings(q).catch(() => {}); }, 300);
    return () => clearTimeout(typingRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // Derived
  const filteredSorted = useMemo(() => {
    let list = [...rows];
    if (statusFilter !== "All") list = list.filter((m) => (m.status || "Scheduled") === statusFilter);
    if (sortBy === "when-asc") list.sort((a, b) => new Date(a.when || 0) - new Date(b.when || 0));
    else if (sortBy === "when-desc") list.sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0));
    else list.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    return list;
  }, [rows, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const pageRows = filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  // Form
  const startEdit = (m) => {
    setEditing(m._id);
    setForm({
      title: m.title || "",
      whenLocal: toLocalDTInput(m.when),
      durationMinutes: m.durationMinutes == null ? "30" : String(m.durationMinutes),
      withName: m.with || "",
      location: m.location || "",
      status: m.status || "Scheduled",
      notes: m.notes || "",
    });
    setMsg("");
    setErr("");
  };

  const cancel = () => { setEditing(null); setForm(EMPTY); setMsg(""); setErr(""); };

  const validate = () => {
    if (!String(form.title || "").trim()) return "Title is required.";
    if (!form.whenLocal) return "When is required.";
    if (form.durationMinutes !== "" && Number.isNaN(Number(form.durationMinutes))) return "Duration must be a number.";
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) { setErr(problem); return; }
    setBusy(true); setErr(""); setMsg("");

    const whenIso = new Date(form.whenLocal).toISOString();
    const dur = form.durationMinutes === "" ? 30 : Number(form.durationMinutes || 30);

    const payload = {
      title: String(form.title || "").trim(),
      when: whenIso,
      durationMinutes: dur,
      with: String(form.withName || "").trim(),
      location: String(form.location || "").trim(),
      status: STATUS.includes(form.status) ? form.status : "Scheduled",
      notes: String(form.notes || "").trim(),
    };

    try {
      if (editing) {
        const id = editing;
        const optimistic = normalize({ _id: id, ...payload });
        const before = rows.find((x) => x._id === id);
        setRows((rs) => rs.map((x) => (x._id === id ? { ...x, ...optimistic } : x)));

        const r = await API.patch(`/meetings/${id}`, payload, { validateStatus: () => true });
        if (r.status >= 200 && r.status < 300) {
          const updated = normalize(r.data || { _id: id, ...payload });
          setRows((rs) => rs.map((x) => (x._id === id ? { ...x, ...updated } : x)));
          setMsg("Meeting updated.");
          cancel();
        } else {
          setRows((rs) => rs.map((x) => (x._id === id ? before : x)));
          throw new Error(r?.data?.error || "Update failed.");
        }
      } else {
        const r = await API.post("/meetings", payload, { validateStatus: () => true });
        if (r.status >= 200 && r.status < 300) {
          setRows((rs) => [normalize(r.data), ...rs]);
          setMsg("Meeting added.");
          cancel();
        } else {
          throw new Error(r?.data?.error || "Create failed.");
        }
      }
    } catch (e2) {
      setErr(e2.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  // Row actions
  const toggleSelect = (id, checked) => {
    setSelected((s) => {
      const next = new Set(s);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const remove = async (id) => {
    if (!confirm("Delete meeting?")) return;
    const old = rows;
    setRows((rs) => rs.filter((x) => x._id !== id));
    const r = await API.delete(`/meetings/${id}`, { validateStatus: () => true });
    if (!(r.status >= 200 && r.status < 300)) {
      setRows(old);
      alert(r?.data?.error || "Delete failed.");
    }
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} meeting(s)?`)) return;
    const ids = Array.from(selected);
    const old = rows;
    setRows((rs) => rs.filter((m) => !selected.has(m._id)));
    setSelected(new Set());
    try {
      for (const id of ids) {
        const r = await API.delete(`/meetings/${id}`, { validateStatus: () => true });
        if (r.status < 200 || r.status >= 300) throw new Error(r?.data?.error || "Delete failed.");
      }
    } catch (e) {
      setRows(old);
      alert(e.message || "Bulk delete failed.");
    }
  };

  const setStatus = async (m, status) => {
    const before = m.status || "Scheduled";
    setRows((rs) => rs.map((x) => (x._id === m._id ? { ...x, status } : x)));
    const r = await API.patch(`/meetings/${m._id}`, { status }, { validateStatus: () => true });
    if (r.status < 200 || r.status >= 300) {
      setRows((rs) => rs.map((x) => (x._id === m._id ? { ...x, status: before } : x)));
      alert(r?.data?.error || "Status update failed.");
    }
  };

  const exportICS = (m) => {
    if (!m.when) { alert("Meeting has no start time."); return; }
    const ics = icsOf(m);
    const safeTitle = (m.title || "meeting").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 40);
    download(`${safeTitle || "meeting"}.ics`, ics);
  };

  // Quick time helpers
  const nowLocal = () => toLocalDTInput(new Date());
  const plusLocal = (mins) => toLocalDTInput(addMinutes(new Date(), mins));

  /* ---------------- UI ---------------- */

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />

        <div className="container meetings" style={{ padding: "8px 0" }}>
          <div className="row" style={{ alignItems: "center", marginBottom: 10, gap: 10 }}>
            <h2 style={{ margin: 0 }}>Meetings</h2>
            <span className="pill pill--sky" style={{ marginLeft: "auto" }}>
              Total {filteredSorted.length}
            </span>
          </div>

          {/* Add/Edit */}
          <div className="card shadow-lg">
            {err && <div className="note err" style={{ marginBottom: 8 }}>{err}</div>}
            {msg && <div className="note ok"  style={{ marginBottom: 8 }}>{msg}</div>}

            <form onSubmit={submit} className="row form-wrap">
              <input className="input" placeholder="Title"
                     value={form.title}
                     onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />

              <div className="row input-combo">
                <input className="input" type="datetime-local" placeholder="When"
                       value={form.whenLocal}
                       onChange={(e) => setForm((f) => ({ ...f, whenLocal: e.target.value }))} />
                <div className="row quicks">
                  <button type="button" className="btn btn-ghost" onClick={() => setForm(f => ({ ...f, whenLocal: nowLocal() }))}>Now</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setForm(f => ({ ...f, whenLocal: plusLocal(30) }))}>+30m</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setForm(f => ({ ...f, whenLocal: plusLocal(60) }))}>+1h</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setForm(f => ({ ...f, whenLocal: plusLocal(1440) }))}>+1d</button>
                </div>
              </div>

              <div className="row input-combo">
                <input className="input" type="number" min="0" step="5" placeholder="Duration (mins)"
                       value={form.durationMinutes}
                       onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))} />
                <div className="tiny end-preview">
                  {form.whenLocal
                    ? `Ends ~ ${fmtWhen(addMinutes(form.whenLocal, Number(form.durationMinutes || 30)))}` : ""}
                </div>
              </div>

              <input className="input" placeholder="With (name or email)"
                     value={form.withName}
                     onChange={(e) => setForm((f) => ({ ...f, withName: e.target.value }))} />
              <input className="input" placeholder="Location / Link"
                     value={form.location}
                     onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />

              <select className="input" value={form.status}
                      onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <input className="input" placeholder="Notes"
                     value={form.notes}
                     onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />

              <div className="row" style={{ gap: 10 }}>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : editing ? "Save" : "Add meeting"}
                </button>
                {editing && (
                  <button type="button" className="btn btn-ghost" onClick={cancel}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Toolbar */}
          <div className="card shadow-lg toolbar">
            <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <input className="input" placeholder="Search meetings…" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                {["All", ...STATUS].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="when-asc">Sort: Date ↑</option>
                <option value="when-desc">Sort: Date ↓</option>
                <option value="title">Sort: Title</option>
              </select>

              {selected.size > 0 && (
                <div className="row" style={{ gap: 8, marginLeft: "auto" }}>
                  <div className="pill pill--amber">{selected.size} selected</div>
                  <button className="btn btn-outline" onClick={bulkDelete}>Delete selected</button>
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="card shadow-lg" style={{ overflowX: "auto" }}>
            <table className="table meetings-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r._id))}
                      onChange={(e) => {
                        const all = new Set(selected);
                        if (e.target.checked) pageRows.forEach((r) => all.add(r._id));
                        else pageRows.forEach((r) => all.delete(r._id));
                        setSelected(all);
                      }}
                    />
                  </th>
                  <th>Title</th>
                  <th>When</th>
                  <th className="hide-sm">With</th>
                  <th className="hide-md">Location</th>
                  <th>Status</th>
                  <th style={{ width: 260 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((m) => (
                  <tr key={m._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(m._id)}
                        onChange={(e) => toggleSelect(m._id, e.target.checked)}
                      />
                    </td>
                    <td style={{ fontWeight: 700 }}>{m.title || "—"}</td>
                    <td className="when">
                      {fmtWhen(m.when)}{" "}
                      <span className="tiny muted">
                        {relativeFromNow(m.when)}
                      </span>
                    </td>
                    <td className="hide-sm">{m.with || "—"}</td>
                    <td className="hide-md">{m.location || "—"}</td>
                    <td>
                      <select className="input" value={m.status || "Scheduled"} onChange={(e) => setStatus(m, e.target.value)}>
                        {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                        <button className="btn btn-outline" onClick={() => startEdit(m)}>Edit</button>
                        <button className="btn btn-ghost" onClick={() => remove(m._id)}>Delete</button>
                        <button className="btn btn-outline" onClick={() => exportICS(m)} title="Download .ics">ICS</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                      No meetings
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="row" style={{ alignItems: "center", justifyContent: "center", gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              Prev
            </button>
            <div className="pill">{page} / {totalPages}</div>
            <button className="btn btn-ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Next
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
