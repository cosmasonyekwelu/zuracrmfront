import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import SocialButtons from "../components/SocialButtons.jsx";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useState, useMemo } from "react";
import { AuthAPI } from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";
import "../styles/zuralanding.css"; // ⬅️ adjust path if needed

export default function Landing() {
  const nav = useNavigate();
  const { search } = useLocation();
  const inviteToken = useMemo(() => new URLSearchParams(search).get("token") || "", [search]);
  const { signup: signupCtx, signin: signinCtx } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", agree: false });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const looksLikeEmail = (v) => /^\S+@\S+\.\S+$/.test(v);
  const looksLikePhone = (v) => /^\+?[0-9\-().\s]{6,20}$/.test(v);

  const validate = () => {
    if (!form.name.trim()) return "Please enter your full name.";
    if (!form.email && !form.phone) return "Enter a work email or phone number.";
    if (form.email && !looksLikeEmail(form.email)) return "Enter a valid email address.";
    if (form.phone && !looksLikePhone(form.phone)) return "Enter a valid phone number.";
    if (!form.password || form.password.length < 6) return "Password must be at least 6 characters.";
    if (!form.agree) return "Please accept the Terms and Privacy Policy.";
    return "";
  };

  const serverErrorToText = (e) => {
    const list = e?.server?.errors;
    if (Array.isArray(list) && list.length) return list.map((x) => x.message).join("\n");
    return e?.message || "Signup failed";
  };

  const autoLoginAfterSignup = async (res) => {
    if (res?.token) {
      nav("/home");
      return;
    }
    const identifier = form.email || form.phone;
    const si = await AuthAPI.signin({ identifier, password: form.password });
    await signinCtx({ identifier, password: form.password });
    if (si?.token) localStorage.setItem("auth.token", si.token);
    nav("/home");
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setMsg("");
    const v = validate();
    if (v) return setMsg(v);
    setLoading(true);
    try {
      const res = await signupCtx({ ...form, inviteToken: inviteToken || undefined });
      setMsg("Account created! Redirecting…");
      await autoLoginAfterSignup(res);
    } catch (err) {
      setMsg(serverErrorToText(err));
    } finally {
      setLoading(false);
    }
  };

  const signupHref = inviteToken ? `/signup?token=${encodeURIComponent(inviteToken)}` : "/signup";

  return (
    <div className="zura landing">
      <Navbar />

      {/* HERO */}
      <section className="hero hero--stripe">
        <div className="container hero__inner">
          <div className="hero__copy">
            <span className="pill pill--rose">All‑in‑one CRM</span>
            <h1>
              Grow faster with <span className="brand">Zura CRM</span>
            </h1>
            <p className="sub">
              Capture leads, manage deals, and track activities in a clean, modern workspace.
            </p>
            <div className="hero__cta">
              <Link to={signupHref} className="btn btn-primary">Get Started</Link>
              <Link to="/signin" className="btn btn-outline">Sign in</Link>
            </div>
            <ul className="checklist">
              <li>Lead & pipeline tracking</li>
              <li>Automations & reminders</li>
              <li>Reports your team will actually read</li>
            </ul>
          </div>

          <form onSubmit={submit} className="card shadow-xl hero__card" noValidate>
            <h3 className="card__title">Start your free trial</h3>
            <div className="row">
              <input
                className="input"
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                autoComplete="name"
              />
            </div>
            <div className="row">
              <input
                className="input"
                placeholder="Work Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                autoComplete="email"
              />
              <input
                className="input"
                placeholder="Phone Number"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                autoComplete="tel"
              />
            </div>
            <div className="row">
              <input
                className="input"
                placeholder="Create Password"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="new-password"
              />
            </div>
            <label className="tiny">
              <input
                type="checkbox"
                checked={form.agree}
                onChange={(e) => setForm((f) => ({ ...f, agree: e.target.checked }))}
              />
              I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
            </label>

            {msg && <div className={`note ${/created/i.test(msg) ? "ok" : "err"}`}>{msg}</div>}

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Creating…" : "Create my account"}
            </button>

            <div className="divider">Or sign up with</div>
            <SocialButtons onGoogle={() => nav("/signin")} onOther={() => nav("/signin")} label="Continue with" />
          </form>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section section--alt">
        <div className="container">
          <div className="eyebrow">Features</div>
          <h2 className="section__title">Everything you need to grow</h2>
          <p className="section__sub">Lead capture, pipeline management, automation, analytics, and more.</p>

          <div className="feature-grid">
            <div className="feature-card feature-card--sky">
              <span className="feature-badge">Lead Management</span>
              <h3>Capture & nurture</h3>
              <p>Collect from forms, imports, or APIs. Auto‑assign and follow up on time.</p>
            </div>
            <div className="feature-card feature-card--emerald">
              <span className="feature-badge">Sales Pipeline</span>
              <h3>Visual stages</h3>
              <p>Drag deals across stages with probabilities and weighted forecasts.</p>
            </div>
            <div className="feature-card feature-card--rose">
              <span className="feature-badge">Automation</span>
              <h3>Work smarter</h3>
              <p>Playbooks, reminders, and email sequences that save hours weekly.</p>
            </div>
            <div className="feature-card feature-card--amber">
              <span className="feature-badge">Analytics</span>
              <h3>Clarity, not chaos</h3>
              <p>Custom reports and dashboards your team will actually read.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SOLUTIONS */}
      <section id="solutions" className="section">
        <div className="container split">
          <div className="split__copy">
            <div className="eyebrow">Solutions</div>
            <h2>Built for your team size</h2>
            <p>From a two‑person startup to a multi‑region org, Zura adapts to your sales motion.</p>
            <div className="chip-row">
              <span className="chip chip--emerald">SMB</span>
              <span className="chip chip--rose">Mid‑market</span>
              <span className="chip chip--amber">Enterprise</span>
            </div>
          </div>
          <div className="split__panel">
            <div className="panel-card">Small Business</div>
            <div className="panel-card">Professional Services</div>
            <div className="panel-card">SaaS B2B</div>
            <div className="panel-card">Field Sales</div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="section section--alt">
        <div className="container">
          <div className="eyebrow">Pricing</div>
          <h2 className="section__title">Simple, transparent plans</h2>
          <p className="section__sub">Talk to sales for annual discounts and migration help.</p>

          <div className="feature-grid">
            {[
              { name: "Starter", desc: "Perfect for small teams getting started." },
              { name: "Professional", desc: "Advanced automations and reports." },
              { name: "Enterprise", desc: "SSO, permissions, and bespoke integrations." },
              { name: "On‑prem", desc: "Self‑hosted with enterprise support." },
            ].map((p) => (
              <div key={p.name} className="feature-card">
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                <p style={{ marginTop: 6 }}>{p.desc}</p>
                <div style={{ marginTop: 15 }}>
                  <Link to="/contact" className="btn btn-primary">Contact Sales</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESOURCES */}
      <section id="resources" className="section">
        <div className="container">
          <div className="eyebrow">Resources</div>
          <h2 className="section__title">Get the most out of Zura</h2>
          <p className="section__sub">Guides, help center, and best‑practice playbooks.</p>
          <div className="feature-grid">
            <div className="feature-card"><h3>Blog</h3><p>Practical CRM tactics and growth ideas.</p></div>
            <div className="feature-card"><h3>Guides</h3><p>Step‑by‑step setups and templates.</p></div>
            <div className="feature-card"><h3>Help Center</h3><p>Answers to common questions.</p></div>
            <div className="feature-card"><h3>API Docs</h3><p>Integrate forms, events, and webhooks.</p></div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <div className="cta-band">
        <div className="container cta-band__inner">
          <h3>Ready to transform your pipeline?</h3>
          <div className="cta-band__buttons">
            <Link to={signupHref} className="btn btn-primary">Start Free</Link>
            <Link to="/demo" className="btn btn-outline">Request Demo</Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
