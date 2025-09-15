// src/pages/setup/MigrateData.jsx
import { useState } from "react";
import API from "../../services/api";
import { useOnboarding } from "../../context/OnboardingContext.jsx";

export default function MigrateData() {
  const [file, setFile] = useState(null);
  const [module, setModule] = useState("leads");
  const [sending, setSending] = useState(false);
  const { markDone } = useOnboarding();

  const upload = async () => {
    if (!file) return alert("Pick a CSV file first");
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("module", module);
      await API.post("/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
      markDone("migrate", true);
      alert("Import started. You’ll be notified when complete.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page pad">
      <h2>Migrate Data</h2>
      <p>Upload CSV from your previous CRM or spreadsheets.</p>
      <div className="row gap">
        <select className="input" value={module} onChange={(e) => setModule(e.target.value)}>
          <option value="leads">Leads</option>
          <option value="contacts">Contacts</option>
          <option value="accounts">Accounts</option>
          <option value="deals">Deals</option>
          <option value="activities">Activities</option>
        </select>
        <input className="input" type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0])} />
        <button className="btn btn-primary" onClick={upload} disabled={sending}>
          {sending ? "Uploading…" : "Upload CSV"}
        </button>
      </div>
    </div>
  );
}
