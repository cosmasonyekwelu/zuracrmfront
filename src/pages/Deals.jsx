// src/pages/Tasks.jsx
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
  const [err,setErr]       = useState("");

  // filters/sort
  const [fStatus,setFStatus] = useState("All");
  const [fPriority,setFPriority] = useState("All");
  const [fDueFrom,setFDueFrom] = useState("");
  const [fDueTo,setFDueTo]     = useState("");
  const [onlyOverdue,setOnlyOverdue] = useState(false);
  const [sortBy,setSortBy] = useState("due"); // due|updated|created|priority|status|title
  const [sortDir,setSortDir] = useState("asc");

  const load = async () => {
    setErr("");
    try {
      const r = await API.get("/tasks",{ params:{ search:q }});
      const list = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
      setRows(list);
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Failed to load tasks");
      setRows([]);
    }
  };

  useEffect(()=>{ load().catch(()=>{}); },[]);
  useEffect(()=>{ const t=setTimeout(load,250); return ()=>clearTimeout(t); },[q]);

  const filtered = useMemo(()=>{
    const s = q.trim().toLowerCase();
    let arr = rows.filter(t =>
      (!s ||
        (t.title||"").toLowerCase().includes(s) ||
        (t.with||"").toLowerCase().includes(s) ||
        (t.status||"").toLowerCase().includes(s))
    );

    if (fStatus !== "All")   arr = arr.filter(t => (t.status||"") === fStatus);
    if (fPriority !== "All") arr = arr.filter(t => (t.priority||"") === fPriority);
    if (fDueFrom)            arr = arr.filter(t => t.dueDate && new Date(t.dueDate) >= new Date(fDueFrom));
    if (fDueTo)              arr = arr.filter(t => t.dueDate && new Date(t.dueDate) <= new Date(fDueTo));
    if (onlyOverdue)         arr = arr.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed");

    const cmp = {
      title:   (a,b)=> String(a.title||"").localeCompare(String(b.title||"")),
      due:     (a,b)=> new Date(a.dueDate||0) - new Date(b.dueDate||0),
      created: (a,b)=> new Date(a.createdAt||0) - new Date(b.createdAt||0),
      updated: (a,b)=> new Date(a.updatedAt||0) - new Date(b.updatedAt||0),
      priority:(a,b)=> String(a.priority||"").localeCompare(String(b.priority||"")),
      status:  (a,b)=> String(a.status||"").localeCompare(String(b.status||"")),
    }[sortBy] || ((a,b)=>0);

    arr.sort(cmp);
    if (sortDir === "desc") arr.reverse();
    return arr;
  },[rows,q,fStatus,fPriority,fDueFrom,fDueTo,onlyOverdue,sortBy,sortDir]);

  const startEdit = (row) => {
    setEditing(row._id);
    setErr("");
    setForm({
      title:    row.title || "",
      dueDate:  toDateInput(row.dueDate),
      withName: row.with || "",
      status:   row.status || "Open",
      priority: row.priority || "Normal",
      notes:    row.notes || "",
    });
  };

  const cancel = ()=>{ setEditing(null); setForm(EMPTY); setErr(""); };

  const validate = ()=>{
    if (!String(form.title||"").trim()) return "Title is required";
    if (form.dueDate && Number.isNaN(new Date(form.dueDate).getTime())) return "Invalid due date";
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v){ setErr(v); return; }
    setBusy(true);
    try{
      const payload = {
        title:    String(form.title||"").trim(),
        dueDate:  form.dueDate ? new Date(form.dueDate).toISOString() : null,
        with:     String(form.withName||"").trim(),
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
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Save failed");
    } finally { setBusy(false); }
  };

  const remove = async (id)=>{
    if(!confirm("Delete this task?")) return;
    try{
      await API.delete(`/tasks/${id}`);
      setRows(rs=>rs.filter(x=>x._id!==id));
    }catch(ex){
      setErr(ex?.response?.data?.message || ex?.message || "Delete failed");
    }
  };

  const mark = async (t, nextStatus)=>{
    try{
      await API.patch(`/tasks/${t._id}`, { status: nextStatus });
      setRows(rs=>rs.map(x=>x._id===t._id ? { ...x, status: nextStatus } : x));
    }catch(ex){
      setErr(ex?.response?.data?.message || ex?.message || "Update failed");
    }
  };

  const today = ()=> new Date().toISOString().slice(0,10);
  const plusDays = (n)=> new Date(Date.now()+n*86400000).toISOString().slice(0,10);

  const isOverdue = (t)=> t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "Completed";

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />
        <div className="container" style={{padding:"8px 0"}}>
          <div className="row" style={{alignItems:"center", marginBottom:10, gap:10}}>
            <h2 style={{margin:0}}>Tasks</h2>
            <span className="pill pill--sky">Total {filtered.length}</span>
            {err && <span className="note err">{err}</span>}
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
              <div className="row" style={{gap:6}}>
                <button type="button" className="btn btn-ghost" onClick={()=>setForm(f=>({...f,dueDate:today()}))}>Today</button>
                <button type="button" className="btn btn-ghost" onClick={()=>setForm(f=>({...f,dueDate:plusDays(1)}))}>Tomorrow</button>
                <button type="button" className="btn btn-ghost" onClick={()=>setForm(f=>({...f,dueDate:plusDays(7)}))}>+1 week</button>
              </div>
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
            <div className="row" style={{alignItems:"center", gap:10, flexWrap:"wrap"}}>
              <input className="input" placeholder="Search tasks…" value={q} onChange={e=>setQ(e.target.value)} />
              <select className="input" value={fStatus} onChange={e=>setFStatus(e.target.value)}>
                {["All", ...STATUS].map(s=><option key={s} value={s}>{s}</option>)}
              </select>
              <select className="input" value={fPriority} onChange={e=>setFPriority(e.target.value)}>
                {["All", ...PRIORITY].map(p=><option key={p} value={p}>{p}</option>)}
              </select>
              <input className="input" type="date" value={fDueFrom} onChange={e=>setFDueFrom(e.target.value)} title="Due from"/>
              <input className="input" type="date" value={fDueTo} onChange={e=>setFDueTo(e.target.value)} title="Due to"/>
              <label className="row" style={{gap:6}}>
                <input type="checkbox" checked={onlyOverdue} onChange={e=>setOnlyOverdue(e.target.checked)} />
                <span className="tiny">Overdue only</span>
              </label>
              <select className="input" value={sortBy} onChange={e=>setSortBy(e.target.value)}>
                <option value="due">Sort: Due</option>
                <option value="updated">Sort: Updated</option>
                <option value="created">Sort: Created</option>
                <option value="title">Sort: Title</option>
                <option value="priority">Sort: Priority</option>
                <option value="status">Sort: Status</option>
              </select>
              <select className="input" value={sortDir} onChange={e=>setSortDir(e.target.value)}>
                <option value="asc">Asc</option>
                <option value="desc">Desc</option>
              </select>
              <button className="btn btn-ghost" onClick={()=>{
                setQ(""); setFStatus("All"); setFPriority("All"); setFDueFrom(""); setFDueTo(""); setOnlyOverdue(false);
              }}>Reset</button>
            </div>
          </div>

          {/* Table */}
          <div className="card shadow-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th><th>Due</th><th>With</th><th>Status</th><th>Priority</th><th style={{width:230}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t=>{
                  const overdue = isOverdue(t);
                  return (
                  <tr key={t._id} style={overdue ? { background:"#fff7ed" } : null}>
                    <td><strong>{t.title || "—"}</strong>{t.notes ? <div className="tiny" style={{opacity:.7}}>{t.notes}</div> : null}</td>
                    <td>{toDateInput(t.dueDate) || "—"}{overdue && <span className="pill" style={{marginLeft:6, background:"#fca5a5"}}>Overdue</span>}</td>
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
                      <div className="row" style={{gap:8, flexWrap:"wrap"}}>
                        {t.status !== "Completed"
                          ? <button className="btn" onClick={()=>mark(t,"Completed")}>Complete</button>
                          : <button className="btn" onClick={()=>mark(t,"Open")}>Reopen</button>}
                        <button className="btn btn-outline" onClick={()=>startEdit(t)}>Edit</button>
                        <button className="btn btn-ghost" onClick={()=>remove(t._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                )})}
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
