// src/pages/settings/CalendarBooking.jsx
/**
 * API
 *   GET   /calendar/settings -> { slug, days:["Mon","Tue",...], start:"09:00", end:"17:00", duration:30 }
 *   PATCH /calendar/settings -> same shape
 *
 * Notes
 * - If GET 404s (route not mounted), we show a clear banner + Retry.
 * - Client-side validation for slug/days/times/duration.
 * - Preview a few slots and expose public booking URL.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import API from "../../services/api";
import SettingsLayout from "./SettingsLayout.jsx";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULTS = { slug: "meet", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], start: "09:00", end: "17:00", duration: 30 };

const isHHMM = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ""));
const toMinutes = (hhmm) => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm || "");
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
};
const clampDuration = (n) => Math.max(5, Math.min(240, Number.isFinite(n) ? n : 30));
const normalizeSlug = (raw) =>
  String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(1, 49) || "meet"; // avoid empty/leading dash

export default function CalendarBooking() {
  const [state, setState] = useState(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [apiMissing, setApiMissing] = useState(false);
  const loadedOnceRef = useRef(false); // avoid double-fetch in StrictMode

  const bookingURL = useMemo(() => (state.slug ? `${window.location.origin}/book/${state.slug}` : ""), [state.slug]);
  const safeDays = useMemo(() => (Array.isArray(state.days) ? state.days.filter((d) => ALL_DAYS.includes(d)) : []), [state.days]);

  // tiny slot preview (first 3 slots)
  const previewSlots = useMemo(() => {
    if (!isHHMM(state.start) || !isHHMM(state.end)) return [];
    const startM = toMinutes(state.start);
    const endM = toMinutes(state.end);
    const dur = clampDuration(Number(state.duration));
    if (!(startM < endM)) return [];
    const out = [];
    for (let t = startM; t + dur <= endM && out.length < 3; t += dur) {
      const hh = String(Math.floor(t / 60)).padStart(2, "0");
      const mm = String(t % 60).padStart(2, "0");
      out.push(`${hh}:${mm}`);
    }
    return out;
  }, [state.start, state.end, state.duration]);

  const load = async () => {
    setErr(""); setMsg("");
    const r = await API.get("/calendar/settings", { validateStatus: () => true });
    if (r.status === 404) { // route not mounted or wrong path
      setApiMissing(true);
      return;
    }
    if (r.status >= 200 && r.status < 300) {
      const data = r.data || {};
      setState({
        slug: normalizeSlug(data.slug ?? DEFAULTS.slug),
        days: Array.isArray(data.days) && data.days.length ? data.days.filter((d) => ALL_DAYS.includes(d)) : DEFAULTS.days,
        start: isHHMM(data.start) ? data.start : DEFAULTS.start,
        end: isHHMM(data.end) ? data.end : DEFAULTS.end,
        duration: clampDuration(Number(data.duration)),
      });
      setApiMissing(false);
    } else {
      setErr(r?.data?.error || "Failed to load calendar settings.");
    }
  };

  useEffect(() => {
    if (loadedOnceRef.current) return;
    loadedOnceRef.current = true;
    load().catch(() => setErr("Failed to load calendar settings."));
  }, []);

  const toggleDay = (d) => {
    setState((v) => {
      const days = Array.isArray(v.days) ? v.days : [];
      return days.includes(d) ? { ...v, days: days.filter((x) => x !== d) } : { ...v, days: [...days, d] };
    });
  };

  const validate = (s) => {
    const errors = {};
    const slug = normalizeSlug(s.slug);
    const days = Array.isArray(s.days) ? s.days.filter((d) => ALL_DAYS.includes(d)) : [];
    const startOK = isHHMM(s.start);
    const endOK = isHHMM(s.end);
    const startM = startOK ? toMinutes(s.start) : NaN;
    const endM = endOK ? toMinutes(s.end) : NaN;
    const dur = clampDuration(Number(s.duration));

    if (!slug) errors.slug = "Slug is required (letters, numbers, hyphens).";
    if (!days.length) errors.days = "Pick at least one day.";
    if (!startOK) errors.start = "Start must be HH:MM (24h).";
    if (!endOK) errors.end = "End must be HH:MM (24h).";
    if (Number.isFinite(startM) && Number.isFinite(endM) && startM >= endM) errors.range = "End time must be after start time.";
    if (dur < 5 || dur > 240) errors.duration = "Duration must be 5–240 minutes.";

    return { errors, payload: { slug, days, start: s.start, end: s.end, duration: dur } };
  };

  const save = async (e) => {
    e?.preventDefault?.();
    setBusy(true); setErr(""); setMsg("");
    const { errors, payload } = validate(state);
    if (Object.keys(errors).length) {
      setErr(Object.values(errors)[0]);
      setBusy(false);
      return;
    }
    const r = await API.patch("/calendar/settings", payload, { validateStatus: () => true });
    if (r.status === 404) {
      setApiMissing(true);
      setErr("Calendar API not available. Ensure /calendar routes are mounted on the backend.");
    } else if (r.status === 409) {
      setErr(r.data?.error || "Slug already in use. Pick another.");
    } else if (r.status >= 200 && r.status < 300) {
      setMsg("Booking settings saved.");
      setTimeout(() => setMsg(""), 1500);
    } else {
      setErr(r?.data?.error || "Save failed.");
    }
    setBusy(false);
  };

  const resetDefaults = () => { setState(DEFAULTS); setErr(""); setMsg(""); };

  const copy = async () => {
    if (!bookingURL) return;
    try {
      await navigator.clipboard.writeText(bookingURL);
      setMsg("Link copied");
      setTimeout(() => setMsg(""), 1100);
    } catch {
      setErr("Copy failed");
      setTimeout(() => setErr(""), 1100);
    }
  };

  return (
    <SettingsLayout>
      <h2 style={{ margin: "6px 0 10px" }}>Calendar Booking</h2>

      {apiMissing && (
        <div className="note err" style={{ marginBottom: 10 }}>
          Calendar API not found (GET <code>/calendar/settings</code> returned 404).
          <div style={{ marginTop: 6 }}>
            Make sure you mount the routes on the backend:
            <pre style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
{`// server/src/routes/index.js
import calendarRoutes from "./calendar.routes.js";
r.use("/calendar", calendarRoutes);`}
            </pre>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn btn-outline" onClick={load}>Retry</button>
          </div>
        </div>
      )}

      {(msg || err) && (
        <div className={`note ${err ? "err" : "ok"}`} style={{ marginBottom: 10 }}>
          {err || msg}
        </div>
      )}

      <div className="card shadow-lg">
        <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
          <div className="row" style={{ alignItems: "flex-end", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Public booking link slug</label>
              <input
                className="input"
                placeholder="e.g. meet, demo, book-time"
                value={state.slug}
                onChange={(e) => setState((v) => ({ ...v, slug: normalizeSlug(e.target.value) }))}
              />
              {bookingURL && (
                <div className="row" style={{ marginTop: 8, gap: 8 }}>
                  <a className="btn btn-outline" href={bookingURL} target="_blank" rel="noreferrer">Preview Link</a>
                  <button className="btn btn-ghost" type="button" onClick={copy}>Copy link</button>
                </div>
              )}
            </div>
            <button className="btn btn-ghost" type="button" onClick={resetDefaults}>Reset defaults</button>
          </div>

          <div>
            <div className="pill pill--sky">Available days</div>
            <div className="chip-row" style={{ marginTop: 6, flexWrap: "wrap", gap: 8 }}>
              {ALL_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`chip ${safeDays.includes(d) ? "chip--emerald" : ""}`}
                  onClick={() => toggleDay(d)}
                  aria-pressed={safeDays.includes(d)}
                  title={safeDays.includes(d) ? "Click to remove" : "Click to add"}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="row" style={{ gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="label">Start</label>
              <input className="input" type="time" value={state.start} onChange={(e) => setState((v) => ({ ...v, start: e.target.value }))} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">End</label>
              <input className="input" type="time" value={state.end} onChange={(e) => setState((v) => ({ ...v, end: e.target.value }))} />
            </div>
            <div style={{ width: 220 }}>
              <label className="label">Duration (mins)</label>
              <input
                className="input"
                type="number"
                min={5}
                max={240}
                step={5}
                value={state.duration}
                onChange={(e) => setState((v) => ({ ...v, duration: clampDuration(Number(e.target.value)) }))}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="card" style={{ padding: 12, background: "#f8fafc" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Preview</div>
            <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
              <div>
                <div className="pill">Days</div>
                <div style={{ marginTop: 6 }}>{safeDays.length ? safeDays.join(", ") : "—"}</div>
              </div>
              <div>
                <div className="pill">Window</div>
                <div style={{ marginTop: 6 }}>
                  {state.start} – {state.end} ({clampDuration(Number(state.duration))} mins)
                </div>
              </div>
              <div>
                <div className="pill">First slots</div>
                <div style={{ marginTop: 6 }}>{previewSlots.length ? previewSlots.join(", ") : "—"}</div>
              </div>
            </div>
          </div>

          <div>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
}
