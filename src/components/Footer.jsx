export default function Footer(){
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <strong>Zura CRM</strong>
          <p style={{color:"#475569"}}>A modern CRM to help you convert more and build lasting relationships.</p>
          <small>© 2025, Zura Corporation Pvt. Ltd. All Rights Reserved.</small>
        </div>
        <div><strong>Features</strong><ul style={{listStyle:"none", padding:0, lineHeight:2}}><li><a href="#">Leads</a></li><li><a href="#">Deals</a></li><li><a href="#">Activities</a></li></ul></div>
        <div><strong>Platform</strong><ul style={{listStyle:"none", padding:0, lineHeight:2}}><li><a href="#">APIs</a></li><li><a href="#">Integrations</a></li></ul></div>
        <div><strong>Company</strong><ul style={{listStyle:"none", padding:0, lineHeight:2}}><li><a href="#">About</a></li><li><a href="#">Careers</a></li></ul></div>
        <div><strong>Resources</strong><ul style={{listStyle:"none", padding:0, lineHeight:2}}><li><a href="#">Docs</a></li><li><a href="#">Support</a></li></ul></div>
      </div>
    </footer>
  );
}
