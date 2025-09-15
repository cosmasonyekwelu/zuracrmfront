import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";

const EMPTY = { name: "", sku: "", price: "", description: "" };

export default function Products(){
  const [rows,setRows]=useState([]);
  const [q,setQ]=useState("");
  const [form,setForm]=useState(EMPTY);
  const [editing,setEditing]=useState(null);
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");

  const load = async () => {
    setErr("");
    try {
      const params = q.trim() ? { search:q.trim() } : undefined; // <-- don’t send empty
      const r = await API.get("/products", { params,
        validateStatus: s => (s >= 200 && s < 300) || s === 404 || s === 400
      });
      if (r.status >= 400) throw new Error(r.data?.message || "Failed to load products");
      setRows(Array.isArray(r.data) ? r.data : (r.data?.items ?? []));
    } catch (e) {
      setErr(e?.message || "Could not load products");
      setRows([]);
    }
  };
  useEffect(()=>{ load(); },[]);
  useEffect(()=>{ const t=setTimeout(load,250); return ()=>clearTimeout(t); },[q]);

  const toForm = (p) => ({
    name: p?.name ?? "",
    sku: p?.sku ?? "",
    price: p?.price === 0 ? "0" : (p?.price ?? ""),
    description: p?.description ?? ""
  });

  const startEdit = (p) => { setEditing(p._id); setForm(toForm(p)); };
  const cancel = () => { setEditing(null); setForm(EMPTY); };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const payload = {
        name: (form.name || "").trim(),
        sku: (form.sku || "").trim(),
        description: (form.description || "").trim(),
        price: form.price === "" ? 0 : Number(form.price)
      };
      if (!payload.name || !payload.sku) throw new Error("Name and SKU are required");

      if (editing) {
        const r = await API.patch(`/products/${editing}`, payload);
        const updated = r.data ?? { _id: editing, ...payload };
        setRows(rs => rs.map(x => x._id === editing ? { ...x, ...updated } : x));
      } else {
        const r = await API.post("/products", payload);
        setRows(rs => [r.data, ...rs]);
      }
      cancel();
    } catch (e) {
      setErr(e?.message || "Save failed");
    } finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!confirm("Delete product?")) return;
    try {
      await API.delete(`/products/${id}`);
      setRows(rs => rs.filter(x => x._id !== id));
    } catch (e) {
      alert(e?.message || "Delete failed");
    }
  };

  const filtered = useMemo(()=>{
    const s=q.trim().toLowerCase(); if(!s) return rows;
    return rows.filter(p =>
      (p.name||"").toLowerCase().includes(s) ||
      (p.sku||"").toLowerCase().includes(s) ||
      (p.description||"").toLowerCase().includes(s)
    );
  },[q,rows]);

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />
        <div className="container" style={{padding:"8px 0"}}>
          <div className="row" style={{alignItems:"center", marginBottom:10}}>
            <h2 style={{margin:0}}>Products</h2>
            <span className="pill pill--sky">Total {filtered.length}</span>
          </div>

          <div className="card shadow-lg" style={{marginBottom:14}}>
            <form onSubmit={submit} className="row" style={{flexWrap:"wrap", gap:10}}>
              <input className="input" placeholder="Name"
                     value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
              <input className="input" placeholder="SKU"
                     value={form.sku} onChange={e=>setForm(f=>({...f,sku:e.target.value}))}/>
              <input className="input" type="number" step="0.01" placeholder="Price"
                     value={form.price} onChange={e=>setForm(f=>({...f,price:e.target.value}))}/>
              <input className="input" placeholder="Description"
                     value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/>
              <div className="row" style={{gap:10}}>
                <button className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : (editing ? "Save" : "Add product")}
                </button>
                {editing && <button type="button" className="btn btn-ghost" onClick={cancel}>Cancel</button>}
              </div>
            </form>
            {err && <div className="note err" style={{marginTop:8}}>{err}</div>}
          </div>

          <div className="card shadow-lg">
            <div className="row" style={{alignItems:"center",marginBottom:10}}>
              <input className="input" placeholder="Search products…"
                     value={q} onChange={e=>setQ(e.target.value)} />
            </div>

            <table className="table">
              <thead><tr><th>Name</th><th>SKU</th><th>Price</th><th>Description</th><th style={{width:150}}>Actions</th></tr></thead>
              <tbody>
                {filtered.map(p=>(
                  <tr key={p._id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.sku || "—"}</td>
                    <td>₦{Number(p.price||0).toLocaleString()}</td>
                    <td>{p.description || "—"}</td>
                    <td>
                      <div className="row" style={{gap:8}}>
                        <button className="btn btn-outline" onClick={()=>startEdit(p)}>Edit</button>
                        <button className="btn btn-ghost" onClick={()=>remove(p._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={5} style={{textAlign:"center",padding:20,color:"#64748b"}}>No products</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
