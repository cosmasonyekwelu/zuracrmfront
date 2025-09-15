// src/pages/settings/PersonalSettings.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import API from "../../services/api";
import SettingsLayout from "./SettingsLayout.jsx";
import Avatar from "../../components/Avatar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

// --- Country metadata: iso2, locale, defaults
const COUNTRY_META = {
  "United States": { iso2: "US", locale: "en-US", dateFormat: "MM/DD/YYYY", timeFormat: "12 Hours", numberLocale: "en-US", language: "English (United States)" },
  "United Kingdom": { iso2: "GB", locale: "en-GB", dateFormat: "DD/MM/YYYY", timeFormat: "24 Hours", numberLocale: "en-GB", language: "English (United Kingdom)" },
  Nigeria:          { iso2: "NG", locale: "en-NG", dateFormat: "DD/MM/YYYY", timeFormat: "12 Hours", numberLocale: "en-NG", language: "English (Nigeria)" },
  France:           { iso2: "FR", locale: "fr-FR", dateFormat: "DD/MM/YYYY", timeFormat: "24 Hours", numberLocale: "fr-FR", language: "Français (France)" },
};

const COUNTRIES = Object.keys(COUNTRY_META);
const LANGUAGES = [
  "English (United States)",
  "English (United Kingdom)",
  "English (Nigeria)",
  "Français (France)",
];

const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"];
const TIME_FORMATS = ["12 Hours", "24 Hours"];

const TIMEZONES = [
  { id: "Africa/Lagos", label: "(GMT+1) West Africa — Africa/Lagos" },
  { id: "Europe/London", label: "(GMT+0/+1) Europe/London" },
  { id: "America/New_York", label: "(GMT−5/−4) America/New_York" },
  { id: "Europe/Paris", label: "(GMT+1/+2) Europe/Paris" },
];

// --- Helpers
function deepEqual(a, b) { try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } }

function inferPatternFromLocale(n, locale) {
  // Convert 123456.789 to a literal like "123,456.789" or "123 456,789"
  const s = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(n);
  // Normalize NBSP to regular space for UI readability (avoid hard-to-see chars)
  return s.replace(/\u00A0/g, " ");
}

function buildDateTimePreview(date, { locale, dateFormat, timeFormat, timeZone }) {
  const d = new Date(date);
  const hour12 = timeFormat === "12 Hours";
  const base = {
    timeZone,
    hour12,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat(locale, base).formatToParts(d).map(p => [p.type, p.value])
  );

  let dateStr = "";
  if (dateFormat === "MM/DD/YYYY") dateStr = `${parts.month}/${parts.day}/${parts.year}`;
  else if (dateFormat === "DD/MM/YYYY") dateStr = `${parts.day}/${parts.month}/${parts.year}`;
  else dateStr = `${parts.year}-${parts.month}-${parts.day}`;

  const timeStr = `${parts.hour}:${parts.minute}${hour12 && parts.dayPeriod ? ` ${parts.dayPeriod.toUpperCase()}` : ""}`;
  return `${dateStr} ${timeStr}`;
}

