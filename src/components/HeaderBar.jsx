import { useAuth } from "../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthAPI } from "../services/api";

export default function HeaderBar() {
  const { user, signout } = useAuth();
  const nav = useNavigate();
  const [me, setMe] = useState(null);

  // Fallback fetch if user isn't hydrated yet
  useEffect(() => {
    let mounted = true;
    if (!user) {
      AuthAPI.me()
        .then((data) => mounted && setMe(data?.user ?? data))
        .catch(() => {});
    } else {
      setMe(user);
    }
    return () => {
      mounted = false;
    };
  }, [user]);

  const onLogout = async () => {
    await signout();
    nav("/signin");
  };

  const firstName = (me?.name || "there").split(" ")[0];

  return (
    <div className="headerbar">
      <div className="headerbar__left">
        <Link to="/home" className="logo" aria-label="Zura Home">Zura</Link>
        <div className="search">
          <input className="input" placeholder="Search ( / )" aria-label="Search" />
        </div>
      </div>
      <div className="headerbar__right">
        <span className="welcome">
          {`Hello, ${firstName}`} <span aria-hidden>👋</span>
        </span>
        <button className="btn btn-outline" onClick={onLogout}>Logout</button>
      </div>
    </div>
  );
}
