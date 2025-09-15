// src/pages/setup/ConfigurePipeline.jsx
import { useEffect, useState } from "react";
import API from "../../services/api";
import { useOnboarding } from "../../context/OnboardingContext.jsx";

export default function ConfigurePipeline() {
  const [stages, setStages] = useState(["Qualification", "Needs Analysis", "Proposal", "Negotiation", "Won"]);
  const [saving, setSaving] = useState(false);
  const { markDone } = useOnboarding();

  useEffect(() => {
    (async () => {
      try {
        const data = await API.get("/pipeline").then((r) => r.data);
        if (Array.isArray(data?.stages) && data.stages.length) setStages(data.stages);
      } catch {}
    })();
  }, []);

  const add = () => setStages((s) => [...s, `Stage ${s.length + 1}`]);
  const remove = (i) => setStages((s) => s.filter((_, idx) => idx !== i));
  const update = (i, v) => setStages((s) => s.map((x, idx) => (idx === i ? v : x)));

  const save = async () => {
    setSaving(true);
    try {
      await API.post("/pipeline", { stages });
      markDone("pipeline", true);
      alert("Pipeline updated");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page pad">
      <h2>Configure pipeline</h2>
      <p>Reorder, add, or remove stages to match your sales process.</p>

      <ul className="list panel">
        {stages.map((st, i) => (
          <li key={i} className="row">
            <input className="input" value={st} onChange={(e) => update(i, e.target.value)} />
            <button className="btn btn-outline" onClick={() => remove(i)}>Remove</button>
          </li>
        ))}
      </ul>

      <div className="row gap">
        <button className="btn" onClick={add}>+ Add stage</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save pipeline"}
        </button>
      </div>
    </div>
  );
}
