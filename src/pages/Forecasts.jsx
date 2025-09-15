// src/pages/Forecasts.jsx
import { useEffect, useState, useMemo } from "react";
import API from "../services/api";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";

const NGN = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
});

export default function Forecasts() {
  const [data, setData] = useState({ pipeline: [], monthly: [], totals: null });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Try the official summary endpoint
        const r = await API.get("/forecasts/summary", {
          validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
        });

        if (r.status === 200 && r.data && (r.data.pipeline || r.data.monthly)) {
          // expected shape from controller
          const pipeline = Array.isArray(r.data.pipeline) ? r.data.pipeline : [];
          const monthly = Array.isArray(r.data.monthly) ? r.data.monthly : [];
          setData({
            pipeline,
            monthly,
            totals: r.data.totals || null,
          });
          return;
        }

        // Fallback: derive from deals
        const dealsRes = await API.get("/deals");
        const list = Array.isArray(dealsRes.data)
          ? dealsRes.data
          : dealsRes.data?.items || [];

        const byStage = {};
        const byMonth = {};
        for (const d of list) {
          const amt = Number(d.amount || 0);
          const stage = d.stage || "Unstaged";
          byStage[stage] = (byStage[stage] || 0) + amt;

          const month =
            (d.closeDate ? String(d.closeDate) : "").slice(0, 7) ||
            (d.createdAt ? String(d.createdAt).slice(0, 7) : "N/A");
          byMonth[month] = (byMonth[month] || 0) + amt;
        }

        setData({
          pipeline: Object.entries(byStage)
            .map(([stage, amount]) => ({ stage, amount }))
            .sort((a, b) => a.stage.localeCompare(b.stage)),
          monthly: Object.entries(byMonth)
            .map(([month, amount]) => ({ month, amount }))
            .sort((a, b) => a[0]?.localeCompare?.(b[0]) ?? 0),
          totals: null,
        });
      } catch {
        setData({ pipeline: [], monthly: [], totals: null });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalPipeline = useMemo(() => {
    if (data?.totals?.pipeline != null) return Number(data.totals.pipeline) || 0;
    return data.pipeline.reduce((s, x) => s + Number(x.amount || 0), 0);
  }, [data]);

  const denom = totalPipeline > 0 ? totalPipeline : 1;

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />
        <div className="container" style={{ padding: "8px 0" }}>
          <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Forecasts</h2>
            {data.totals && (
              <span className="pill pill--sky" title="Total pipeline value">
                Pipeline {NGN.format(Number(data.totals.pipeline || 0))}
              </span>
            )}
          </div>

          <div className="card shadow-lg" style={{ marginBottom: 14 }}>
            <div className="pill pill--sky" style={{ marginBottom: 8 }}>
              Pipeline by Stage
            </div>

            {loading && <div className="tiny">Loading…</div>}

            {!loading &&
              data.pipeline.map((p, i) => (
                <div key={i} style={{ margin: "8px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong>{p.stage}</strong>
                    <span>{NGN.format(Number(p.amount || 0))}</span>
                  </div>
                  <div className="progress">
                    <div
                      className="progress__bar"
                      style={{ width: `${(Number(p.amount || 0) / denom) * 100}%` }}
                    />
                  </div>
                </div>
              ))}

            {!loading && !data.pipeline.length && (
              <div className="tiny" style={{ color: "#64748b" }}>
                No data yet
              </div>
            )}
          </div>

          <div className="card shadow-lg">
            <div className="pill pill--rose" style={{ marginBottom: 8 }}>
              Monthly Projection
            </div>

            {loading && <div className="tiny">Loading…</div>}

            {!loading && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 12,
                }}
              >
                {data.monthly.map((m, i) => (
                  <div key={i} className="feature-card feature-card--emerald">
                    <div style={{ fontWeight: 700 }}>{m.month}</div>
                    <div style={{ fontSize: 22 }}>{NGN.format(Number(m.amount || 0))}</div>
                  </div>
                ))}
                {!data.monthly.length && (
                  <div className="tiny" style={{ color: "#64748b" }}>
                    No data yet
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
