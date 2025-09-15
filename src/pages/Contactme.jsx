import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { useState } from "react";
import "../styles/zuralanding.css";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "", agree: false });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const looksLikeEmail = (v) => /\S+@\S+\.\S+/.test(v);

  const validate = () => {
    if (!form.name.trim()) return "Please enter your full name.";
    if (!form.email || !looksLikeEmail(form.email)) return "Enter a valid email address.";
    if (!form.subject.trim()) return "Please enter a subject.";
    if (!form.message.trim()) return "Please enter a message.";
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
      // await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      await new Promise((r) => setTimeout(r, 500));
      setMsg("Thanks! We\'ll get back to you shortly.");
      setForm({ name: "", email: "", subject: "", message: "", agree: false });
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
        <div className="container">
          <span className="eyebrow">Contact us</span>
          <h2 className="section__title">We\'re here to help</h2>
          <p className="section__sub">Sales questions, support, or partnership inquiries—reach out anytime.</p>

          <div className="feature-grid" style={{ marginTop: 10 }}>
            <div className="feature-card feature-card--sky">
              <h3>Sales</h3>
              <p>sales@zura.app</p>
            </div>
            <div className="feature-card feature-card--emerald">
              <h3>Support</h3>
              <p>support@zura.app</p>
            </div>
            <div className="feature-card feature-card--rose">
              <h3>Partnerships</h3>
              <p>partners@zura.app</p>
            </div>
            <div className="feature-card feature-card--amber">
              <h3>Call</h3>
              <p>+1 (555) 555‑0123</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div className="split__copy">
            <h2>Send us a message</h2>
            <p>
              Fill out the form and our team will get back within one business day. For urgent issues,
              email <a className="help-link" href="mailto:support@zura.app">support@zura.app</a>.
            </p>
            <ul className="checklist">
              <li>Average response time: under 24h</li>
              <li>Priority for active customers</li>
              <li>Global coverage</li>
            </ul>
          </div>

          <form onSubmit={submit} className="card shadow-xl" noValidate>
            <div className="row">
              <input className="input" placeholder="Full Name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
            </div>
            <div className="row">
              <input className="input" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} autoComplete="email" />
              <input className="input" placeholder="Subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
            </div>
            <div className="row">
              <textarea className="input" rows={5} placeholder="Message" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
            </div>
            <label className="tiny">
              <input type="checkbox" checked={form.agree} onChange={(e) => setForm((f) => ({ ...f, agree: e.target.checked }))} />
              I agree to the processing of my information per the Privacy Policy.
            </label>
            {msg && <div className={`note ${/thanks/i.test(msg) ? "ok" : "err"}`} aria-live="polite">{msg}</div>}
            <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Sending…" : "Send Message"}</button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
