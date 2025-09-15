/**
 * GET    /activities?type=&q= -> [{_id,type:'task'|'call'|'meeting', title, due, who, done}]
 * POST   /activities          -> {type,title,due,who}
 * PATCH  /activities/:id      -> {done?, title?, due?, who?}
 * DELETE /activities/:id
 */
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";

const TABS = [
  { key:"task", label:"Tasks", badge:"chip--amber" },
  { key:"call", label:"Calls", badge:"chip--rose" },
  { key:"meeting", label:"Meetings", badge:"chip--emerald" }
];

export default function Activities(){
  const [tab, setTab] = useState("task");
  const [rows, setRows] = useState([]);
  const [q,setQ]=useState("");
  const [form,setForm]=useState({ type:"task", title:"", due:"", who:"" });

  const load = async ()=>{
    const r = await API.get("/activities", { params:{ type:tab, q }});
    setRows(r.data||[]);
  };
  useEffect(()=>{ load().catch(()=>{}); },[tab]);
  useEffect(()=>{ const t=setTimeout(load,250); return ()=>clearTimeout(t); },[q]);

  const add = async (e)=>{
    e.preventDefault();
    const r = await API.post("/activities", { ...form, type:tab });
    setRows(rs=>[r.data, ...rs]);
    setForm({ type:tab, title:"", due:"", who:"" });
  };

  const toggleDone = async (row)=>{
    await API.patch(`/activities/${row._id}`, { done: !row.done });
    setRows(rs=>rs.map(x=>x._id===row._id?{...x,done:!row.done}:x));
  };

  const filtered = useMemo(()=>{
    const s=q.trim().toLowerCase();
    if(!s) return rows;
    return rows.filter(a => (a.title||"").toLowerCase().includes(s) || (a.who||"").toLowerCase().includes(s));
  },[q,rows]);

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />
        <div className="container" style={{padding:"8px 0"}}>
          <div className="row" style={{alignItems:"center", marginBottom:10}}>
            <h2 style={{margin:0}}>Activities</h2>
            <div className="chip-row">
              {TABS.map(t => (
                <button key={t.key}
                  className={`chip ${t.key===tab ? t.badge : ""}`}
                  onClick={()=>setTab(t.key)}>{t.label}</button>
              ))}
            </div>
          </div>

          <div className="card shadow-lg" style={{marginBottom:14}}>
            <form onSubmit={add} className="row" style={{flexWrap:"wrap", gap:10}}>
              <input className="input" placeholder={`${TABS.find(x=>x.key===tab).label.slice(0,-1)} title`} value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
              <input className="input" type="datetime-local" value={form.due} onChange={e=>setForm(f=>({...f,due:e.target.value}))}/>
              <input className="input" placeholder="With (contact/account)" value={form.who} onChange={e=>setForm(f=>({...f,who:e.target.value}))}/>
              <button className="btn btn-primary">Add</button>
            </form>
          </div>

          <div className="card shadow-lg">
            <div className="row" style={{alignItems:"center",marginBottom:10}}>
              <input className="input" placeholder="Search activities…" value={q} onChange={e=>setQ(e.target.value)} />
            </div>

            <table className="table">
              <thead><tr><th>Status</th><th>Title</th><th>When</th><th>With</th></tr></thead>
              <tbody>
                {filtered.map(a=>(
                  <tr key={a._id}>
                    <td>
                      <label className="tiny" style={{alignItems:"center",gap:6}}>
                        <input type="checkbox" checked={!!a.done} onChange={()=>toggleDone(a)} />
                        {a.done ? "Done":"Open"}
                      </label>
                    </td>
                    <td><strong>{a.title}</strong></td>
                    <td>{a.due ? new Date(a.due).toLocaleString() : "—"}</td>
                    <td>{a.who || "—"}</td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={4} style={{textAlign:"center",padding:20,color:"#64748b"}}>No activities</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
