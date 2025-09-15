import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import Avatar from "../components/Avatar.jsx";
import API from "../services/api";

function normalizeStats(payload) {
  // Support a few shapes so the UI doesn't break if backend differs
  if (!payload || typeof payload !== "object") {
    return { leadsTotal: 0, leadsToday: 0, dealsOpen: 0, dealsThisWeek: 0, activitiesTotal: 0, activitiesDueToday: 0 };
  }

  // Nested shape: { leads:{total,today}, deals:{open,week}, activities:{total,dueToday} }
  if (payload.leads || payload.deals || payload.activities) {
    return {
      leadsTotal: Number(payload.leads?.total ?? 0),
      leadsToday: Number(payload.leads?.today ?? 0),
      dealsOpen: Number(payload.deals?.open ?? 0),
      dealsThisWeek: Number(payload.deals?.week ?? 0),
      activitiesTotal: Number(payload.activities?.total ?? 0),
      activitiesDueToday: Number(payload.activities?.dueToday ?? 0),
    };
  }

  // Flat shape
  return {
    leadsTotal: Number(payload.leadsTotal ?? 0),
    leadsToday: Number(payload.leadsToday ?? 0),
    dealsOpen: Number(payload.dealsOpen ?? 0),
    dealsThisWeek: Number(payload.dealsThisWeek ?? 0),
    activitiesTotal: Number(payload.activitiesTotal ?? 0),
    activitiesDueToday: Number(payload.activitiesDueToday ?? 0),
  };
}

