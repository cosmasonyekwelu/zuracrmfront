// src/pages/setup/ConnectEmail.jsx
import { useState } from "react";
import API from "../../services/api";
import { useOnboarding } from "../../context/OnboardingContext.jsx";

const PROVIDERS = ["Gmail", "Outlook", "IMAP/SMTP"];

export default function ConnectEmail() {
  const [provider, setProvider] = useState("Gmail");
  const [saving, setSaving] = useState(false);
  const { markDone } = useOnboarding();

  const connect = async () => {
    setSaving(true);
    try {
      await API.post("/integrations/email/connect", { provider });
      markDone("email", true);
      alert(`Email via ${provider} connected`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page pad">
      <h2>Connect email</h2>
      <p>Sync your mailbox to send & log emails from the CRM.</p>
      <label className="form-label">Provider</label>
      <select className="input" value={provider} onChange={(e) => setProvider(e.target.value)}>
        {PROVIDERS.map((p) => <option key={p}>{p}</option>)}
      </select>
      <div className="row gap" style={{ marginTop: 12 }}>
        <button className="btn btn-primary" onClick={connect} disabled={saving}>
          {saving ? "Connecting…" : "Connect"}
        </button>
      </div>
    </div>
  );
}
