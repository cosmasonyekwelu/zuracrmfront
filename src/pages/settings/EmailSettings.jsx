// src/pages/settings/EmailSettings.jsx
/**
 * GET  /email/settings -> { provider:'imap'|'gmail', imap:{host,port,secure,user,password?}, fromName, fromEmail, gmail?:{connected:boolean, accountEmail?:string} }
 * PATCH /email/settings -> same (omit imap.password if unchanged)
 * POST /email/test     -> { to }
 *
 * Defaults:
 * - Provider: IMAP/SMTP with Zoho preset
 * - From name/email: current user's name/email
 * - Added "Server preset" with "Zoho" and "cPanel / Custom Domain"
 */
import { useEffect, useMemo, useState } from "react";
import API from "../../services/api";
import SettingsLayout from "./SettingsLayout.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const SECRET_PLACEHOLDER = "••••••••";

// initial IMAP/SMTP defaults = Zoho
const DEFAULTS = {
  provider: "imap",
  fromName: "",
  fromEmail: "",
  imap: { host: "smtp.zoho.com", port: 465, secure: true, user: "", password: "" },
  gmail: { connected: false, accountEmail: "" },
};

// Presets just help fill the IMAP/SMTP fields (not stored)
const PRESETS = [
  {
    id: "zoho",
    label: "Zoho (smtp.zoho.com:465 SSL)",
    getConfig: () => ({ host: "smtp.zoho.com", port: 465, secure: true }),
    hint:
      "Zoho SMTP: smtp.zoho.com, port 465 (SSL). IMAP (incoming): imap.zoho.com:993 (SSL).",
  },
  {
    id: "cpanel",
    label: "cPanel / Custom Domain (mail.yourdomain.com)",
    getConfig: (fromEmail) => {
      const domain = String(fromEmail || "").split("@")[1] || "yourdomain.com";
      return { host: `mail.${domain}`, port: 465, secure: true };
    },
    hint:
      "Common cPanel setup: mail.yourdomain.com, port 465 (SSL) or 587 (STARTTLS). Check with your host.",
  },
];

const isEmail = (s) => !!String(s || "").toLowerCase().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);

