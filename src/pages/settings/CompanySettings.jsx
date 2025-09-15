// src/pages/settings/CompanySettings.jsx
/**
 * API:
 * GET   /company                       -> { name, domain, timezone, locale, logoUrl }
 * PATCH /company                      -> { name?, domain?, timezone?, locale?, logoUrl? }
 * POST  /company/logo (multipart)     -> { logoUrl }
 *
 * Notes:
 * - Orgs are created at signup (no "create company" UI here).
 * - Admins can edit; others have read-only view.
 * - This page is unrelated to customer Accounts (/accounts routes).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import API from "../../services/api";
import SettingsLayout from "./SettingsLayout.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

const TIMEZONES = [
  { id: "Africa/Lagos", label: "(GMT+1) West Africa — Africa/Lagos" },
  { id: "Europe/London", label: "(GMT+0/+1) Europe/London" },
  { id: "America/New_York", label: "(GMT−5/−4) America/New_York" },
  { id: "Europe/Paris", label: "(GMT+1/+2) Europe/Paris" },
  { id: "Asia/Dubai", label: "(GMT+4) Asia/Dubai" },
  { id: "Asia/Kolkata", label: "(GMT+5:30) Asia/Kolkata" },
];

const LOCALES = [
  { id: "en-NG", label: "English (Nigeria)" },
  { id: "en-US", label: "English (United States)" },
  { id: "en-GB", label: "English (United Kingdom)" },
  { id: "fr-FR", label: "Français (France)" },
];

const isAdminRole = (r) => String(r || "").toLowerCase() === "admin";
const deepEqual = (a, b) => { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } };

function normalizeDomain(d) {
  if (!d) return "";
  let s = String(d).trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.replace(/\/.*$/, "");
  s = s.replace(/:.*$/, "");
  s = s.replace(/^www\./, "");
  return s;
}

function validateCompany(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = "Company name is required.";
  if (form.name && form.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";

  if (form.domain) {
    const dom = normalizeDomain(form.domain);
    const re = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!re.test(dom)) errors.domain = "Enter a valid domain (e.g., company.com).";
  }

  if (!TIMEZONES.some(z => z.id === form.timezone)) errors.timezone = "Choose a valid timezone.";
  if (!LOCALES.some(l => l.id === form.locale)) errors.locale = "Choose a valid locale.";
  return errors;
}

function formatPreview(now, { timezone, locale }) {
  try {
    return {
      dateTime: new Intl.DateTimeFormat(locale, {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(now),
      number: new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(123456.789),
    };
  } catch {
    return { dateTime: new Date(now).toLocaleString(), number: "123,456.789" };
  }
}

export default function CompanySettings() {
  const { user: me } = useAuth() || {};
  const isAdmin = isAdminRole(me?.role);

  const [form, setForm] = useState({
    name: "",
    domain: "",
    timezone: "Africa/Lagos",
    locale: "en-NG",
    logoUrl: "",
  });
  const [saved, setSaved] = useState(form);

  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [errMap, setErrMap] = useState({});

  const [busy, setBusy] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [uploadPct, setUploadPct] = useState(0);
  const [notFound, setNotFound] = useState(false); // if GET /company returns 404

  const fileRef = useRef(null);
  const debounceRef = useRef(null);
  const loadedOnceRef = useRef(false); // StrictMode guard

  const dirty = useMemo(() => !deepEqual(form, saved), [form, saved]);
  const preview = useMemo(
    () => formatPreview(new Date(), { timezone: form.timezone, locale: form.locale }),
    [form.timezone, form.locale]
  );

  // Load once (avoid StrictMode double-fetch)
  useEffect(() => {
    if (loadedOnceRef.current) return;
    loadedOnceRef.current = true;

    (async () => {
      setErr(""); setMsg("");
      const r = await API.get("/company", { validateStatus: () => true });
      if (r.status === 404) {
        setNotFound(true);
        setErr("Company endpoint returned 404. Ensure backend exposes GET /company.");
        return;
      }
      if (r.status >= 200 && r.status < 300 && r.data) {
        const data = r.data;
        const init = {
          name: data.name || "",
          domain: data.domain || "",
          timezone: data.timezone || "Africa/Lagos",
          locale: data.locale || "en-NG",
          logoUrl: data.logoUrl || "",
        };
        setForm(init);
        setSaved(init);
      } else {
        setErr(r.data?.error || "Failed to load company profile.");
      }
    })();
  }, []);

  // Warn on close if unsaved changes
  useEffect(() => {
    const onBeforeUnload = (e) => { if (dirty && isAdmin) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, isAdmin]);

  // Debounced autosave
  useEffect(() => {
    if (!isAdmin || !autoSave || !dirty || notFound) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSave(), 900);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, autoSave, dirty, isAdmin, notFound]);

  const onChange = (key) => (e) => {
    const v = e?.target?.value ?? e;
    setForm(f => ({ ...f, [key]: v }));
  };
  const onNormalizeDomain = () => setForm(f => ({ ...f, domain: normalizeDomain(f.domain) }));
  const onReset = () => { setForm(saved); setErr(""); setMsg(""); setErrMap({}); };

  const onSave = async (e) => {
    e?.preventDefault?.();
    if (!isAdmin || notFound) return;
    if (!dirty) return;

    const normalized = { ...form, domain: normalizeDomain(form.domain) };
    const errors = validateCompany(normalized);
    setErrMap(errors);
    if (Object.keys(errors).length) {
      setErr("Please fix the highlighted fields.");
      return;
    }

    setBusy(true); setErr(""); setMsg("");
    try {
      // PATCH only changed fields
      const payload = {};
      for (const k of ["name", "domain", "timezone", "locale", "logoUrl"]) {
        if (saved[k] !== normalized[k]) payload[k] = normalized[k];
      }
      if (Object.keys(payload).length === 0) {
        setMsg("No changes to save.");
        setTimeout(() => setMsg(""), 1500);
      } else {
        await API.patch("/company", payload);
        const nextSaved = { ...saved, ...payload };
        setSaved(nextSaved);
        setForm(nextSaved);
        setMsg("Company profile saved.");
        setTimeout(() => setMsg(""), 1800);
      }
    } catch (e2) {
      const status = e2?.response?.status;
      if (status === 404) {
        setErr("Update endpoint (/company PATCH) not found. Ensure backend exposes it.");
      } else {
        setErr(e2?.response?.data?.error || "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  const onUploadLogo = async (e) => {
    if (!isAdmin || notFound) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const maxBytes = 2 * 1024 * 1024; // 2MB
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml|svg)$/.test(file.type)) {
      setErr("Unsupported file type. Use PNG, JPG, WEBP, GIF, or SVG.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > maxBytes) {
      setErr("Logo is too large. Max 2MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploadPct(0); setBusy(true); setErr(""); setMsg("Uploading…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await API.post("/company/logo", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (pe) => {
          if (!pe.total) return;
          setUploadPct(Math.round((pe.loaded / pe.total) * 100));
        },
        validateStatus: () => true,
      });
      if (r.status === 404) {
        setErr("Logo upload endpoint (/company/logo) not found on backend.");
        return;
      }
      const url = r?.data?.logoUrl;
      if (!url) {
        setErr("Upload succeeded but no logoUrl returned.");
        return;
      }
      setForm(f => ({ ...f, logoUrl: url }));
      setMsg("Logo updated. Don’t forget to Save.");
      setTimeout(() => setMsg(""), 1500);
    } catch (e2) {
      setErr(e2?.response?.data?.error || "Logo upload failed.");
    } finally {
      setBusy(false);
      setUploadPct(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onRemoveLogo = () => {
    if (!isAdmin || notFound) return;
    setForm(f => ({ ...f, logoUrl: "" }));
    setMsg("Logo removed. Don’t forget to Save.");
    setTimeout(() => setMsg(""), 1500);
  };

  const disabled = !isAdmin || busy || notFound;

  return (
    <SettingsLayout>
      <h2 style={{ margin: "6px 0 10px" }}>Company Settings</h2>

      {notFound && (
        <div className="note err" style={{ marginBottom: 10 }}>
          Company API not available (GET /company → 404). Since companies are created at signup,
          ensure your backend exposes <b>/company</b> GET & PATCH routes.
        </div>
      )}
      {!notFound && !isAdmin && (
        <div className="note" style={{ marginBottom: 10 }}>
          You have read-only access. Contact an Administrator to edit company settings.
        </div>
      )}

      <div className="card shadow-lg" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 18 }}>
        {/* Left: Brand */}
        <div style={{ borderRight: "1px solid #e5e7eb", paddingRight: 12 }}>
          <div className="pill pill--sky" style={{ marginBottom: 8 }}>Brand</div>

          <div
            style={{
              display: "grid",
              placeItems: "center",
              border: "1px dashed #e5e7eb",
              borderRadius: 12,
              padding: 16,
              background: "#fff",
              minHeight: 120,
            }}
          >
            {form.logoUrl
              ? <img src={form.logoUrl} alt="Logo" style={{ maxWidth: 220, maxHeight: 100, objectFit: "contain" }} />
              : <div style={{ color: "#64748b" }}>No logo</div>}
          </div>

          <div className="row" style={{ marginTop: 10, gap: 8 }}>
            <label className={`btn btn-outline ${disabled ? "btn-disabled" : ""}`} style={{ display: "inline-block" }}>
              Upload logo
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={onUploadLogo}
                style={{ display: "none" }}
                disabled={disabled}
              />
            </label>
            {form.logoUrl && (
              <button className="btn btn-ghost" onClick={onRemoveLogo} disabled={disabled}>
                Remove
              </button>
            )}
          </div>

          {uploadPct > 0 && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
              Uploading… {uploadPct}%
            </div>
          )}
        </div>

        {/* Right: Form */}
        <form onSubmit={onSave} style={{ display: "grid", gap: 12 }}>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Company name</label>
              <input
                className={`input ${errMap.name ? "input-err" : ""}`}
                placeholder="Company name"
                value={form.name}
                onChange={onChange("name")}
                disabled={disabled}
              />
              {errMap.name && <div className="note err">{errMap.name}</div>}
            </div>

            <div style={{ flex: 1 }}>
              <label className="label">Primary domain (optional)</label>
              <input
                className={`input ${errMap.domain ? "input-err" : ""}`}
                placeholder="company.com"
                value={form.domain}
                onChange={onChange("domain")}
                onBlur={onNormalizeDomain}
                disabled={disabled}
              />
              {!!form.domain && (
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                  Will be saved as: <strong>{normalizeDomain(form.domain)}</strong>
                </div>
              )}
              {errMap.domain && <div className="note err">{errMap.domain}</div>}
            </div>
          </div>

          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Timezone</label>
              <select
                className={`input ${errMap.timezone ? "input-err" : ""}`}
                value={form.timezone}
                onChange={onChange("timezone")}
                disabled={disabled}
              >
                {TIMEZONES.map(z => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
              {errMap.timezone && <div className="note err">{errMap.timezone}</div>}
            </div>

            <div style={{ flex: 1 }}>
              <label className="label">Locale</label>
              <select
                className={`input ${errMap.locale ? "input-err" : ""}`}
                value={form.locale}
                onChange={onChange("locale")}
                disabled={disabled}
              >
                {LOCALES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
              {errMap.locale && <div className="note err">{errMap.locale}</div>}
            </div>
          </div>

          {/* Preview */}
          <div className="card" style={{ padding: 12, background: "#f8fafc" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Preview</div>
            <div className="row" style={{ gap: 16 }}>
              <div>
                <div className="pill">Current time</div>
                <div style={{ marginTop: 6 }}>{preview.dateTime}</div>
              </div>
              <div>
                <div className="pill">Sample number</div>
                <div style={{ marginTop: 6 }}>{preview.number}</div>
              </div>
              <div>
                <div className="pill">Locale</div>
                <div style={{ marginTop: 6 }}>{form.locale}</div>
              </div>
              <div>
                <div className="pill">Timezone</div>
                <div style={{ marginTop: 6 }}>{form.timezone}</div>
              </div>
            </div>
          </div>

          {(msg || err) && <div className={`note ${err ? "err" : "ok"}`}>{err || msg}</div>}

          <div className="row" style={{ alignItems: "center", gap: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={!isAdmin || busy || notFound}>
              {busy ? "Saving…" : (dirty ? "Save changes" : "Saved")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onReset} disabled={!isAdmin || !dirty || busy || notFound}>
              Reset
            </button>

            <label className="switch" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
                disabled={!isAdmin || notFound}
              />
              <span>Autosave</span>
            </label>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
}
