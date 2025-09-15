// src/pages/Documents.jsx
/**
 * GET    /documents             -> [{_id,name,url,type,sizeKb,uploadedAt}]
 * POST   /documents (multipart) -> file object (or {file})
 * DELETE /documents/:id
 */
import { useEffect, useState } from "react";
import API from "../services/api";
import AppSidebar from "../components/AppSidebar.jsx";
import HeaderBar from "../components/HeaderBar.jsx";

const asArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

export default function Documents() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    try {
      const r = await API.get("/documents");
      setRows(asArray(r.data));
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Failed to load documents");
      setRows([]);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      // do NOT set Content-Type manually (axios will set the multipart boundary)
      const r = await API.post("/documents", fd);
      const item = r.data?.file || r.data; // accept either shape
      if (item?._id) setRows((rs) => [item, ...rs]);
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Upload failed");
    } finally {
      setBusy(false);
      // allow re-selecting the same file
      e.target.value = "";
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete document?")) return;
    setErr("");
    try {
      await API.delete(`/documents/${id}`);
      setRows((rs) => rs.filter((x) => x._id !== id));
    } catch (ex) {
      setErr(ex?.response?.data?.message || ex?.message || "Delete failed");
    }
  };

  const fmtSize = (kb) => {
    if (!kb && kb !== 0) return "—";
    if (kb > 1024) return `${(kb / 1024).toFixed(1)} MB`;
    return `${kb.toLocaleString()} KB`;
  };

  return (
    <div className="app">
      <AppSidebar />
      <main className="main">
        <HeaderBar />
        <div className="container" style={{ padding: "8px 0" }}>
          <div className="row" style={{ alignItems: "center", marginBottom: 10 }}>
            <h2 style={{ margin: 0 }}>Documents</h2>

            <label className="btn btn-primary" style={{ display: "inline-block" }}>
              {busy ? "Uploading…" : "Upload"}
              <input
                type="file"
                onChange={upload}
                accept=".pdf,.png,.jpg,.jpeg,.gif,.csv,.xls,.xlsx,.doc,.docx,.ppt,.pptx,.txt"
                style={{ display: "none" }}
              />
            </label>

            {err && (
              <span className="note err" style={{ marginLeft: 10 }}>
                {String(err)}
              </span>
            )}
          </div>

          <div className="card shadow-lg">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                  <th style={{ width: 180 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d._id}>
                    <td>
                      {d.url ? (
                        <a href={d.url} target="_blank" rel="noreferrer">
                          {d.name}
                        </a>
                      ) : (
                        d.name
                      )}
                    </td>
                    <td>
                      <span className="chip">{(d.type || "file").toString().toUpperCase()}</span>
                    </td>
                    <td>{fmtSize(d.sizeKb)}</td>
                    <td>{d.uploadedAt ? new Date(d.uploadedAt).toLocaleString() : "—"}</td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        {d.url && (
                          <a className="btn btn-outline" href={d.url} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        )}
                        <button className="btn btn-ghost" onClick={() => remove(d._id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 20, color: "#64748b" }}>
                      No documents
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
