// src/App.jsx
import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { OnboardingProvider } from "./context/OnboardingContext.jsx";

// Eager pages (public)
import Landing from "./pages/Landing.jsx";
import SignIn from "./pages/SignIn.jsx";
import SignUp from "./pages/SignUp.jsx";
import Home from "./pages/Home.jsx";
import NotFound from "./pages/NotFound.jsx";
import Demo from "./pages/Demo.jsx";
import Contact from "./pages/Contact.jsx";

// Lazy pages (private)
const SearchPage        = lazy(() => import("./pages/SearchPage.jsx"));
const Leads             = lazy(() => import("./pages/Leads.jsx"));
const Contacts          = lazy(() => import("./pages/Contacts.jsx"));
const Deals             = lazy(() => import("./pages/Deals.jsx"));
const Activities        = lazy(() => import("./pages/Activities.jsx"));
const Tasks             = lazy(() => import("./pages/Tasks.jsx"));
const Meetings          = lazy(() => import("./pages/Meetings.jsx"));
const Calls             = lazy(() => import("./pages/Calls.jsx"));
const Products          = lazy(() => import("./pages/Products.jsx"));
const Quotes            = lazy(() => import("./pages/Quotes.jsx"));
const SalesOrder        = lazy(() => import("./pages/SalesOrder.jsx"));
const Invoice           = lazy(() => import("./pages/Invoice.jsx"));
const Forecasts         = lazy(() => import("./pages/Forecasts.jsx"));
const Campaigns         = lazy(() => import("./pages/Campaigns.jsx"));
const Documents         = lazy(() => import("./pages/Documents.jsx"));
const InviteTeam        = lazy(() => import("./pages/setup/InviteTeam.jsx"));
const ConfigurePipeline = lazy(() => import("./pages/setup/ConfigurePipeline.jsx"));
const ConnectEmail      = lazy(() => import("./pages/setup/ConnectEmail.jsx"));
const MigrateData       = lazy(() => import("./pages/setup/MigrateData.jsx"));
const Integrations      = lazy(() => import("./pages/setup/Integrations.jsx"));

// Settings (private)
const PersonalSettings  = lazy(() => import("./pages/settings/PersonalSettings.jsx"));
const Users             = lazy(() => import("./pages/settings/Users.jsx"));
const CompanySettings   = lazy(() => import("./pages/settings/CompanySettings.jsx"));
const CalendarSettings  = lazy(() => import("./pages/settings/CalendarBooking.jsx"));
const SecurityPolicies  = lazy(() => import("./pages/settings/SecurityPolicies.jsx"));
const RolesSharing      = lazy(() => import("./pages/settings/RolesSharing.jsx"));
const AuditLog          = lazy(() => import("./pages/settings/AuditLog.jsx"));
const EmailSettings     = lazy(() => import("./pages/settings/EmailSettings.jsx"));

function FullPageLoader() {
  return (
    <div className="container" style={{ padding: 24 }}>
      Loading…
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

/**
 * RequireAuth:
 * - Works for both token and cookie-session modes.
 * - Does NOT call /auth/me on public pages.
 * - On private routes, tries hydrate() once if not already authenticated.
 */
function RequireAuth({ roles, children }) {
  const { user, token, isAuthenticated, hydrate, loading } = useAuth();
  const [checking, setChecking] = useState(false);
  const [ok, setOk] = useState(isAuthenticated);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (isAuthenticated) { setOk(true); return; }
      setChecking(true);
      const u = await hydrate();      // returns user or null
      if (!alive) return;
      setOk(Boolean(u));
      setChecking(false);
    })();
    return () => { alive = false; };
  }, [isAuthenticated, hydrate]);

  if (loading || checking) return <FullPageLoader />;
  if (!ok) return <Navigate to="/signin" replace />;

  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to="/home" replace />;
  }
  return children;
}

/** PublicOnly:
 * - If already authenticated, bounce to /home.
 */
