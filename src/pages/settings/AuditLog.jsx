// src/pages/settings/AuditLog.jsx
/**
 * GET /audit?q=&from=&to=&limit=&before=
 * Always expect an array; handle bad shapes defensively.
 */
import { useEffect, useMemo, useState } from "react";
import API from "../../services/api";
import SettingsLayout from "./SettingsLayout.jsx";

const asArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
};

export default function AuditLog(){
  const [rows, setRows] = useState([]);      // always array
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [limit, setLimit] = useState(100);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const fetchRows = async (opts = {}) => {
    const params = {
      q: (opts.q ?? q) || "",
      from: (opts.from ?? from) || "",
      to: (opts.to ?? to) || "",
      limit: opts.limit ?? limit,
      ...(opts.before ? { before: opts.before } : {}),
    };
    setBusy(true); setErr("");
    try {
      const r = await API.get("/audit", { params, validateStatus: () => true });
      if (r.status >= 200 && r.status < 300) {
        const list = asArray(r.data).map(x => ({
          _id: x._id,
          when: x.when || x.createdAt || new Date().toISOString(),
          actor: x.actor || "",
          action: x.action || "",
          target: x.target || "",
          meta: x.meta || {},
        }));
        if (opts.append) setRows(prev => [...prev, ...list]);
        else setRows(list);
      } else {
        setRows([]); setErr(r?.data?.error || "Failed to load audit log");
      }
    } catch {
      setRows([]); setErr("Network error while loading audit log");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { fetchRows(); /* initial */ }, []);

  const lastWhen = useMemo(() => {
    if (!rows.length) return "";
    // rows are server-sorted desc; last entry has the smallest date
    const last = rows[rows.length - 1];
    const d = new Date(last.when);
    return isNaN(d.getTime()) ? "" : d.toISOString();
  }, [rows]);

  const onFilter = () => fetchRows({ q, from, to, limit, append: false });
  const onReset = () => { setQ(""); setFrom(""); setTo(""); fetchRows({ q:"", from:"", to:"", append:false }); };
  const onLoadMore = () => {
    if (!lastWhen) return;
    fetchRows({ before: lastWhen, append: true });
  };

  return (
    <SettingsLayout>
      <h2 style={{margin:"6px 0 10px"}}>Audit Log</h2>

      {(err) && <div className="note err" style={{marginBottom:10}}>{err}</div>}

      <div className="card shadow-lg">
        <div className="row" style={{alignItems:"center"}}>
          <input className="input" placeholder="Search (actor, action, target…)" value={q} onChange={e=>setQ(e.target.value)} />
          <input className="input" type="date" value={from || ""} onChange={e=>setFrom(e.target.value)} />
          <input className="input" type="date" value={to || ""} onChange={e=>setTo(e.target.value)} />
          <select className="input" value={String(limit)} onChange={e=>setLimit(Number(e.target.value))}>
            {[50,100,200,500].map(n => <option key={n} value={n}>{n} per page</option>)}
          </select>
          <button className="btn btn-primary" onClick={onFilter} disabled={busy}>{busy ? "Loading…" : "Filter"}</button>
          <button className="btn btn-ghost" onClick={onReset} disabled={busy}>Reset</button>
        </div>

        <table className="table" style={{marginTop:10}}>
          <thead>
            <tr><th style={{width:210}}>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Meta</th></tr>
          </thead>
          <tbody>
            {rows.length > 0 ? rows.map(r=>(
              <tr key={r._id}>
                <td title={new Date(r.when).toISOString()}>
                  {new Date(r.when).toLocaleString()}
                </td>
                <td>{r.actor || "—"}</td>
                <td><span className="chip chip--amber">{r.action}</span></td>
                <td style={{maxWidth:320, overflow:"hidden", textOverflow:"ellipsis"}} title={r.target}>{r.target}</td>
                <td>
                  <code style={{fontSize:12,color:"#64748b"}}>
                    {(() => { try { return JSON.stringify(r.meta ?? {}); } catch { return "{}"; } })()}
                  </code>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={5} style={{textAlign:"center",padding:20,color:"#64748b"}}>{busy ? "Loading…" : "No events"}</td></tr>
            )}
          </tbody>
        </table>

        <div style={{ display:"flex", justifyContent:"center", padding:10 }}>
          <button className="btn btn-outline" onClick={onLoadMore} disabled={busy || !rows.length || !lastWhen}>
            {busy ? "Loading…" : "Load more"}
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
