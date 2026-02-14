/* =========================================================
   File: app.js
   Full App Shell (router) + Mobile Drawer Sidebar
   - Works with React 18 UMD + Babel standalone (type="text/babel")
   - Expects Dashboard component at: window.NotaryOSDashboard.DashboardV2
   ========================================================= */

const { useEffect, useMemo, useState, useCallback } = React;

/* -----------------------
   Small utilities
------------------------ */
const safeParse = (raw, fallback) => {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

const DataManager = window.DataManager || {
  async get(key) {
    return safeParse(localStorage.getItem(key), []);
  },
  async set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const showToast =
  window.showToast ||
  ((msg) => {
    // Minimal fallback; replace with your own toast system later.
    console.log("[toast]", msg);
  });

/* -----------------------
   Placeholder screens
------------------------ */
const PlaceholderView = ({ title, onBack }) => (
  <div className="card">
    <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{title}</div>
    <div className="theme-text-muted" style={{ fontWeight: 700, marginBottom: 12 }}>
      Placeholder view. Wire your real screen later.
    </div>
    <button className="btn btn-primary" onClick={onBack}>
      Back to Dashboard
    </button>
  </div>
);

/* -----------------------
   App Shell
------------------------ */
const App = () => {
  const [view, setView] = useState("dashboard");
  const [showSettings, setShowSettings] = useState(false);

  // Mobile drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  const [user, setUser] = useState(() =>
    safeParse(localStorage.getItem("notary_user"), { name: "You", company: "NotaryOS" })
  );

  const [appointments, setAppointments] = useState([]);
  const [credentials, setCredentials] = useState([]);

  const hydrate = useCallback(async () => {
    const [appts, creds] = await Promise.all([
      DataManager.get("notary_appointments"),
      DataManager.get("notary_credentials"),
    ]);
    setAppointments(Array.isArray(appts) ? appts : []);
    setCredentials(Array.isArray(creds) ? creds : []);
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    localStorage.setItem("notary_user", JSON.stringify(user || {}));
  }, [user]);

  // Auto-close drawer when navigation changes
  useEffect(() => {
    closeSidebar();
  }, [view, closeSidebar]);

  // ESC closes sidebar + settings
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      setSidebarOpen(false);
      setShowSettings(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lock body scroll when drawer open (mobile UX)
  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  const onOpenSettings = () => setShowSettings(true);
  const onCloseSettings = () => setShowSettings(false);

  const NavButton = ({ id, icon, label }) => (
    <button className={`nav-item ${view === id ? "active" : ""}`} onClick={() => setView(id)}>
      <i className={icon} /> {label}
    </button>
  );

  const Dash = window.NotaryOSDashboard?.DashboardV2;

  const content = (() => {
    if (view === "dashboard") {
      if (!Dash) {
        return (
          <div className="card">
            <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
              Dashboard component not loaded
            </div>
            <div className="theme-text-muted" style={{ fontWeight: 700 }}>
              Make sure index.html loads:
              <code style={{ marginLeft: 6 }}>js/components/dashboard/Dashboard.js</code> before <code>app.js</code>.
            </div>
          </div>
        );
      }

      return (
        <Dash
          user={user}
          appointments={appointments}
          credentials={credentials}
          setView={setView}
          onOpenSettings={onOpenSettings}
        />
      );
    }

    if (view === "schedule") return <PlaceholderView title="Schedule" onBack={() => setView("dashboard")} />;
    if (view === "journal") return <PlaceholderView title="eJournal" onBack={() => setView("dashboard")} />;
    if (view === "finances") return <PlaceholderView title="Finances" onBack={() => setView("dashboard")} />;
    if (view === "credentials") return <PlaceholderView title="Credentials" onBack={() => setView("dashboard")} />;

    return <PlaceholderView title="Unknown View" onBack={() => setView("dashboard")} />;
  })();

  return (
    <div className="container">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="sidebar-header">
          <div className="logo" style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="logo-icon">N</div>
              <div>
                <div className="logo-text">NotaryOS</div>
                <div className="logo-subtext">Dashboard</div>
              </div>
            </div>

            {/* Close (X) inside sidebar header (mobile-friendly) */}
            <button
              className="btn btn-secondary"
              onClick={closeSidebar}
              aria-label="Close menu"
              style={{ height: 36, padding: "0 10px", display: "inline-flex" }}
            >
              <i className="fas fa-xmark" />
            </button>
          </div>
        </div>

        <div className="sidebar-nav">
          <NavButton id="dashboard" icon="fas fa-grid-2" label="Dashboard" />
          <NavButton id="schedule" icon="fas fa-calendar" label="Schedule" />
          <NavButton id="journal" icon="fas fa-book" label="eJournal" />
          <NavButton id="finances" icon="fas fa-wallet" label="Finances" />
          <NavButton id="credentials" icon="fas fa-id-card" label="Credentials" />

          <div style={{ padding: "12px 16px" }}>
            <button
              className="btn btn-secondary"
              style={{ width: "100%" }}
              onClick={() => {
                closeSidebar();
                onOpenSettings();
              }}
            >
              <i className="fas fa-gear" /> Settings
            </button>
          </div>
        </div>
      </div>

      {/* Overlay closes drawer */}
      {sidebarOpen ? <div className="shell-drawer-overlay" onClick={closeSidebar} /> : null}

      <div className="main-content">
        <div className="main-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Hamburger (mobile) */}
            <button className="shell-hamburger" onClick={toggleSidebar} aria-label="Open menu">
              <i className="fas fa-bars" />
            </button>

            <div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>{user?.company || "Your Business"}</div>
              <div className="theme-text-muted" style={{ fontWeight: 700, fontSize: 12 }}>
                Signed in as {user?.name || "User"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-secondary" onClick={hydrate}>
              <i className="fas fa-rotate" /> Reload data
            </button>
          </div>
        </div>

        {content}
      </div>

      {/* Settings modal */}
      {showSettings ? (
        <div className="modal-overlay" onClick={onCloseSettings}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Settings</div>
              <button className="btn btn-secondary" onClick={onCloseSettings}>
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <div className="theme-text-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Name
                </div>
                <input
                  className="input"
                  value={user?.name || ""}
                  onChange={(e) => setUser((u) => ({ ...(u || {}), name: e.target.value }))}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div className="theme-text-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                  Company
                </div>
                <input
                  className="input"
                  value={user?.company || ""}
                  onChange={(e) => setUser((u) => ({ ...(u || {}), company: e.target.value }))}
                />
              </label>

              <div className="theme-text-muted" style={{ fontSize: 12, fontWeight: 700 }}>
                Saves to <code>notary_user</code> in localStorage.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

/* -----------------------
   Mount
------------------------ */
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
