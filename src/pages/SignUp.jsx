import { useState, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import SocialButtons from "../components/SocialButtons.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { AuthAPI } from "../services/api";

export default function SignUp() {
  const nav = useNavigate();
  const { search } = useLocation();
  const inviteToken = useMemo(() => new URLSearchParams(search).get("token") || "", [search]);
  const { signup: signupCtx, signin: signinCtx } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", agree: false });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const looksLikeEmail = (v) => /^\S+@\S+\.\S+$/.test(v);
  const looksLikePhone = (v) => /^\+?[0-9\-().\s]{6,20}$/.test(v);

  const onChange = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    if (!form.name.trim()) return "Please enter your full name.";
    if (!form.email && !form.phone) return "Enter a work email or phone number.";
    if (form.email && !looksLikeEmail(form.email)) return "Please enter a valid work email.";
    if (form.phone && !looksLikePhone(form.phone)) return "Please enter a valid phone number.";
    if (!form.password || form.password.length < 6) return "Password must be at least 6 characters.";
    if (!form.agree) return "Please accept the Terms and Privacy Policy.";
    return "";
  };

  const serverErrorToText = (e) => {
    const list = e?.server?.errors;
    if (Array.isArray(list) && list.length) return list.map(x => x.message).join("\n");
    return e?.message || "Sign up failed";
  };

  const handleAutoLogin = async (signupRes) => {
    if (signupRes?.token) { nav("/home"); return; }
    const identifier = form.email || form.phone;
    const si = await AuthAPI.signin({ identifier, password: form.password });
    await signinCtx({ identifier, password: form.password });
    if (si?.token) localStorage.setItem("auth.token", si.token);
    nav("/home");
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");
    const v = validate();
    if (v) return setErr(v);
    setLoading(true);
    try {
      const res = await signupCtx({ ...form, inviteToken: inviteToken || undefined });
      setOk("Account created. Redirecting…");
      await handleAutoLogin(res);
    } catch (e) {
      setErr(serverErrorToText(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell auth-shell--aurora">
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-grid">
            <div className="auth-left">
              <span className="eyebrow eyebrow--rose">Start free</span>
              <h2 className="auth-title">Create your <span className="brand">Zura</span> account</h2>
              <p className="auth-sub">No credit card required.</p>

              <SocialButtons
                onGoogle={() => nav("/signin")}
                onOther={() => alert("Add other providers here")}
                label="Sign up with"
              />

              <div className="divider"><span>or</span></div>

              <form onSubmit={submit} noValidate>
                <input className="input" placeholder="Full Name" value={form.name} onChange={onChange("name")} />
                <div className="row">
                  <input className="input" placeholder="Work Email" type="email" value={form.email} onChange={onChange("email")} />
                  <input className="input" placeholder="Phone Number" value={form.phone} onChange={onChange("phone")} />
                </div>

                <div style={{ position: "relative" }}>
                  <input className="input" placeholder="Create Password" type={showPw ? "text" : "password"}
                         value={form.password} onChange={onChange("password")} />
                  <button type="button" className="btn btn-ghost" onClick={() => setShowPw(v => !v)}
                          style={{ position: "absolute", right: 6, top: 6, height: "calc(100% - 12px)", padding: "0 .8rem", fontSize: 12 }}>
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>

                <label className="tiny">
                  <input type="checkbox" checked={form.agree}
                         onChange={(e) => setForm((f) => ({ ...f, agree: e.target.checked }))}/>
                  I agree to the Terms of Service and Privacy Policy.
                </label>

                {err && <div className="note err">{err}</div>}
                {ok && <div className="note ok">{ok}</div>}

                <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: "100%" }}>
                  {loading ? "Creating…" : "Create my account"}
                </button>

                <p className="muted mt-10">
                  Already have an account? <Link to="/signin">Sign in</Link>
                </p>
              </form>
            </div>

            <aside className="auth-right">
              <span className="eyebrow eyebrow--sky">Why Zura</span>
              <h3 className="aside-title">Visual pipeline. Better focus.</h3>
              <p className="aside-text">Lead → deal → won, with tasks and meetings in one place.</p>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