export default function Home() {
  const { user, loading } = useAuth();

  const [stats, setStats] = useState({
    leadsTotal: 0,
    leadsToday: 0,
    dealsOpen: 0,
    dealsThisWeek: 0,
    activitiesTotal: 0,
    activitiesDueToday: 0,
  });
  const [statsLoading, setStatsLoading] = useState(false);

  // Try multiple endpoints, settle on the first that works
  const loadStats = async () => {
    setStatsLoading(true);
    try {
      // 1) preferred: /stats/home
      let r = await API.get("/stats/home", { validateStatus: () => true });
      if (r.status >= 200 && r.status < 300 && r.data) {
        setStats(normalizeStats(r.data));
        return;
      }
      // 2) common: /stats/summary
      r = await API.get("/stats/summary", { validateStatus: () => true });
      if (r.status >= 200 && r.status < 300 && r.data) {
        setStats(normalizeStats(r.data));
        return;
      }
      // 3) fallback: /stats
      r = await API.get("/stats", { validateStatus: () => true });
      if (r.status >= 200 && r.status < 300 && r.data) {
        setStats(normalizeStats(r.data));
        return;
      }
      // if all fail, keep zeros
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadStats().catch(() => {});
  }, []);

  const userName = useMemo(() => {
    const email = user?.email || "";
    const base =
      user?.name ||
      user?.fullName ||
      (email.includes("@") ? email.split("@")[0] : "");
    return base || "there";
  }, [user]);

  const isAdmin = user?.role === "admin" || user?.role === "owner";

  // Setup checklist; show some items only to admins/owners
  const setup = [
    ...(isAdmin ? [{ icon: "👥", title: "Invite your team", to: "/setup/invite" }] : []),
    ...(isAdmin ? [{ icon: "🧭", title: "Configure pipeline", to: "/setup/pipeline" }] : []),
    { icon: "✉️", title: "Connect email", to: "/setup/email" },
    ...(isAdmin ? [{ icon: "🗂️", title: "Migrate data", to: "/setup/import", cta: "Migrate Data" }] : []),
    ...(isAdmin ? [{ icon: "🧩", title: "Integrations", to: "/setup/integrations" }] : []),
  ];

  const settings = [
    { emoji: "⚙️", label: "Personal Settings", to: "/settings/personal", adminOnly: false },
    { emoji: "👤", label: "Users",             to: "/settings/users",    adminOnly: true  },
    { emoji: "🏢", label: "Company Settings",  to: "/settings/company",  adminOnly: true  },
    { emoji: "🗓️", label: "Calendar Booking", to: "/settings/calendar", adminOnly: false },
    { emoji: "🛡️", label: "Security Policies",to: "/settings/security", adminOnly: true  },
  ].filter(s => (s.adminOnly ? isAdmin : true));

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />

        <div className="home-grid">
          {/* LEFT: Greeting + avatar + actions */}
          <section className="gradient-card gradient-card--left greeting-card">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={userName} src={user?.avatar || user?.avatarUrl} size={56} />
              <div>
                <p className="welcome-title" style={{ margin: "0 0 2px" }}>
                  {loading ? "Loading…" : "Hello"}
                </p>
                <h2 className="greeting-headline" style={{ margin: 0 }}>
                  {loading ? "…" : userName} <span role="img" aria-label="wave">👋</span>
                </h2>
              </div>
            </div>

            <p className="greeting-sub" style={{ marginTop: 8 }}>
              We&apos;re happy to bring you aboard the world&apos;s favorite CRM!
            </p>

            {/* Quick actions */}
            <div className="quick-actions">
              {isAdmin && (
                <Link to="/setup/invite" className="btn btn-primary">Invite users</Link>
              )}
              <Link to="/leads" className="btn btn-outline">Add first lead</Link>
              <Link to="/deals" className="btn btn-outline">Create a deal</Link>
            </div>

            {/* Settings shortcuts */}
            <div className="settings-row">
              {settings.map((s) => (
                <Link key={s.to} to={s.to} className="settings-chip" style={{ textDecoration: "none" }}>
                  <span style={{ marginRight: 8 }}>{s.emoji}</span>
                  {s.label}
                </Link>
              ))}
            </div>

            {/* Mini stats (now live) */}
            <div className="stat-grid">
              <div className="stat-card stat-card--sky">
                <div className="stat-title">Leads</div>
                <div className="stat-value">{statsLoading ? "…" : stats.leadsTotal}</div>
                <div className="stat-sub">+{statsLoading ? "…" : stats.leadsToday} today</div>
              </div>
              <div className="stat-card stat-card--rose">
                <div className="stat-title">Open deals</div>
                <div className="stat-value">{statsLoading ? "…" : stats.dealsOpen}</div>
                <div className="stat-sub">{statsLoading ? "…" : stats.dealsThisWeek} this week</div>
              </div>
              <div className="stat-card stat-card--emerald">
                <div className="stat-title">Activities</div>
                <div className="stat-value">{statsLoading ? "…" : stats.activitiesTotal}</div>
                <div className="stat-sub">{statsLoading ? "…" : stats.activitiesDueToday} due today</div>
              </div>
            </div>
          </section>

          {/* RIGHT: Setup checklist panel */}
          <section className="gradient-card gradient-card--right">
            <h3 className="setup-title">Set up your CRM</h3>
            <p className="setup-sub">Make your CRM smarter and more interactive.</p>

            <div className="setup-list">
              {setup.map((s) => (
                <Link key={s.to} to={s.to} className="setup-item" style={{ textDecoration: "none" }}>
                  <div className="setup-icon" aria-hidden>{s.icon}</div>
                  <div className="setup-content">
                    <div className="setup-title">{s.title}</div>
                    <div className="setup-desc">Continue</div>
                  </div>
                  <div className="setup-cta">
                    {s.cta ? (
                      <span className="btn btn-outline" role="button" tabIndex={0}>{s.cta}</span>
                    ) : (
                      <span className="setup-arrow" aria-hidden>›</span>
                    )}
                  </div>
                </Link>
              ))}
              {!setup.length && (
                <div className="tiny" style={{ color: "#64748b" }}>
                  Nothing to configure here. You&apos;re all set!
                </div>
              )}
            </div>

            <div className="help-card" style={{ marginTop: 12 }}>
              Need a live webinar?{" "}
              <Link to="/meetings" className="help-link">
                Book Now
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
