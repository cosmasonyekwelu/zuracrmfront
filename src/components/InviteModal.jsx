// src/components/InviteModal.jsx
import { useState } from "react";
import API from "../services/api";

export default function InviteModal({ onClose, onSuccess }) {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("member");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const list = emails
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!list.length) return setError("Enter at least one email");
    setSending(true);
    try {
      await API.post("/users/invite", { emails: list, role, message });
      onSuccess?.();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send invites");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
      <div className="modal">
        <div className="modal-header">
          <h3 id="invite-modal-title">Invite your team</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <form className="modal-body" onSubmit={submit}>
          <label className="form-label">Emails (comma or space separated)</label>
          <textarea
            className="input"
            rows={3}
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="alice@acme.com, bob@acme.com"
          />
          <label className="form-label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="owner">Owner</option>
          </select>
          <label className="form-label">Message (optional)</label>
          <textarea
            className="input"
            rows={2}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hey! Join me on Zura CRM."
          />
          {error && <div className="form-error">{error}</div>}
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={sending}>{sending ? "Sending…" : "Send Invites"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
