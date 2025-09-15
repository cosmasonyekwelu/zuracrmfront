/**
 * GET    /calls?search= -> [{_id,subject,when,with,phone,direction,status,result,durationSec,notes}]
 * POST   /calls
 * PATCH  /calls/:id
 * DELETE /calls/:id
 */
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";

const STATUS = ["Planned","Completed","Cancelled"];
const RESULT = ["Connected","No Answer","Voicemail","Busy"];

const toLocalDT = (d)=>{
  if (!d) return "";
  const dt = new Date(d);
  const pad = (x)=>String(x).padStart(2,"0");
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const EMPTY = {
  subject: "",
  whenLocal: "",
  withName: "",
  phone: "",
  direction: "Outbound",
  status: "Planned",
  result: "",
  durationSec: "",
  notes: ""
};

export default function Calls(){
  const [rows,setRows]=useState([]);
  const [q,setQ]=useState("");
  const [form,setForm]=useState(EMPTY);
  const [editing,setEditing]=useState(null);
  const [busy,setBusy]=useState(false);

  const load=async()=>{
    const r=await API.get("/calls",{params:{search:q}});
    setRows(Array.isArray(r.data)?r.data:(r.data?.items??[]));
  };
  useEffect(()=>{ load().catch(()=>{}); },[]);
  useEffect(()=>{ const t=setTimeout(load,250); return ()=>clearTimeout(t); },[q]);

  const filtered = useMemo(()=>{
    const s=q.trim().toLowerCase(); if(!s) return rows;
    return rows.filter(c =>
      (c.subject||"").toLowerCase().includes(s) ||
      (c.with||"").toLowerCase().includes(s) ||
      (c.phone||"").toLowerCase().includes(s) ||
      (c.status||"").toLowerCase().includes(s) ||
      (c.result||"").toLowerCase().includes(s)
    );
  },[q,rows]);

  const startEdit=(c)=>{
    setEditing(c._id);
    setForm({
      subject: c.subject||"",
      whenLocal: toLocalDT(c.when),
      withName: c.with||"",
      phone: c.phone||"",
      direction: c.direction||"Outbound",
      status: c.status||"Planned",
      result: c.result||"",
      durationSec: c.durationSec ?? "",
      notes: c.notes||""
    });
  };

  const cancel=()=>{ setEditing(null); setForm(EMPTY); };

  const submit=async(e)=>{
    e.preventDefault(); setBusy(true);
    try{
      const payload = {
        subject: String(form.subject||"").trim(),
        when: form.whenLocal ? new Date(form.whenLocal).toISOString() : null,
        with: String(form.withName||"").trim(),
        phone: String(form.phone||"").trim(),
        direction: ["Outbound","Inbound"].includes(form.direction)?form.direction:"Outbound",
        status: STATUS.includes(form.status)?form.status:"Planned",
        result: form.result ? form.result : undefined,
        durationSec: form.durationSec===""?0:Number(form.durationSec||0),
        notes: String(form.notes||"").trim()
      };
      if (editing){
        await API.patch(`/calls/${editing}`, payload);
        setRows(rs=>rs.map(x=>x._id===editing?{...x, ...payload}:x));
      }else{
        const r=await API.post("/calls", payload);
        setRows(rs=>[r.data, ...rs]);
      }
      cancel();
    } finally { setBusy(false); }
  };

  const remove=async(id)=>{ if(!confirm("Delete call?")) return; await API.delete(`/calls/${id}`); setRows(rs=>rs.filter(x=>x._id!==id)); };

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />
        <div className="container" style={{padding:"8px 0"}}>
          <div className="row" style={{alignItems:"center", marginBottom:10}}>
            <h2 style={{margin:0}}>Calls</h2>
            <span className="pill pill--sky">Total {filtered.length}</span>
          </div>

          {/* Add/Edit */}
          <div className="card shadow-lg" style={{marginBottom:14}}>
            <form onSubmit={submit} className="row" style={{flexWrap:"wrap", gap:10}}>
              <input className="input" placeholder="Subject" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}/>
              <input className="input" type="datetime-local" placeholder="When" value={form.whenLocal} onChange={e=>setForm(f=>({...f,whenLocal:e.target.value}))}/>
              <input className="input" placeholder="With (person/company)" value={form.withName} onChange={e=>setForm(f=>({...f,withName:e.target.value}))}/>
              <input className="input" placeholder="Phone" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
              <select className="input" value={form.direction} onChange={e=>setForm(f=>({...f,direction:e.target.value}))}>
                <option>Outbound</option>
                <option>Inbound</option>
              </select>
              <select className="input" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                {STATUS.map(s=><option key={s}>{s}</option>)}
              </select>
              <select className="input" value={form.result} onChange={e=>setForm(f=>({...f,result:e.target.value}))}>
                <option value="">(Result)</option>
                {RESULT.map(r=><option key={r}>{r}</option>)}
              </select>
              <input className="input" type="number" placeholder="Duration (sec)" value={form.durationSec} onChange={e=>setForm(f=>({...f,durationSec:e.target.value}))}/>
              <input className="input" placeholder="Notes" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
              <div className="row" style={{gap:10}}>
                <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : (editing ? "Save" : "Add call")}</button>
                {editing && <button type="button" className="btn btn-ghost" onClick={cancel}>Cancel</button>}
              </div>
            </form>
          </div>

          {/* Search */}
          <div className="card shadow-lg" style={{marginBottom:14}}>
            <div className="row" style={{alignItems:"center"}}>
              <input className="input" placeholder="Search calls…" value={q} onChange={e=>setQ(e.target.value)} />
            </div>
          </div>

          {/* Table */}
          <div className="card shadow-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th><th>When</th><th>With</th><th>Phone</th><th>Dir</th><th>Status</th><th>Result</th><th>Dur (s)</th><th style={{width:170}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c=>(
                  <tr key={c._id}>
                    <td><strong>{c.subject || "—"}</strong></td>
                    <td>{toLocalDT(c.when) || "—"}</td>
                    <td>{c.with || "—"}</td>
                    <td>{c.phone || "—"}</td>
                    <td>{c.direction || "Outbound"}</td>
                    <td>
                      <select className="input" value={c.status || "Planned"} onChange={async e=>{
                        const status=e.target.value;
                        await API.patch(`/calls/${c._id}`, { status });
                        setRows(rs=>rs.map(x=>x._id===c._id?{...x,status}:x));
                      }}>
                        {STATUS.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="input" value={c.result || ""} onChange={async e=>{
                        const result=e.target.value || undefined;
                        await API.patch(`/calls/${c._id}`, { result });
                        setRows(rs=>rs.map(x=>x._id===c._id?{...x,result, status: (result ? "Completed" : x.status)}:x));
                      }}>
                        <option value="">(Result)</option>
                        {RESULT.map(r=><option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td>{Number(c.durationSec||0)}</td>
                    <td>
                      <div className="row" style={{gap:8}}>
                        <button className="btn btn-outline" onClick={()=>startEdit(c)}>Edit</button>
                        <button className="btn btn-ghost" onClick={()=>remove(c._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length &&
                  <tr><td colSpan={9} style={{textAlign:"center",padding:20,color:"#64748b"}}>No calls</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
