/**
 * GET    /quotes?search=
 * POST   /quotes
 * PATCH  /quotes/:id
 * DELETE /quotes/:id
 * GET    /products
 */
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";

const STATUSES = ["Draft", "Sent", "Accepted", "Declined"];
const fmtNGN = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 })
    .format(Number(n || 0));

function calcTotals(items, taxRate = 0) {
  const subtotal = items.reduce((s, i) => s + (Number(i.qty || 0) * Number(i.price || 0)), 0);
  const tax = subtotal * (Number(taxRate || 0) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

const emptyItem = { productId: "", name: "", qty: 1, price: 0 };
const emptyForm = { number: "", account: "", date: "", status: "Draft", taxRate: 0, items: [emptyItem], notes: "" };

export default function Quotes() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);

  useEffect(() => { API.get("/products").then(r => setProducts(r.data || [])).catch(() => {}); }, []);
  const load = async () => { const r = await API.get("/quotes", { params: { search: q } }); setRows(r.data || []); };
  useEffect(() => { load().catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase(); if (!s) return rows;
    return rows.filter(x => (x.number || "").toLowerCase().includes(s) || (x.account || "").toLowerCase().includes(s));
  }, [q, rows]);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const rmItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const onItemChange = (i, patch) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, ...patch } : it) }));

  const { subtotal, tax, total } = calcTotals(form.items, form.taxRate);

  const validItems = (its) => its.filter(it => (it.name || it.productId) && Number(it.qty) > 0);
  const submit = async (e) => {
    e.preventDefault();
    if (!form.account.trim()) { alert("Account is required"); return; }
    const items = validItems(form.items);
    if (!items.length) { alert("Add at least one line item"); return; }
    const payload = { ...form, items, subtotal, tax, total };

    if (editing) {
      const { _id, ...p } = payload;
      await API.patch(`/quotes/${editing}`, p);
      setRows(rs => rs.map(x => x._id === editing ? { ...x, ...p } : x));
    } else {
      const r = await API.post("/quotes", payload);
      setRows(rs => [r.data, ...rs]);
    }
    setForm(emptyForm);
    setEditing(null);
  };

  const remove = async (id) => { if (!confirm("Delete quote?")) return; await API.delete(`/quotes/${id}`); setRows(rs => rs.filter(x => x._id !== id)); };

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />
        <div className="container" style={{ padding: "8px 0" }}>
          <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Quotes</h2>
            <span className="pill pill--sky">Total {filtered.length}</span>
          </div>

          {/* Editor */}
          <div className="card shadow-lg" style={{ marginBottom: 14 }}>
            <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
              <div className="row">
                <input className="input" placeholder="Quote # (auto if empty)" value={form.number} onChange={e => setForm(f => ({ ...f, number: e.target.value }))} />
                <input className="input" placeholder="Account" value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} />
                <input className="input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div className="pill pill--amber">Line items</div>
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead><tr><th style={{ minWidth: 220 }}>Product</th><th>Qty</th><th>Price</th><th>Amount</th><th>Actions</th></tr></thead>
                  <tbody>
                    {form.items.map((it, i) => (
                      <tr key={i}>
                        <td>
                          <select className="input" value={it.productId} onChange={e => {
                            const id = e.target.value; const p = products.find(x => x._id === id);
                            onItemChange(i, { productId: id, name: p?.name || "", price: p?.price || 0 });
                          }}>
                            <option value="">Select product…</option>
                            {products.map(p => (
                              <option key={p._id} value={p._id}>
                                {p.name} ({fmtNGN(p.price)})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td><input className="input" type="number" min="1" value={it.qty} onChange={e => onItemChange(i, { qty: e.target.value === "" ? "" : Number(e.target.value) })} /></td>
                        <td><input className="input" type="number" value={it.price} onChange={e => onItemChange(i, { price: e.target.value === "" ? "" : Number(e.target.value) })} /></td>
                        <td>{fmtNGN(Number(it.qty || 0) * Number(it.price || 0))}</td>
                        <td><button type="button" className="btn btn-ghost" onClick={() => rmItem(i)}>Remove</button></td>
                      </tr>
                    ))}
                    <tr>
                      <td colSpan={5}><button type="button" className="btn btn-outline" onClick={addItem}>+ Add item</button></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="row">
                <input className="input" type="number" placeholder="Tax rate (%)" value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value === "" ? "" : Number(e.target.value) }))} />
                <input className="input" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              <div className="row" style={{ justifyContent: "flex-end", gap: 14 }}>
                <div className="feature-card feature-card--emerald" style={{ minWidth: 240 }}>
                  <div>Subtotal: <strong>{fmtNGN(subtotal)}</strong></div>
                  <div>Tax: <strong>{fmtNGN(tax)}</strong></div>
                  <div>Total: <strong>{fmtNGN(total)}</strong></div>
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <button className="btn btn-primary">{editing ? "Save quote" : "Create quote"}</button>
                  {editing && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => { setEditing(null); setForm(emptyForm); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* List */}
          <div className="card shadow-lg">
            <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
              <input className="input" placeholder="Search quotes…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <table className="table">
              <thead><tr><th>#</th><th>Account</th><th>Date</th><th>Status</th><th>Total</th><th style={{ width: 170 }}>Actions</th></tr></thead>
              <tbody>
                {filtered.map(qu => (
                  <tr key={qu._id}>
                    <td><strong>{qu.number || qu._id.slice(-6).toUpperCase()}</strong></td>
                    <td>{qu.account}</td>
                    <td>{qu.date ? new Date(qu.date).toLocaleDateString() : "—"}</td>
                    <td><span className={`chip ${qu.status === "Accepted" ? "chip--emerald" : qu.status === "Declined" ? "chip--rose" : "chip--amber"}`}>{qu.status}</span></td>
                    <td>{fmtNGN(qu.total)}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <button
                          className="btn btn-outline"
                          onClick={() => {
                            setEditing(qu._id);
                            setForm({
                              number: qu.number || "",
                              account: qu.account || "",
                              date: qu.date ? qu.date.slice(0,10) : "",
                              status: qu.status || "Draft",
                              taxRate: qu.taxRate ?? 0,
                              notes: qu.notes || "",
                              items: (qu.items || []).map(i => ({
                                productId: i.productId || "",
                                name: i.name || "",
                                qty: i.qty ?? 1,
                                price: i.price ?? 0
                              })) || [ { ...emptyItem } ]
                            });
                          }}>
                          Edit
                        </button>
                        <button className="btn btn-ghost" onClick={() => remove(qu._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>No quotes</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
