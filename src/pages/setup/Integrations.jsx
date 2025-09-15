// src/pages/setup/Integrations.jsx
import { useEffect, useState } from "react";
import API from "../../services/api";
import { useOnboarding } from "../../context/OnboardingContext.jsx";

const KNOWN = [
  { key: "slack", name: "Slack" },
  { key: "zapier", name: "Zapier" },
  { key: "mailchimp", name: "Mailchimp" },
  { key: "stripe", name: "Stripe" },
];

export default function Integrations() {
  const [state, setState] = useState({});
  const [saving, setSaving] = useState(false);
  const { markDone } = useOnboarding();

  useEffect(() => {
    (async () => {
      try {
        const data = await API.get("/integrations").then((r) => r.data);
        setState(data || {});
      } catch {}
    })();
  }, []);

  const toggle = (key) => setState((s) => ({ ...s, [key]: !s[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await API.post("/integrations", state);
      markDone("integrations", true);
      alert("Integrations saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page pad">
      <h2>Integrations</h2>
      <p>Connect your favorite tools.</p>
      <ul className="list panel">
        {KNOWN.map((app) => (
          <li key={app.key} className="row">
            <label className="row gap">
              <input type="checkbox" checked={!!state[app.key]} onChange={() => toggle(app.key)} />
              <span>{app.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
