import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { Link } from "react-router-dom";
import { useState } from "react";
import "../styles/zuralanding.css";

export default function Demo() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    teamSize: "",
    role: "",
    preferredDate: "",
    preferredTime: "",
    notes: "",
    agree: false,
  });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const looksLikeEmail = (v) => /\S+@\S+\.\S+/.test(v);

  const validate = () => {
    if (!form.name.trim()) return "Please enter your full name.";
    if (!form.email || !looksLikeEmail(form.email)) return "Enter a valid email address.";
    if (!form.company.trim()) return "Please enter your company name.";
    if (!form.teamSize.trim()) return "Select a team size.";
    if (!form.agree) return "Please accept the terms to proceed.";
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setMsg("");
    const v = validate();
    if (v) return setMsg(v);
    setLoading(true);
    try {
      // TODO: Replace with your backend endpoint
      // await fetch("/api/demo-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      await new Promise((r) => setTimeout(r, 500));
      setMsg("Thanks! We\'ll reach out to schedule your demo.");
      setForm({ name: "", email: "", phone: "", company: "", teamSize: "", role: "", preferredDate: "", preferredTime: "", notes: "", agree: false });
    } catch (err) {
      setMsg("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="zura">
      <Navbar />

      <section className="section section--alt">
        <div className="container split">
          <div className="split__copy">
            <span className="eyebrow">Request a Demo</span>
            <h2>See Zura CRM in action</h2>
            <p>
              A 30–45 minute walkthrough tailored to your workflow—lead capture, pipeline, automations, and reports.
              We\'ll map Zura to your current process and answer questions.
            </p>
            <ul className="checklist">
              <li>Personalized live session</li>
              <li>Implementation guidance</li>
              <li>Pricing & migration options</li>
            </ul>
            <div className="chip-row">
              <span className="chip chip--emerald">SMB</span>
              <span className="chip chip--rose">Mid‑market</span>
              <span className="chip chip--amber">Enterprise</span>
            </div>
            <div style={{ marginTop: 12 }}>
              Prefer email? <a className="help-link" href="mailto:sales@zura.app">sales@zura.app</a>
            </div>
          </div>

          <form onSubmit={submit} className="card shadow-xl" noValidate>
            <h3 className="card__title">Book your live demo</h3>

            <div className="row">
              <input className="input" placeholder="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
            </div>

            <div className="row">
              <input className="input" placeholder="Work Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} autoComplete="email" />
              <input className="input" placeholder="Phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} autoComplete="tel" />
            </div>

            <div className="row">
              <input className="input" placeholder="Company" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
              <select className="input" value={form.teamSize} onChange={(e) => setForm((f) => ({ ...f, teamSize: e.target.value }))}>
                <option value="">Team Size</option>
                <option>1–5</option>
                <option>6–20</option>
                <option>21–50</option>
                <option>51–200</option>
                <option>200+</option>
              </select>
            </div>

            <div className="row">
              <input className="input" placeholder="Role (e.g. Sales Lead)" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
            </div>

            <div className="row">
              <input className="input" type="date" value={form.preferredDate} onChange={(e) => setForm((f) => ({ ...f, preferredDate: e.target.value }))} />
              <input className="input" type="time" value={form.preferredTime} onChange={(e) => setForm((f) => ({ ...f, preferredTime: e.target.value }))} />
            </div>

            <div className="row">
              <textarea className="input" rows={4} placeholder="Anything specific you want to see?" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            <label className="tiny">
              <input type="checkbox" checked={form.agree} onChange={(e) => setForm((f) => ({ ...f, agree: e.target.checked }))} />
              I agree to be contacted about my request.
            </label>

            {msg && <div className={`note ${/thanks/i.test(msg) ? "ok" : "err"}`} aria-live="polite">{msg}</div>}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Sending…" : "Request Demo"}
            </button>

            <div className="muted" style={{ marginTop: 8 }}>
              By submitting, you consent to be contacted about Zura CRM. You can opt out anytime.
            </div>
          </form>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="eyebrow">What we\'ll cover</div>
          <div className="feature-grid">
            <div className="feature-card feature-card--sky"><h3>Lead Capture</h3><p>Forms, imports, APIs, and assignments.</p></div>
            <div className="feature-card feature-card--emerald"><h3>Pipeline</h3><p>Stages, probabilities, and forecasting.</p></div>
            <div className="feature-card feature-card--rose"><h3>Automation</h3><p>Sequences, reminders, and SLAs.</p></div>
            <div className="feature-card feature-card--amber"><h3>Reporting</h3><p>Dashboards your team will actually use.</p></div>
          </div>
          <div style={{ marginTop: 16 }}>
            Prefer to explore on your own? <Link className="help-link" to="/signup">Start free</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
