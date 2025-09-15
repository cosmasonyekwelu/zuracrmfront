// src/components/Navbar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCallback } from "react";
import logo from "../assets/logo-mark.svg";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const hash = (location.hash || "").replace("#", "");

  // Click handler for section links
  const goTo = useCallback(
    (id, e) => {
      e.preventDefault();
      if (location.pathname === "/") {
        const el = document.getElementById(id);
        if (el) {
          // update hash without jumping
          window.history.replaceState(null, "", `#${id}`);
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      } else {
        // navigate to landing, then Landing.jsx will scroll on mount
        navigate(`/#${id}`);
      }
    },
    [location.pathname, navigate]
  );

  return (
    <header className="navbar">
      <div className="container nav-inner">
        <div className="nav-left">
          <Link
            to="/"
            className="nav-link"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <img src={logo} alt="Zura" width={28} height={28} />
            <strong>Zura CRM</strong>
          </Link>

          <Link
            className={`nav-link ${hash === "features" ? "active" : ""}`}
            to="/#features"
            onClick={(e) => goTo("features", e)}
          >
            Features
          </Link>
          <Link
            className={`nav-link ${hash === "solutions" ? "active" : ""}`}
            to="/#solutions"
            onClick={(e) => goTo("solutions", e)}
          >
            Solutions
          </Link>
          <Link
            className={`nav-link ${hash === "pricing" ? "active" : ""}`}
            to="/#pricing"
            onClick={(e) => goTo("pricing", e)}
          >
            Pricing
          </Link>
          <Link
            className={`nav-link ${hash === "resources" ? "active" : ""}`}
            to="/#resources"
            onClick={(e) => goTo("resources", e)}
          >
            Resources
          </Link>
        </div>

        <div className="nav-right">
          <Link className="nav-link" to="/signin">
            Sign in
          </Link>
          <Link className="btn btn-primary" to="/signup">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}
