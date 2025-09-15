// src/pages/Campaigns.jsx
/**
 * GET    /campaigns?search=
 * POST   /campaigns
 * PATCH  /campaigns/:id
 * DELETE /campaigns/:id
 *
 * Model fields: { name, channel, status, startDate?, endDate?, budget, actualCost, notes? }
 */
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";

const STATUS = ["Draft","Planned","Running","Paused","Completed","Cancelled"];
const NGN = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });

const toISO = (d) => (d ? new Date(d).toISOString() : undefined);
const toDateInput = (d) => (d ? String(d).slice(0,10) : "");
const num = (v, d=0) => {
  const n = typeof v === "string" ? Number(v.replace(/[, ]+/g,"")) : Number(v);
  return Number.isFinite(n) ? n : d;
};

export default function Campaigns(){
  const [rows,setRows]=useState([]);
  const [q,setQ]=useState("");
  const [err,setErr]=useState("");
  const [saving,setSaving]=useState(false);

  // filters/sort
  const [fStatus,setFStatus] = useState("All");
  const [fChannel,setFChannel] = useState("All");
  const [fStart,setFStart] = useState(""); // date-from
  const [fEnd,setFEnd]     = useState(""); // date-to
  const [sortBy,setSortBy] = useState("updated"); // name|start|end|budget|actual|updated
  const [sortDir,setSortDir] = useState("desc");

  // form
  const [editing,setEditing]=useState(null);
  const emptyForm = { name:"", channel:"Email", status:"Draft", startDate:"", endDate:"", budget:"", actualCost:"", notes:"" };
  const [form,setForm]=useState(emptyForm);

  const load = async ()=>{
    setErr("");
    const r = await API.get("/campaigns",{ params:{ search:q }});
    const list = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
    setRows(list);
  };

  useEffect(()=>{ load().catch((e)=>setErr(e?.message||"Failed to load")); },[]);
  useEffect(()=>{
    const t=setTimeout(()=>load().catch(()=>{}),300);
    return ()=>clearTimeout(t);
  },[q]);

  const channels = useMemo(()=>{
    const set = new Set(rows.map(x=>x.channel).filter(Boolean));
    return ["All", ...Array.from(set).sort()];
  },[rows]);

  const validateForm = ()=>{
    if (!form.name.trim()) return "Name is required";
    const b = num(form.budget,0), a = num(form.actualCost,0);
    if (b < 0 || a < 0) return "Budget/Actual must be ≥ 0";
    if (form.startDate && form.endDate && new Date(form.endDate) < new Date(form.startDate)) {
      return "End date must be after Start date";
    }
    return "";
  };

  const resetForm = () => setForm(emptyForm);

  const submit = async (e)=>{
    e.preventDefault();
    const v = validateForm();
    if (v) { setErr(v); return; }
    setErr("");
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      channel: form.channel.trim() || "Email",
      status: form.status || "Draft",
      budget: num(form.budget,0),
      actualCost: num(form.actualCost,0),
      startDate: form.startDate ? toISO(form.startDate) : undefined,
      endDate:   form.endDate   ? toISO(form.endDate)   : undefined,
      notes: form.notes?.trim() || undefined,
    };

    try{
      if (editing){
        const id = editing;
        await API.patch(`/campaigns/${id}`, payload);
        setRows(rs => rs.map(x => x._id === id ? { ...x, ...payload } : x));
        setEditing(null);
      } else {
        const r = await API.post("/campaigns", payload);
        const item = r.data?.item || r.data;
        setRows(rs => [item, ...rs]);
      }
      resetForm();
    } catch(ex){
      setErr(ex?.response?.data?.message || ex?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c)=>{
    setEditing(c._id);
    setErr("");
    setForm({
      name: c.name || "",
      channel: c.channel || "Email",
      status: c.status || "Draft",
      startDate: toDateInput(c.startDate),
      endDate: toDateInput(c.endDate),
      budget: c.budget ?? "",
      actualCost: c.actualCost ?? "",
      notes: c.notes || ""
    });
  };

  const remove = async (id)=>{
    if(!confirm("Delete campaign?")) return;
    try {
      await API.delete(`/campaigns/${id}`);
      setRows(rs => rs.filter(x => x._id !== id));
      if (editing === id){ setEditing(null); resetForm(); }
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Delete failed");
    }
  };

  const quickStatus = async (c, nextStatus)=>{
    try{
      await API.patch(`/campaigns/${c._id}`, { status: nextStatus });
      setRows(rs => rs.map(x => x._id === c._id ? { ...x, status: nextStatus } : x));
    }catch(ex){
      setErr(ex?.response?.data?.message || ex?.message || "Update failed");
    }
  };

  const duplicate = async (c)=>{
    const clone = {
      ...c,
      name: `${c.name} (Copy)`,
      status: "Draft",
      startDate: c.startDate ? toISO(c.startDate) : undefined,
      endDate: c.endDate ? toISO(c.endDate) : undefined,
      _id: undefined,
    };
    try{
      const r = await API.post("/campaigns", clone);
      const item = r.data?.item || r.data;
      setRows(rs=>[item, ...rs]);
    }catch(ex){
      setErr(ex?.response?.data?.message || ex?.message || "Duplicate failed");
    }
  };

  // client-side filtering & sorting
  const filtered = useMemo(()=>{
    const s=q.trim().toLowerCase();
    let arr = rows.filter(c=>{
      const matchQ = !s || (c.name||"").toLowerCase().includes(s) || (c.channel||"").toLowerCase().includes(s) || (c.status||"").toLowerCase().includes(s);
      const matchStatus = fStatus==="All" || (c.status||"")===fStatus;
      const matchChannel = fChannel==="All" || (c.channel||"")===fChannel;
      const matchStart = !fStart || (c.startDate && new Date(c.startDate) >= new Date(fStart));
      const matchEnd   = !fEnd   || (c.endDate   && new Date(c.endDate)   <= new Date(fEnd));
      return matchQ && matchStatus && matchChannel && matchStart && matchEnd;
    });

    const cmp = {
      name: (a,b)=> String(a.name||"").localeCompare(String(b.name||"")),
      start:(a,b)=> new Date(a.startDate||0) - new Date(b.startDate||0),
      end:  (a,b)=> new Date(a.endDate||0) - new Date(b.endDate||0),
      budget:(a,b)=> num(a.budget)-num(b.budget),
      actual:(a,b)=> num(a.actualCost)-num(b.actualCost),
      updated:(a,b)=> new Date(a.updatedAt||0) - new Date(b.updatedAt||0),
    }[sortBy];

    arr.sort(cmp);
    if (sortDir==="desc") arr.reverse();
    return arr;
  },[rows,q,fStatus,fChannel,fStart,fEnd,sortBy,sortDir]);

  // summary stats
  const summary = useMemo(()=>{
    const totalBudget = filtered.reduce((s,x)=> s + num(x.budget,0), 0);
    const totalActual = filtered.reduce((s,x)=> s + num(x.actualCost,0), 0);
    const running = filtered.filter(x=> x.status==="Running").length;
    const variance = totalActual - totalBudget;
    return { totalBudget, totalActual, variance, running };
  },[filtered]);

  const burnPct = (c)=>{
    const b = num(c.budget,0);
    if (!b) return null;
    const pct = Math.min(100, Math.max(0, (num(c.actualCost,0)/b)*100));
    return Math.round(pct);
  };

  const durationPct = (c)=>{
    if (!c.startDate || !c.endDate) return null;
    const start = new Date(c.startDate).getTime();
    const end = new Date(c.endDate).getTime();
    const now = Date.now();
    if (end<=start) return null;
    const pct = Math.round(((now - start) / (end - start)) * 100);
    return Math.max(0, Math.min(100, pct));
  };

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />

        <div className="container" style={{padding:"8px 0"}}>
          <div className="row" style={{alignItems:"center", marginBottom:10, gap:10}}>
            <h2 style={{margin:0}}>Campaigns</h2>
            <span className="pill pill--sky">Total {filtered.length}</span>
            <span className="pill">Running {summary.running}</span>
            <span className="pill">
              Budget {NGN.format(summary.totalBudget)} • Actual {NGN.format(summary.totalActual)} • Variance {NGN.format(summary.variance)}
            </span>
            {err && <span className="note err">{String(err)}</span>}
          </div>

          {/* Add/Edit */}
          <div className="card shadow-lg" style={{marginBottom:14}}>
            <form onSubmit={submit} className="row" style={{flexWrap:"wrap", gap:10}}>
              <input className="input" placeholder="Campaign name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
              <input className="input" placeholder="Channel (Email, Ads, Social…)" value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))}/>
              <select className="input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="input" type="date" placeholder="Start date" value={form.startDate} onChange={e=>setForm(f=>({...f,startDate:e.target.value}))}/>
              <input className="input" type="date" placeholder="End date" value={form.endDate} onChange={e=>setForm(f=>({...f,endDate:e.target.value}))}/>
              <input className="input" type="number" placeholder="Budget (₦)" value={form.budget} onChange={e=>setForm(f=>({...f,budget:e.target.value}))}/>
              <input className="input" type="number" placeholder="Actual Cost (₦)" value={form.actualCost} onChange={e=>setForm(f=>({...f,actualCost:e.target.value}))}/>
              <input className="input" placeholder="Notes" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
              <div className="row" style={{gap:10}}>
                <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : editing ? "Save" : "Add campaign"}</button>
                {editing && <button type="button" className="btn btn-ghost" onClick={()=>{ setEditing(null); resetForm(); }}>Cancel</button>}
              </div>
            </form>
          </div>

          {/* Toolbar */}
          <div className="card shadow-lg" style={{marginBottom:14}}>
            <div className="row" style={{alignItems:"center", gap:10, flexWrap:"wrap"}}>
              <input className="input" placeholder="Search campaigns…" value={q} onChange={e=>setQ(e.target.value)} />
              <select className="input" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
                {["All", ...STATUS].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="input" value={fChannel} onChange={e=>setFChannel(e.target.value)}>
                {channels.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input className="input" type="date" value={fStart} onChange={e=>setFStart(e.target.value)} title="Start from"/>
              <input className="input" type="date" value={fEnd} onChange={e=>setFEnd(e.target.value)} title="End to"/>
              <select className="input" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="updated">Sort: Updated</option>
                <option value="name">Sort: Name</option>
                <option value="start">Sort: Start</option>
                <option value="end">Sort: End</option>
                <option value="budget">Sort: Budget</option>
                <option value="actual">Sort: Actual</option>
              </select>
              <select className="input" value={sortDir} onChange={e=>setSortDir(e.target.value)}>
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
              <button className="btn btn-ghost" onClick={()=>{ setFStatus("All"); setFChannel("All"); setFStart(""); setFEnd(""); setQ(""); }}>Reset filters</button>
            </div>
          </div>

          {/* Table */}
          <div className="card shadow-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th><th>Channel</th><th>Status</th>
                  <th>Budget</th><th>Actual</th><th>Variance</th>
                  <th>Progress</th>
                  <th>Dates</th>
                  <th style={{width:260}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c=>{
                  const variance = num(c.actualCost,0) - num(c.budget,0);
                  const burn = burnPct(c);
                  const dur = durationPct(c);
                  return (
                    <tr key={c._id}>
                      <td><strong>{c.name}</strong>{c.notes ? <div className="tiny" style={{opacity:.7}}>{c.notes}</div> : null}</td>
                      <td>{c.channel || "—"}</td>
                      <td>
                        <select
                          className="input"
                          value={c.status || "Draft"}
                          onChange={async e=>{
                            const status = e.target.value;
                            await API.patch(`/campaigns/${c._id}`, { status });
                            setRows(rs => rs.map(x => x._id === c._id ? { ...x, status } : x));
                          }}
                        >
                          {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td>{NGN.format(num(c.budget,0))}</td>
                      <td>{NGN.format(num(c.actualCost,0))}</td>
                      <td style={{color: variance>0 ? "#b91c1c" : variance<0 ? "#065f46" : undefined}}>
                        {NGN.format(variance)}
                      </td>
                      <td>
                        {/* Burn bar (budget) + Duration bar (time) */}
                        <div className="tiny">Burn {burn==null ? "—" : `${burn}%`}</div>
                        <div style={{height:6, background:"#e5e7eb", borderRadius:4, overflow:"hidden", marginBottom:4}}>
                          <div style={{height:"100%", width:`${burn||0}%`, background:"#0ea5e9"}} />
                        </div>
                        <div className="tiny">Time {dur==null ? "—" : `${dur}%`}</div>
                        <div style={{height:6, background:"#e5e7eb", borderRadius:4, overflow:"hidden"}}>
                          <div style={{height:"100%", width:`${dur||0}%`, background:"#10b981"}} />
                        </div>
                      </td>
                      <td className="tiny">
                        {c.startDate ? String(c.startDate).slice(0,10) : "—"} → {c.endDate ? String(c.endDate).slice(0,10) : "—"}
                      </td>
                      <td>
                        <div className="row" style={{gap:8, flexWrap:"wrap"}}>
                          <button className="btn btn-outline" onClick={()=>startEdit(c)}>Edit</button>
                          <button className="btn btn-ghost" onClick={()=>duplicate(c)}>Duplicate</button>
                          {c.status==="Running" ? (
                            <button className="btn" onClick={()=>quickStatus(c,"Paused")}>Pause</button>
                          ) : (
                            <button className="btn" onClick={()=>quickStatus(c,"Running")}>Run</button>
                          )}
                          <button className="btn" onClick={()=>quickStatus(c,"Completed")}>Complete</button>
                          <button className="btn btn-ghost" onClick={()=>remove(c._id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!filtered.length && <tr><td colSpan={9} style={{textAlign:"center",padding:20,color:"#64748b"}}>No campaigns</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
