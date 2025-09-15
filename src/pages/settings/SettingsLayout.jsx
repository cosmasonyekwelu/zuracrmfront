import SettingsSidebar from "../../components/SettingsSidebar.jsx";

export default function SettingsLayout({ children }){
  return (
    <div className="app">
      <SettingsSidebar />
      <main className="main">
        <div className="container" style={{ padding:"10px 0" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
