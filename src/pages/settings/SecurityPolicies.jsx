// src/pages/settings/SecurityPolicies.jsx
/**
 * API:
 *   GET  /security/policies -> { requireMfa, sessionTimeout, passwordMin, passwordRotationDays }
 *   PATCH /security/policies -> same shape
 */
import { useEffect, useRef, useState } from "react";
import API from "../../services/api";
import SettingsLayout from "./SettingsLayout.jsx";

const DEFAULTS = {
  requireMfa: false,
  sessionTimeout: 60,       // minutes
  passwordMin: 8,           // chars
  passwordRotationDays: 90, // 0 = disabled
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const asInt = (v, fallback) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

export default function SecurityPolicies(){
  const [p, setP] = useState(DEFAULTS);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [apiMissing, setApiMissing] = useState(false);
  const loadedOnceRef = useRef(false); // React StrictMode guard

  const mergeSafe = (data = {}) => ({
    requireMfa: typeof data.requireMfa === "boolean" ? data.requireMfa : false,
    sessionTimeout: Number.isFinite(+data.sessionTimeout)
      ? clamp(+data.sessionTimeout, 10, 1440)
      : DEFAULTS.sessionTimeout,
    passwordMin: Number.isFinite(+data.passwordMin)
      ? clamp(+data.passwordMin, 6, 128)
      : DEFAULTS.passwordMin,
    passwordRotationDays: Number.isFinite(+data.passwordRotationDays)
      ? clamp(+data.passwordRotationDays, 0, 3650)
      : DEFAULTS.passwordRotationDays,
  });

  useEffect(() => {
    if (loadedOnceRef.current) return;
    loadedOnceRef.current = true;
    (async () => {
      setErr(""); setMsg("");
      const r = await API.get("/security/policies", { validateStatus: () => true });
      if (r.status === 404) {
        setApiMissing(true);
        setP(DEFAULTS);
        return;
      }
      if (r.status >= 200 && r.status < 300) {
        setP(mergeSafe(r.data));
        setApiMissing(false);
      } else {
        setErr(r?.data?.error || "Failed to load security policies");
      }
    })();
  }, []);

  const onNumberChange = (key, min, max) => (e) => {
    // keep it controlled: never undefined
    const n = asInt(e.target.value, p[key]);
    setP(v => ({ ...v, [key]: clamp(n, min, max) }));
  };
  const onNumberBlur = (key, min, max) => () => {
    setP(v => ({ ...v, [key]: clamp(asInt(v[key], min), min, max) }));
  };

  const save = async (e)=>{
    e?.preventDefault?.();
    setBusy(true); setMsg(""); setErr("");

    // quick validation
    if (p.passwordMin < 6) { setErr("Password minimum length should be at least 6."); setBusy(false); return; }
    if (p.sessionTimeout < 10) { setErr("Session timeout must be 10 minutes or more."); setBusy(false); return; }
    if (p.passwordRotationDays < 0) { setErr("Password rotation cannot be negative."); setBusy(false); return; }

    try {
      const r = await API.patch("/security/policies", p, { validateStatus: () => true });
      if (r.status === 404) {
        setApiMissing(true);
        setErr("Security API not available. Ensure /security/policies is mounted on the backend.");
      } else if (r.status >= 200 && r.status < 300) {
        setP(mergeSafe(r.data));
        setMsg("Security policies updated.");
        setTimeout(() => setMsg(""), 1800);
      } else {
        setErr(r?.data?.error || "Save failed");
      }
    } catch (e2) {
      setErr(e2?.response?.data?.error || e2?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsLayout>
      <h2 style={{margin:"6px 0 10px"}}>Security Policies</h2>

      {apiMissing && (
        <div className="note err" style={{ marginBottom: 10 }}>
          Security API not found (GET <code>/security/policies</code> returned 404). Mount the backend routes at <code>/security</code>.
        </div>
      )}
      {(msg || err) && (
        <div className={`note ${err ? "err" : "ok"}`} style={{ marginBottom: 10 }}>
          {err || msg}
        </div>
      )}

      <div className="card shadow-lg" style={{display:"grid", gap:12}}>
        <label className="tiny">
          <input
            type="checkbox"
            checked={!!p.requireMfa}
            onChange={e=>setP(v=>({...v, requireMfa:e.target.checked}))}
          />
          Require multi-factor authentication (MFA) for all users
        </label>

        <div className="row">
          <div>
            <div className="eyebrow">Session timeout (mins)</div>
            <input
              className="input"
              type="number"
              min="10" max="1440" step="5"
              value={p.sessionTimeout}
              onChange={onNumberChange("sessionTimeout", 10, 1440)}
              onBlur={onNumberBlur("sessionTimeout", 10, 1440)}
            />
            <div className="hint">Users are signed out after inactivity.</div>
          </div>
          <div>
            <div className="eyebrow">Password min length</div>
            <input
              className="input"
              type="number"
              min="6" max="128"
              value={p.passwordMin}
              onChange={onNumberChange("passwordMin", 6, 128)}
              onBlur={onNumberBlur("passwordMin", 6, 128)}
            />
          </div>
          <div>
            <div className="eyebrow">Password rotation (days)</div>
            <input
              className="input"
              type="number"
              min="0" max="3650"
              value={p.passwordRotationDays}
              onChange={onNumberChange("passwordRotationDays", 0, 3650)}
              onBlur={onNumberBlur("passwordRotationDays", 0, 3650)}
            />
            <div className="hint">Set 0 to disable rotation.</div>
          </div>
        </div>

        <div>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