export default function EmailSettings() {
  const { user } = useAuth();
  const [cfg, setCfg] = useState(DEFAULTS);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [passwordDirty, setPasswordDirty] = useState(false);

  // Track if user edited fromName/fromEmail so we don't overwrite with auth defaults after
  const [touchedFromName, setTouchedFromName] = useState(false);
  const [touchedFromEmail, setTouchedFromEmail] = useState(false);

  // UI-only preset state
  const [preset, setPreset] = useState("zoho");

  // Load settings
  useEffect(() => {
    let mounted = true;
    API.get("/email/settings")
      .then((r) => {
        if (!mounted) return;
        const incoming = r.data || {};
        const next = {
          ...DEFAULTS,
          ...incoming,
          imap: { ...DEFAULTS.imap, ...(incoming.imap || {}) },
          gmail: { ...DEFAULTS.gmail, ...(incoming.gmail || {}) },
        };

        // If server already has a secret, render placeholder, but don't mark as dirty
        if (incoming?.imap?.password) {
          next.imap.password = SECRET_PLACEHOLDER;
          setPasswordDirty(false);
        }

        // Apply auth defaults if empty
        if (!next.fromName && user?.name) next.fromName = user.name;
        if (!next.fromEmail && user?.email) next.fromEmail = user.email;

        setCfg(next);
      })
      .catch(() => setErr("Could not load email settings."));
    return () => (mounted = false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If user arrives later (e.g., context loads after page) and fields are still empty, default to user
  useEffect(() => {
    setCfg((c) => {
      const updated = { ...c };
      if (!touchedFromName && !updated.fromName && user?.name) updated.fromName = user.name;
      if (!touchedFromEmail && !updated.fromEmail && user?.email) updated.fromEmail = user.email;
      return updated;
    });
  }, [user, touchedFromEmail, touchedFromName]);

  // Validation
  const problems = useMemo(() => {
    const issues = [];
    if (!cfg.fromName) issues.push("From name is required.");
    if (!isEmail(cfg.fromEmail)) issues.push("From email looks invalid.");
    if (cfg.provider === "imap") {
      if (!cfg.imap.host) issues.push("SMTP host is required.");
      const p = Number(cfg.imap.port);
      if (!p || p < 1 || p > 65535) issues.push("SMTP port must be 1–65535.");
      if (!cfg.imap.user) issues.push("SMTP username is required.");
      if (passwordDirty && !cfg.imap.password) issues.push("SMTP password is required.");
    }
    return issues;
  }, [cfg, passwordDirty]);

  // Preset handlers (IMAP only)
  const applyPreset = (id) => {
    setPreset(id);
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    const { host, port, secure } = p.getConfig(cfg.fromEmail);
    setCfg((c) => ({ ...c, imap: { ...c.imap, host, port, secure } }));
    setMsg(""); setErr("");
  };

  const detectFromFromEmail = () => {
    const p = PRESETS.find((x) => x.id === "cpanel");
    if (!p) return;
    const { host, port, secure } = p.getConfig(cfg.fromEmail);
    setCfg((c) => ({ ...c, imap: { ...c.imap, host, port, secure } }));
  };

  // Change handlers
  const onChangeProvider = (provider) => {
    setCfg((c) => ({ ...c, provider }));
    setMsg(""); setErr("");
  };

  const onChangeImapField = (key, value) => {
    setCfg((c) => ({ ...c, imap: { ...c.imap, [key]: value } }));
    setMsg(""); setErr("");
  };

  const onChangePassword = (value) => {
    setPasswordDirty(value !== SECRET_PLACEHOLDER);
    setCfg((c) => ({ ...c, imap: { ...c.imap, password: value } }));
  };

  // Save
  const save = async () => {
    setSaving(true); setMsg(""); setErr("");
    const payload = {
      provider: cfg.provider,
      fromName: cfg.fromName,
      fromEmail: cfg.fromEmail,
    };
    if (cfg.provider === "imap") {
      payload.imap = {
        host: cfg.imap.host,
        port: Number(cfg.imap.port) || 0,
        secure: !!cfg.imap.secure,
        user: cfg.imap.user,
        ...(passwordDirty ? { password: cfg.imap.password } : {}),
      };
    }
    try {
      const r = await API.patch("/email/settings", payload, { validateStatus: () => true });
      if (r.status >= 200 && r.status < 300) {
        setMsg("Email settings saved.");
        // reload to restore placeholder if server stored a secret
        try {
          const fresh = await API.get("/email/settings");
          const incoming = fresh.data || {};
          const next = {
            ...DEFAULTS,
            ...incoming,
            imap: { ...DEFAULTS.imap, ...(incoming.imap || {}) },
            gmail: { ...DEFAULTS.gmail, ...(incoming.gmail || {}) },
          };
          if (incoming?.imap?.password) {
            next.imap.password = SECRET_PLACEHOLDER;
            setPasswordDirty(false);
          }
          // keep user defaults if still blank
          if (!next.fromName && user?.name) next.fromName = user.name;
          if (!next.fromEmail && user?.email) next.fromEmail = user.email;
          setCfg(next);
        } catch {}
      } else {
        setErr(r?.data?.error || "Save failed.");
      }
    } catch {
      setErr("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  // Test email
  const sendTest = async () => {
    setMsg(""); setErr("");
    if (!isEmail(testTo)) return setErr("Enter a valid test recipient email.");
    setTesting(true);
    try {
      const r = await API.post("/email/test", { to: testTo }, { validateStatus: () => true });
      if (r.status >= 200 && r.status < 300) setMsg("Test email sent.");
      else setErr(r?.data?.error || "Send failed.");
    } catch {
      setErr("Network error while sending test email.");
    } finally {
      setTesting(false);
    }
  };

  const disconnectGmail = () => setCfg((c) => ({ ...c, provider: "imap" }));

  const gmailOAuthUrl =
    (import.meta?.env?.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL.replace(/\/+$/, "")}/api/email/oauth/google`
      : "/api/email/oauth/google");

  return (
    <SettingsLayout>
      <h2 style={{ margin: "6px 0 10px" }}>Email</h2>

      {err && <div className="note err" style={{ marginBottom: 10 }}>{err}</div>}
      {msg && <div className="note ok" style={{ marginBottom: 10 }}>{msg}</div>}

      <div className="card shadow-lg" style={{ display: "grid", gap: 12 }}>
        {/* Provider + From */}
        <div className="row">
          <select className="input" value={cfg.provider} onChange={(e) => onChangeProvider(e.target.value)}>
            <option value="imap">IMAP/SMTP</option>
            <option value="gmail">Gmail (OAuth)</option>
          </select>
          <input
            className="input"
            placeholder="From name"
            value={cfg.fromName || ""}
            onChange={(e) => { setTouchedFromName(true); setCfg((c) => ({ ...c, fromName: e.target.value })); }}
          />
          <input
            className="input"
            placeholder="From email"
            value={cfg.fromEmail || ""}
            onChange={(e) => { setTouchedFromEmail(true); setCfg((c) => ({ ...c, fromEmail: e.target.value })); }}
          />
        </div>

        {/* IMAP/SMTP config */}
        {cfg.provider === "imap" && (
          <>
            <div className="row" style={{ alignItems: "center" }}>
              <div className="pill pill--sky">Server preset</div>
              <select
                className="input"
                value={preset}
                onChange={(e) => applyPreset(e.target.value)}
                style={{ maxWidth: 320 }}
              >
                {PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              {preset === "cpanel" && (
                <button type="button" className="btn btn-ghost" onClick={detectFromFromEmail}>
                  Detect from “From email”
                </button>
              )}
            </div>

            <div className="row">
              <input
                className="input"
                placeholder="SMTP Host"
                value={cfg.imap.host || ""}
                onChange={(e) => onChangeImapField("host", e.target.value)}
              />
              <input
                className="input"
                type="number"
                placeholder="Port"
                value={String(cfg.imap.port ?? "")}
                onChange={(e) => onChangeImapField("port", Number(e.target.value))}
              />
              <label className="tiny" style={{ alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!!cfg.imap.secure}
                  onChange={(e) => onChangeImapField("secure", e.target.checked)}
                /> SSL/TLS
              </label>
            </div>

            <div className="row">
              <input
                className="input"
                placeholder="Username (usually full email)"
                value={cfg.imap.user || ""}
                onChange={(e) => onChangeImapField("user", e.target.value)}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
                <input
                  className="input"
                  type={showPass ? "text" : "password"}
                  placeholder="Password / App Password"
                  value={cfg.imap.password || ""}
                  onChange={(e) => onChangePassword(e.target.value)}
                />
                <button type="button" className="btn btn-ghost" onClick={() => setShowPass((v) => !v)}>
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="note" style={{ color: "#0f172a" }}>
              {PRESETS.find((p) => p.id === preset)?.hint || "Use your provider’s SMTP details."}
            </div>
          </>
        )}

        {/* Gmail OAuth */}
        {cfg.provider === "gmail" && (
          <div style={{ display: "grid", gap: 8, border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff" }}>
            <div className="pill pill--sky">Gmail OAuth</div>
            {cfg.gmail?.connected ? (
              <div className="row" style={{ alignItems: "center" }}>
                <div className="chip chip--emerald">
                  Connected{cfg.gmail.accountEmail ? ` as ${cfg.gmail.accountEmail}` : ""}
                </div>
                <button type="button" className="btn btn-outline" onClick={disconnectGmail}>
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="row" style={{ alignItems: "center" }}>
                <div className="note" style={{ margin: 0 }}>
                  Connect your Google account to send via Gmail’s API (no passwords stored).
                </div>
                <a className="btn btn-primary" href={gmailOAuthUrl}>
                  Connect Gmail
                </a>
              </div>
            )}
          </div>
        )}

        {problems.length > 0 && cfg.provider === "imap" && (
          <div className="note err">
            {problems.map((p, i) => <div key={i}>• {p}</div>)}
          </div>
        )}

        <div className="row" style={{ alignItems: "center" }}>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving || (cfg.provider === "imap" && problems.length > 0)}
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          <div className="row" style={{ gap: 8 }}>
            <input
              className="input"
              placeholder="Send test to"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
            />
            <button className="btn btn-outline" onClick={sendTest} disabled={testing}>
              {testing ? "Sending…" : "Send test"}
            </button>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}
