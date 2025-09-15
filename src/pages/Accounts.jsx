// /**
//  * GET    /accounts?search= -> [{_id,name,industry,phone,website}]
//  * POST   /accounts
//  * PATCH  /accounts/:id
//  * DELETE /accounts/:id
//  */
// import { useEffect, useMemo, useState } from "react";
// import API from "../services/api";
// import AppSidebar from "../components/AppSidebar.jsx";
// import HeaderBar from "../components/HeaderBar.jsx";

// const EMPTY = { name: "", industry: "", phone: "", website: "" };

// const withProtocol = (url = "") => {
//   if (!url) return "";
//   if (/^https?:\/\//i.test(url)) return url;
//   return `https://${url}`;
// };

// export default function Accounts(){
//   const [rows, setRows]   = useState([]);
//   const [q, setQ]         = useState("");
//   const [form, setForm]   = useState(EMPTY);
//   const [editing, setEditing] = useState(null);
//   const [busy, setBusy]   = useState(false);

//   const load = async () => {
//     try {
//       const r = await API.get("/accounts", { params: { search: q } });
//       // ensure array for safety
//       const list = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
//       setRows(list);
//     } catch (_) {
//       setRows([]);
//     }
//   };

//   useEffect(() => { load(); }, []); // initial
//   useEffect(() => {
//     const t = setTimeout(load, 250);
//     return () => clearTimeout(t);
//   }, [q]);

//   const submit = async (e) => {
//     e.preventDefault();
//     setBusy(true);
//     try {
//       // normalize payload to strings
//       const payload = {
//         name: String(form.name || "").trim(),
//         industry: String(form.industry || "").trim(),
//         phone: String(form.phone || "").trim(),
//         website: String(form.website || "").trim(),
//       };

//       if (editing) {
//         await API.patch(`/accounts/${editing}`, payload);
//         setRows(rs => rs.map(x => x._id === editing ? { ...x, ...payload } : x));
//       } else {
//         const r = await API.post("/accounts", payload);
//         setRows(rs => [r.data, ...rs]);
//       }
//       setForm(EMPTY);
//       setEditing(null);
//     } finally {
//       setBusy(false);
//     }
//   };

//   const remove = async (id) => {
//     if (!confirm("Delete account?")) return;
//     await API.delete(`/accounts/${id}`);
//     setRows(rs => rs.filter(x => x._id !== id));
//   };

//   const filtered = useMemo(() => {
//     const s = q.trim().toLowerCase();
//     if (!s) return rows;
//     return rows.filter(a =>
//       (a.name || "").toLowerCase().includes(s) ||
//       (a.industry || "").toLowerCase().includes(s)
//     );
//   }, [q, rows]);

//   return (
//     <div className="app">
//       <AppSidebar />
//       <main className="main">
//         <HeaderBar />
//         <div className="container" style={{ padding: "8px 0" }}>
//           <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
//             <h2 style={{ margin: 0 }}>Accounts</h2>
//             <span className="pill pill--sky">Total {filtered.length}</span>
//           </div>

//           <div className="card shadow-lg" style={{ marginBottom: 14 }}>
//             <form onSubmit={submit} className="row" style={{ flexWrap: "wrap", gap: 10 }}>
//               <input className="input" placeholder="Account name"
//                 value={form.name}
//                 onChange={e => setForm(f => ({ ...f, name: e.target.value }))}/>
//               <input className="input" placeholder="Industry"
//                 value={form.industry}
//                 onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}/>
//               <input className="input" placeholder="Phone"
//                 value={form.phone}
//                 onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}/>
//               <input className="input" placeholder="Website"
//                 value={form.website}
//                 onChange={e => setForm(f => ({ ...f, website: e.target.value }))}/>
//               <div className="row" style={{ gap: 10 }}>
//                 <button className="btn btn-primary" disabled={busy}>
//                   {busy ? "Saving…" : (editing ? "Save" : "Add account")}
//                 </button>
//                 {editing &&
//                   <button type="button" className="btn btn-ghost"
//                     onClick={() => { setEditing(null); setForm(EMPTY); }}>
//                     Cancel
//                   </button>}
//               </div>
//             </form>
//           </div>

//           <div className="card shadow-lg">
//             <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
//               <input className="input" placeholder="Search accounts…"
//                 value={q} onChange={e => setQ(e.target.value)} />
//             </div>

//             <table className="table">
//               <thead>
//                 <tr><th>Name</th><th>Industry</th><th>Phone</th><th>Website</th><th style={{ width: 150 }}>Actions</th></tr>
//               </thead>
//               <tbody>
//                 {filtered.map(a => (
//                   <tr key={a._id}>
//                     <td><strong>{a.name}</strong></td>
//                     <td>{a.industry || "—"}</td>
//                     <td>{a.phone || "—"}</td>
//                     <td>{a.website
//                       ? <a href={withProtocol(a.website)} target="_blank" rel="noreferrer">{a.website}</a>
//                       : "—"}
//                     </td>
//                     <td>
//                       <div className="row" style={{ gap: 8 }}>
//                         <button className="btn btn-outline" onClick={() => { setEditing(a._id); setForm({
//                           name: a.name || "",
//                           industry: a.industry || "",
//                           phone: a.phone || "",
//                           website: a.website || "",
//                           _id: a._id
//                         }); }}>Edit</button>
//                         <button className="btn btn-ghost" onClick={() => remove(a._id)}>Delete</button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//                 {!filtered.length &&
//                   <tr><td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
//                     No accounts
//                   </td></tr>}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       </main>
//     </div>
//   );
// }