export default function PersonalSettings() {
  const { user, refresh, setUser } = useAuth() || {};
  // Default to Nigeria to match your Lagos timezone usage
  const defaultCountry = "Nigeria";
  const cm = COUNTRY_META[defaultCountry];

  const defaults = useMemo(() => ({
    name: user?.name || "",
    role: user?.role || "",         // not editable (display only)
    email: user?.email || "",
    language: cm.language,
    country: defaultCountry,
    dateFormat: cm.dateFormat,
    timeFormat: cm.timeFormat,
    timeZone: "Africa/Lagos",
    numberFormat: inferPatternFromLocale(123456.789, cm.numberLocale),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user?.name, user?.role, user?.email]);

  const [form, setForm] = useState(defaults);
  const [saved, setSaved] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [msg, setMsg] = useState("");
  const [errMap, setErrMap] = useState({});
  const fileRef = useRef(null);
  const timerRef = useRef(null);

  const dirty = useMemo(() => !deepEqual(form, saved), [form, saved]);

  // Sync with user changes (without clobbering other local edits)
  useEffect(() => {
    setForm(f => ({
      ...f,
      name: user?.name ?? f.name,
      role: user?.role ?? f.role,
      email: user?.email ?? f.email,
    }));
    setSaved(s => ({
      ...s,
      name: user?.name ?? s.name,
      role: user?.role ?? s.role,
      email: user?.email ?? s.email,
    }));
  }, [user?.name, user?.role, user?.email]);

  // Unsaved changes warning
  useEffect(() => {
    const onBeforeUnload = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Current time preview (recompute on render & on form changes)
  const countryMeta = COUNTRY_META[form.country] || cm;
  const localeTag = countryMeta.locale;
  const iso2 = countryMeta.iso2;
  const now = new Date();
  const sampleDateTime = buildDateTimePreview(now, {
    locale: localeTag,
    dateFormat: form.dateFormat,
    timeFormat: form.timeFormat,
    timeZone: form.timeZone,
  });
  const sampleNumber = inferPatternFromLocale(123456.789, countryMeta.numberLocale);

  const validate = (data) => {
    const errors = {};
    if (!data.name?.trim()) errors.name = "Name is required.";
    if (data.name && data.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
    if (!COUNTRIES.includes(data.country)) errors.country = "Unknown country.";
    if (!LANGUAGES.includes(data.language)) errors.language = "Unknown language.";
    if (!DATE_FORMATS.includes(data.dateFormat)) errors.dateFormat = "Unknown date format.";
    if (!TIME_FORMATS.includes(data.timeFormat)) errors.timeFormat = "Unknown time format.";
    if (!TIMEZONES.some(z => z.id === data.timeZone)) errors.timeZone = "Choose a valid timezone.";
    // numberFormat is derived from locale; allow any string, no strict check
    return errors;
  };

  const save = async (e) => {
    e?.preventDefault?.();
    if (!dirty) return;

    const errors = validate(form);
    setErrMap(errors);
    if (Object.keys(errors).length) {
      setMsg("Please fix the highlighted fields.");
      return;
    }

    setSaving(true); setMsg("");
    try {
      const payload = {
        name: form.name,
        // role intentionally excluded from editing
        preferences: {
          language: form.language,
          country: form.country,
          iso2,                 // expose ISO country code
          locale: localeTag,    // expose locale for backend use
          dateFormat: form.dateFormat,
          timeFormat: form.timeFormat,
          timeZone: form.timeZone,
          numberFormat: form.numberFormat,
        },
      };
      await API.patch("/users/me", payload);
      setSaved(form);
      setMsg("Saved!");
      setTimeout(() => setMsg(""), 2000);

      if (typeof refresh === "function") refresh();
      else if (typeof setUser === "function") setUser({ ...(user || {}), name: form.name });
    } catch (error) {
      const apiErr = error?.response?.data;
      if (apiErr?.errors && typeof apiErr.errors === "object") {
        setErrMap(apiErr.errors);
      }
      setMsg(apiErr?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Autosave (debounced)
  useEffect(() => {
    if (!autoSave || !dirty) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => save(), 900);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, autoSave, dirty]);

  const reset = () => { setForm(saved); setErrMap({}); setMsg(""); };

  const uploadAvatar = async (file) => {
    if (!file) return;
    setSaving(true); setMsg("Uploading avatar…");
    try {
      const fd = new FormData();
      fd.append("file", file);
      await API.post("/users/me/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg("Avatar updated!");
      setTimeout(() => setMsg(""), 1500);
      if (typeof refresh === "function") refresh();
    } catch (error) {
      setMsg(error?.response?.data?.error || "Avatar upload failed");
    } finally {
      setSaving(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // Change handlers
  const onChange = (key) => (e) => {
    const v = e?.target?.value ?? e;
    setForm((f) => ({ ...f, [key]: v }));
  };

  const onChangeCountry = (e) => {
    const nextCountry = e.target.value;
    const meta = COUNTRY_META[nextCountry] || cm;
    setForm((f) => ({
      ...f,
      country: nextCountry,
      language: meta.language,                       // sync language
      dateFormat: meta.dateFormat,                   // set sensible defaults
      timeFormat: meta.timeFormat,
      numberFormat: inferPatternFromLocale(123456.789, meta.numberLocale),
    }));
  };

  return (
    <SettingsLayout>
      <h2 style={{ margin: "6px 0 10px" }}>Personal Settings</h2>

      <div className="card shadow-lg" style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16 }}>
        {/* Left: Profile */}
        <div style={{ borderRight: "1px solid #e5e7eb", paddingRight: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar name={form.name} src={user?.avatarUrl} size={72} />
            <div>
              <div style={{ fontWeight: 800, lineHeight: 1.15 }}>{form.name || "—"}</div>
              <div className="pill" style={{ marginTop: 6 }}>{user?.role || form.role || "—"}</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ color: "#475569", fontSize: 14 }}>Email</div>
            <div style={{ fontWeight: 600 }}>{form.email || "—"}</div>
          </div>

          <div style={{ marginTop: 16 }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => uploadAvatar(e.target.files?.[0])}
              style={{ display: "none" }}
            />
            <button className="btn btn-ghost" type="button" onClick={() => fileRef.current?.click()}>
              Change avatar
            </button>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: "#64748b" }}>
            Tip: Use a square image (≥ 256×256) for best results.
          </div>
        </div>

        {/* Right: Editable fields */}
        <form onSubmit={save} style={{ display: "grid", gap: 12 }}>
          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Full name</label>
              <input
                className={`input ${errMap.name ? "input-err" : ""}`}
                placeholder="Full name"
                value={form.name}
                onChange={onChange("name")}
              />
              {errMap.name && <div className="note err">{errMap.name}</div>}
            </div>

            {/* Role / Title (not editable) */}
            <div style={{ flex: 1 }}>
              <label className="label">Role / Title</label>
              <input className="input" value={form.role || "—"} disabled />
              <div className="note" style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                Ask your admin to change your role.
              </div>
            </div>
          </div>

          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Email</label>
              <input className="input" disabled value={form.email} />
            </div>
          </div>

          <div style={{ marginTop: 8, fontWeight: 700 }}>Locale & Formatting</div>

          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Country</label>
              <select className={`input ${errMap.country ? "input-err" : ""}`} value={form.country} onChange={onChangeCountry}>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {errMap.country && <div className="note err">{errMap.country}</div>}
            </div>

            <div style={{ flex: 1 }}>
              <label className="label">Language</label>
              <select className={`input ${errMap.language ? "input-err" : ""}`} value={form.language} onChange={onChange("language")}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              {errMap.language && <div className="note err">{errMap.language}</div>}
            </div>
          </div>

          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Date format</label>
              <select className={`input ${errMap.dateFormat ? "input-err" : ""}`} value={form.dateFormat} onChange={onChange("dateFormat")}>
                {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              {errMap.dateFormat && <div className="note err">{errMap.dateFormat}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Time format</label>
              <select className={`input ${errMap.timeFormat ? "input-err" : ""}`} value={form.timeFormat} onChange={onChange("timeFormat")}>
                {TIME_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              {errMap.timeFormat && <div className="note err">{errMap.timeFormat}</div>}
            </div>
          </div>

          <div className="row">
            <div style={{ flex: 1 }}>
              <label className="label">Time zone</label>
              <select className={`input ${errMap.timeZone ? "input-err" : ""}`} value={form.timeZone} onChange={onChange("timeZone")}>
                {TIMEZONES.map((z) => <option key={z.id} value={z.id}>{z.label}</option>)}
              </select>
              {errMap.timeZone && <div className="note err">{errMap.timeZone}</div>}
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Number format (based on locale)</label>
              <input className="input" value={form.numberFormat} onChange={onChange("numberFormat")} />
            </div>
          </div>

          {/* Live Preview (uses current time) */}
          <div className="card" style={{ padding: 12, background: "#f8fafc" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Preview</div>
            <div className="row" style={{ gap: 16 }}>
              <div><div className="pill">Country code</div><div style={{ marginTop: 6 }}>{iso2}</div></div>
              <div><div className="pill">Locale</div><div style={{ marginTop: 6 }}>{localeTag}</div></div>
              <div><div className="pill">Now (Date/Time)</div><div style={{ marginTop: 6 }}>{sampleDateTime}</div></div>
              <div><div className="pill">Number</div><div style={{ marginTop: 6 }}>{sampleNumber}</div></div>
            </div>
          </div>

          {/* Footer */}
          {msg && <div className={`note ${msg.includes("Saved") || msg.includes("Avatar") ? "ok" : "err"}`}>{msg}</div>}

          <div className="row" style={{ alignItems: "center", gap: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={saving || !dirty}>
              {saving ? "Saving…" : (dirty ? "Save changes" : "Saved")}
            </button>
            <button type="button" className="btn btn-ghost" onClick={reset} disabled={!dirty || saving}>Reset</button>

            <label className="switch" style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={autoSave} onChange={(e) => setAutoSave(e.target.checked)} />
              <span>Autosave</span>
            </label>
          </div>
        </form>
      </div>
    </SettingsLayout>
  );
}
