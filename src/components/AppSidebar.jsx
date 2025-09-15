import { NavLink } from "react-router-dom";

const Item = ({ to, label, emoji }) => (
  <NavLink to={to} className={({isActive}) => `nav-link ${isActive ? "active" : ""}`}>
    <span style={{marginRight:8}}>{emoji}</span>{label}
  </NavLink>
);

export default function AppSidebar(){
  return (
    <aside className="sidebar">
      <div style={{fontWeight:800, marginBottom:12, letterSpacing:.3}}>Modules</div>

      <Item to="/home" label="Home" emoji="🏠" />

      <div style={{opacity:.9, margin:"12px 0 6px", fontSize:12, textTransform:"uppercase", letterSpacing:.08}}>Sales</div>
      <Item to="/leads" label="Leads" emoji="🧲" />
      <Item to="/contacts" label="Contacts" emoji="👥" />
      {/* <Item to="/accounts" label="Accounts" emoji="🏢" /> */}
      <Item to="/deals" label="Deals" emoji="💼" />
      <Item to="/forecasts" label="Forecasts" emoji="📈" />
      {/* <Item to="/documents" label="Documents" emoji="📄" /> */}
      <Item to="/campaigns" label="Campaigns" emoji="📣" />

      <div style={{opacity:.9, margin:"12px 0 6px", fontSize:12, textTransform:"uppercase", letterSpacing:.08}}>Activities</div>
      <Item to="/tasks" label="Tasks" emoji="✅" />
      <Item to="/meetings" label="Meetings" emoji="📅" />
      <Item to="/calls" label="Calls" emoji="📞" />

      <div style={{opacity:.9, margin:"12px 0 6px", fontSize:12, textTransform:"uppercase", letterSpacing:.08}}>Inventory</div>
      <Item to="/products" label="Products" emoji="📦" />
      <Item to="/quotes" label="Quotes" emoji="🧾" />
      <Item to="/sales-orders" label="Sales Orders" emoji="🧰" />
      <Item to="/invoices" label="Invoices" emoji="🧮" />
    </aside>
  );
}