function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return isAuthenticated ? <Navigate to="/home" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <Suspense fallback={<FullPageLoader />}>
          <ScrollToTop />
          <Routes>
            {/* Public */}
            <Route path="/"         element={<PublicOnly><Landing /></PublicOnly>} />
            <Route path="/signin"   element={<PublicOnly><SignIn /></PublicOnly>} />
            <Route path="/signup"   element={<PublicOnly><SignUp /></PublicOnly>} />
            <Route path="/demo"     element={<Demo />} />
            <Route path="/contact"  element={<Contact />} />

            {/* Private - Home & Search */}
            <Route
              path="/home"
              element={
                <RequireAuth>
                  <Home />
                </RequireAuth>
              }
            />
            <Route
              path="/search"
              element={
                <RequireAuth>
                  <SearchPage />
                </RequireAuth>
              }
            />

            {/* Core CRM */}
            <Route path="/leads"      element={<RequireAuth><Leads /></RequireAuth>} />
            <Route path="/contacts"   element={<RequireAuth><Contacts /></RequireAuth>} />
            <Route path="/deals"      element={<RequireAuth><Deals /></RequireAuth>} />
            <Route path="/activities" element={<RequireAuth><Activities /></RequireAuth>} />
            <Route path="/tasks"      element={<RequireAuth><Tasks /></RequireAuth>} />
            <Route path="/meetings"   element={<RequireAuth><Meetings /></RequireAuth>} />
            <Route path="/calls"      element={<RequireAuth><Calls /></RequireAuth>} />

            {/* Catalog / Sales docs */}
            <Route path="/products"     element={<RequireAuth><Products /></RequireAuth>} />
            <Route path="/quotes"       element={<RequireAuth><Quotes /></RequireAuth>} />
            <Route path="/sales-orders" element={<RequireAuth><SalesOrder /></RequireAuth>} />
            <Route path="/invoices"     element={<RequireAuth><Invoice /></RequireAuth>} />

            {/* Optional modules */}
            <Route path="/forecasts" element={<RequireAuth><Forecasts /></RequireAuth>} />
            <Route path="/campaigns" element={<RequireAuth><Campaigns /></RequireAuth>} />
            <Route path="/documents" element={<RequireAuth><Documents /></RequireAuth>} />

            {/* Setup */}
            <Route path="/setup/invite"       element={<RequireAuth><InviteTeam /></RequireAuth>} />
            <Route path="/setup/pipeline"     element={<RequireAuth><ConfigurePipeline /></RequireAuth>} />
            <Route path="/setup/email"        element={<RequireAuth><ConnectEmail /></RequireAuth>} />
            <Route path="/setup/import"       element={<RequireAuth><MigrateData /></RequireAuth>} />
            <Route path="/setup/integrations" element={<RequireAuth><Integrations /></RequireAuth>} />

            {/* Settings */}
            <Route path="/settings"           element={<Navigate to="/settings/personal" replace />} />
            <Route path="/settings/personal"  element={<RequireAuth><PersonalSettings /></RequireAuth>} />
            <Route path="/settings/users"     element={<RequireAuth roles={["admin"]}><Users /></RequireAuth>} />
            <Route path="/settings/company"   element={<RequireAuth roles={["admin"]}><CompanySettings /></RequireAuth>} />
            <Route path="/settings/calendar"  element={<RequireAuth><CalendarSettings /></RequireAuth>} />
            <Route path="/settings/security"  element={<RequireAuth roles={["admin"]}><SecurityPolicies /></RequireAuth>} />
            <Route path="/settings/roles"     element={<RequireAuth roles={["admin"]}><RolesSharing /></RequireAuth>} />
            <Route path="/settings/audit"     element={<RequireAuth roles={["admin"]}><AuditLog /></RequireAuth>} />
            <Route path="/settings/email"     element={<RequireAuth><EmailSettings /></RequireAuth>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </OnboardingProvider>
    </AuthProvider>
  );
}
