import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import SocialButtons from "../components/SocialButtons.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function SignIn() {
  const nav = useNavigate();
  const { search } = useLocation();
  const { signin } = useAuth();

  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const redirect = useMemo(() => {
    const p = new URLSearchParams(search).get("redirect");
    return p && p.startsWith("/") ? p : "/home";
  }, [search]);

  useEffect(() => {
    const cid = import.meta.env.VITE_GOOGLE_CLIENT_ID || window.GOOGLE_CLIENT_ID;
    if (!cid || document.getElementById("gsi-script")) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.id = "gsi-script";
    document.head.appendChild(s);
  }, []);

  const normalizePhone = (v) => v.replace(/[^\d+]/g, "");
  const looksLikeEmail = (v) => /^\S+@\S+\.\S+$/.test(v);
  const looksLikePhone = (v) => /^\+?\d[\d\s\-()]{5,}$/.test(v);

  const handleNext = (e) => {
    e.preventDefault();
    setErr("");
    const id = identifier.trim();
    if (!id) return setErr("Please enter your email address or mobile number.");
    if (!looksLikeEmail(id) && !looksLikePhone(id)) {
      return setErr("Enter a valid email address or phone number.");
    }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!password) return setErr("Please enter your password.");
    setLoading(true);
    try {
      const id = looksLikePhone(identifier.trim())
        ? normalizePhone(identifier.trim())
        : identifier.trim().toLowerCase();
      await signin({ identifier: id, password });
      nav(redirect);
    } catch (e) {
      // show server validation message if present
      const list = e?.server?.errors;
      const msg = Array.isArray(list) && list.length
        ? list.map(x => x.message).join("\n")
        : (e?.message || "Sign in failed. Check your credentials and try again.");
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell auth-shell--aurora">
      <div className="auth-wrap">
        <div className="auth-card auth-card--split">
          <div className="auth-grid">
            <div className="auth-left">
              <span className="eyebrow eyebrow--rose">Welcome back</span>
              <h2 className="auth-title">Sign in to <span className="brand">Zura</span></h2>
              <p className="auth-sub">Use social sign-in or continue with your email/phone.</p>

              <SocialButtons
                label="Continue with"
                onGoogle={() => alert("Set GOOGLE_CLIENT_ID in env to enable Google sign-in")}
                onOther={() => alert("Add other providers here")}
              />

              <div className="divider"><span>or</span></div>

              {step === 1 ? (
                <form onSubmit={handleNext} noValidate>
                  <input
                    autoFocus
                    className="input"
                    placeholder="Email address or mobile number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                  />
                  {err && <div className="note err">{err}</div>}
                  <button className="btn btn-primary" type="submit" style={{ marginTop: 10 }}>
                    Next
                  </button>
                  <p className="muted mt-10">
                    Don&apos;t have a Zura account? <Link to="/signup">Sign up now</Link>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="input-pill">{identifier}</div>

                  <div style={{ position: "relative" }}>
                    <input
                      className="input"
                      placeholder="Password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setShowPw((v) => !v)}
                      style={{ position: "absolute", right: 6, top: 6, height: "calc(100% - 12px)", padding: "0 .8rem", fontSize: 12 }}
                    >
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>

                  {err && <div className="note err">{err}</div>}

                  <div className="row mt-10">
                    <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                      Use a different account
                    </button>
                    <button className="btn btn-primary" type="submit" disabled={loading}>
                      {loading ? "Signing in…" : "Sign in"}
                    </button>
                  </div>

                  <div className="mt-10" style={{ display: "flex", justifyContent: "space-between" }}>
                    <Link to="/signup" className="muted">Need an account? Sign up</Link>
                    <Link to="#" className="muted">Forgot password?</Link>
                  </div>
                </form>
              )}
            </div>

            <aside className="auth-right">
              <span className="eyebrow eyebrow--sky">Secure by design</span>
              <h3 className="aside-title">Multi-factor authentication</h3>
              <p className="aside-text">Keep access safe with MFA, device checks, and session limits.</p>
              <div className="chip-row">
                <span className="chip chip--emerald">2FA</span>
                <span className="chip chip--rose">Device checks</span>
                <span className="chip chip--amber">Session limits</span>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
