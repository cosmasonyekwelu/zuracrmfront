/**
 * GET    /tasks?search= -> [{_id,title,dueDate,status,priority,with,owner}]
 * POST   /tasks
 * PATCH  /tasks/:id
 * DELETE /tasks/:id
 */
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";

const STATUS   = ["Open","In Progress","Completed"];
const PRIORITY = ["Low","Normal","High"];

const EMPTY = { title:"", dueDate:"", withName:"", status:"Open", priority:"Normal", notes:"" };

const toDateInput = (d) => {
  if (!d) return "";
  try { return new Date(d).toISOString().slice(0,10); } catch { return ""; }
};

export default function Tasks(){
  const [rows,setRows]     = useState([]);
  const [q,setQ]           = useState("");
  const [form,setForm]     = useState(EMPTY);
  const [editing,setEditing]=useState(null);
  const [busy,setBusy]     = useState(false);

  const load = async () => {
    const r = await API.get("/tasks",{ params:{ search:q }});
    const list = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
    setRows(list);
  };

  useEffect(()=>{ load().catch(()=>{}); },[]);
  useEffect(()=>{ const t=setTimeout(load,250); return ()=>clearTimeout(t); },[q]);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(t =>
      (t.title||"").toLowerCase().includes(s) ||
      (t.with||"").toLowerCase().includes(s) ||
      (t.status||"").toLowerCase().includes(s)
    );
  },[rows,q]);

  const startEdit = (row) => {
    setEditing(row._id);
    setForm({
      title:    row.title || "",
      // store in YYYY-MM-DD for the date input
      dueDate:  toDateInput(row.dueDate),
      withName: row.with || "",
      status:   row.status || "Open",
      priority: row.priority || "Normal",
      notes:    row.notes || "",
    });
  };

  const cancel = ()=>{ setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try{
      const payload = {
        title:    String(form.title||"").trim(),
        // send ISO date or empty
        dueDate:  form.dueDate ? new Date(form.dueDate).toISOString() : null,
        with:     String(form.withName||"").trim(),  // map UI key -> API field
        status:   form.status,
        priority: form.priority,
        notes:    String(form.notes||"").trim(),
      };

      if (editing){
        await API.patch(`/tasks/${editing}`, payload);
        setRows(rs => rs.map(x => x._id===editing ? { ...x, ...payload } : x));
      } else {
        const r = await API.post("/tasks", payload);
        setRows(rs => [r.data, ...rs]);
      }
      cancel();
    } finally { setBusy(false); }
  };

  const remove = async (id)=>{
    if(!confirm("Delete this task?")) return;
    await API.delete(`/tasks/${id}`);
    setRows(rs=>rs.filter(x=>x._id!==id));
  };

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />
        <div className="container" style={{padding:"8px 0"}}>
          <div className="row" style={{alignItems:"center", marginBottom:10}}>
            <h2 style={{margin:0}}>Tasks</h2>
            <span className="pill pill--sky">Total {filtered.length}</span>
          </div>

          {/* Add/Edit */}
          <div className="card shadow-lg" style={{marginBottom:14}}>
            <form onSubmit={submit} className="row" style={{flexWrap:"wrap", gap:10}}>
              <input className="input" placeholder="Title"
                value={form.title}
                onChange={e=>setForm(f=>({...f,title:e.target.value}))}/>
              <input className="input" type="date" placeholder="Due date"
                value={form.dueDate}
                onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/>
              <input className="input" placeholder="With (person or company)"
                value={form.withName}
                onChange={e=>setForm(f=>({...f,withName:e.target.value}))}/>
              <select className="input" value={form.status}
                onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                {STATUS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <select className="input" value={form.priority}
                onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                {PRIORITY.map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <input className="input" placeholder="Notes"
                value={form.notes}
                onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/>
              <div className="row" style={{gap:10}}>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : (editing ? "Save" : "Add task")}
                </button>
                {editing &&
                  <button type="button" className="btn btn-ghost" onClick={cancel}>Cancel</button>}
              </div>
            </form>
          </div>

          {/* Toolbar */}
          <div className="card shadow-lg" style={{marginBottom:14}}>
            <div className="row" style={{alignItems:"center"}}>
              <input className="input" placeholder="Search tasks…" value={q} onChange={e=>setQ(e.target.value)} />
            </div>
          </div>

          {/* Table */}
          <div className="card shadow-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th><th>Due</th><th>With</th><th>Status</th><th>Priority</th><th style={{width:170}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t=>(
                  <tr key={t._id}>
                    <td><strong>{t.title || "—"}</strong></td>
                    <td>{toDateInput(t.dueDate) || "—"}</td>
                    <td>{t.with || "—"}</td>
                    <td>
                      <select className="input" value={t.status || "Open"}
                        onChange={async e=>{
                          const status = e.target.value;
                          await API.patch(`/tasks/${t._id}`, { status });
                          setRows(rs=>rs.map(x=>x._id===t._id?{...x,status}:x));
                        }}>
                        {STATUS.map(s=><option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td>
                      <select className="input" value={t.priority || "Normal"}
                        onChange={async e=>{
                          const priority = e.target.value;
                          await API.patch(`/tasks/${t._id}`, { priority });
                          setRows(rs=>rs.map(x=>x._id===t._id?{...x,priority}:x));
                        }}>
                        {PRIORITY.map(p=><option key={p} value={p}>{p}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="row" style={{gap:8}}>
                        <button className="btn btn-outline" onClick={()=>startEdit(t)}>Edit</button>
                        <button className="btn btn-ghost" onClick={()=>remove(t._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length &&
                  <tr><td colSpan={6} style={{textAlign:"center",padding:20,color:"#64748b"}}>No tasks</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
