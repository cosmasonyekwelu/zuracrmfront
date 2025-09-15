// src/pages/setup/InviteTeam.jsx
import InviteModal from "../../components/InviteModal.jsx";
export default function InviteTeam() {
  return (
    <div className="page pad">
      <h2>Invite your team</h2>
      <p>Send invitations to teammates to collaborate in your CRM.</p>
      <InviteModal onClose={() => (window.history.back())} onSuccess={() => (window.history.back())} />
    </div>
  );
}
