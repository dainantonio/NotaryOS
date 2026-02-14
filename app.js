/* =========================================================
   File: app.js
   Drop-in full app shell + Dashboard
   - Works with React 18 UMD + Babel standalone (index.html uses type="text/babel")
   - No imports, no package.json, no terminal
   ========================================================= */

const { useEffect, useMemo, useState } = React;

/* -----------------------
   Minimal utilities
------------------------ */

const safeParse = (raw, fallback) => {
  try {
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
};

const DataManager = {
  async get(key) {
    return safeParse(localStorage.getItem(key), []);
  },
  async set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

const showToast = (msg) => {
  // Minimal toast (replace with your own system later)
  console.log("[toast]", msg);
  alert(msg);
};

/* -----------------------
   App Shell
------------------------ */

const PlaceholderView = ({ title, onBack }) => (
  <div className="card">
    <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>{title}</div>
    <div className="theme-text-muted" style={{ fontWeight: 700, marginBottom: 12 }}>
      This is a placeholder view. Your Dashboard navigation works; wire real screens later.
    </div>
    <button className="btn btn-primary" onClick={onBack}>
      Back to Dashboard
    </button>
  </div>
);

const App = () => {
  const [view, setView] = useState("dashboard");
  const [showSettings, setShowSettings] = useState(false);

  const [user, setUser] = useState(() =>
    safeParse(localStorage.getItem("notary_user"), {
      name: "Dain",
      company: "NotaryOS",
    })
  );

  const [appointments, setAppointments] = useState([]);
  const [credentials, setCredentials] = useState([]);

  const hydrate = async () => {
    const [appts, creds] = await Promise.all([
      DataManager.get("notary_appointments"),
      DataManager.get("notary_credentials"),
    ]);
    setAppointments(Array.isArray(appts) ? appts : []);
    setCredentials(Array.isArray(creds) ? creds : []);
  };

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    localStorage.setItem("notary_user", JSON.stringify(user));
  }, [user]);

  const onOpenSettings = () => setShowSettings(true);
  const onCloseSettings = () => setShowSettings(false);

  const content = (() => {
    if (view === "dashboard") {
      return (
        <Dashboard
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
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">N</div>
            <div>
              <div className="logo-text">NotaryOS</div>
              <div className="logo-subtext">Dashboard</div>
            </div>
          </div>
        </div>

        <div className="sidebar-nav">
          <button className={`nav-item ${view === "dashboard" ? "active" : ""}`} onClick={() => setView("dashboard")}>
            <i className="fas fa-grid-2" /> Dashboard
          </button>
          <button className={`nav-item ${view === "schedule" ? "active" : ""}`} onClick={() => setView("schedule")}>
            <i className="fas fa-calendar" /> Schedule
          </button>
          <button className={`nav-item ${view === "journal" ? "active" : ""}`} onClick={() => setView("journal")}>
            <i className="fas fa-book" /> eJournal
          </button>
          <button className={`nav-item ${view === "finances" ? "active" : ""}`} onClick={() => setView("finances")}>
            <i className="fas fa-wallet" /> Finances
          </button>
          <button
            className={`nav-item ${view === "credentials" ? "active" : ""}`}
            onClick={() => setView("credentials")}
          >
            <i className="fas fa-id-card" /> Credentials
          </button>

          <div style={{ padding: "12px 16px" }}>
            <button className="btn btn-secondary" style={{ width: "100%" }} onClick={onOpenSettings}>
              <i className="fas fa-gear" /> Settings
            </button>
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="main-header">
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{user?.company || "Your Business"}</div>
            <div className="theme-text-muted" style={{ fontWeight: 700, fontSize: 12 }}>
              Signed in as {user?.name || "User"}
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
                Tip: this saves to localStorage as <code>notary_user</code>.
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

/* =========================================================
   DASHBOARD (your component as provided)
   ========================================================= */

const formatMoney = (n) => {
  const num = Number(n || 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
};

const formatNYDateLabel = (date = new Date()) => {
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "America/New_York",
    }).format(date);
  } catch (e) {
    return date.toDateString();
  }
};

const startOfMonthKey = (d) => {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const lastNMonthKeys = (n = 12) => {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(startOfMonthKey(d));
  }
  return out;
};

const monthShort = (yyyyMm) => {
  const [y, m] = String(yyyyMm).split("-");
  const dt = new Date(Number(y), Number(m) - 1, 1);
  return dt.toLocaleString("en-US", { month: "short" });
};

const sumFees = (appts) =>
  (Array.isArray(appts) ? appts : []).reduce((acc, a) => acc + Number(a?.fee || 0), 0);

const countTodayJobs = (appts) => {
  const today = new Date().toISOString().slice(0, 10);
  return (Array.isArray(appts) ? appts : []).filter((a) => String(a?.date || "").slice(0, 10) === today).length;
};

const countOpenRisks = ({ credentials }) => {
  const now = Date.now();
  const soonDays = 30;
  const soonMs = soonDays * 24 * 60 * 60 * 1000;

  const creds = Array.isArray(credentials) ? credentials : [];
  const expiring = creds.filter((c) => {
    const exp = c?.expiresAt || c?.expiresOn || c?.expiry || c?.expiration;
    if (!exp) return false;
    const t = typeof exp === "number" ? exp : Date.parse(exp);
    if (!Number.isFinite(t)) return false;
    return t <= now + soonMs;
  }).length;

  return expiring;
};

const deriveRevenueSeries12m = ({ appointments, journal }) => {
  const keys = lastNMonthKeys(12);
  const map = Object.fromEntries(keys.map((k) => [k, 0]));

  const j = Array.isArray(journal) ? journal : [];
  const payments = j.filter((row) => String(row?.docType || "").toLowerCase().includes("payment"));
  if (payments.length) {
    payments.forEach((p) => {
      const k = startOfMonthKey(p?.date || Date.now());
      if (map[k] !== undefined) map[k] += Number(p?.fee || 0);
    });
  } else {
    const appts = Array.isArray(appointments) ? appointments : [];
    appts
      .filter((a) => String(a?.status || "").toLowerCase() === "paid")
      .forEach((a) => {
        const k = startOfMonthKey(a?.date || Date.now());
        if (map[k] !== undefined) map[k] += Number(a?.fee || 0);
      });
  }

  const values = keys.map((k) => map[k] || 0);
  const max = Math.max(1, ...values);
  const norm = values.map((v) => v / max);

  return { keys, labels: keys.map(monthShort), values, norm, max };
};

const buildAreaPath = (normValues, w = 440, h = 140) => {
  const vals = Array.isArray(normValues) ? normValues : [];
  const n = vals.length || 1;
  const step = w / Math.max(1, n - 1);
  const pts = vals.map((v, idx) => {
    const x = Math.round(idx * step);
    const y = Math.round(h - v * (h - 12) - 6);
    return { x, y };
  });

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
  return { area, poly };
};

const useDashboardData = ({ initialAppointments, initialCredentials }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState(Array.isArray(initialAppointments) ? initialAppointments : []);
  const [credentials, setCredentials] = useState(Array.isArray(initialCredentials) ? initialCredentials : []);
  const [journal, setJournal] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [mileage, setMileage] = useState([]);

  const refresh = async () => {
    setError("");
    setLoading(true);
    try {
      const [appts, creds] = await Promise.all([
        DataManager.get("notary_appointments"),
        DataManager.get("notary_credentials"),
      ]);
      setAppointments(Array.isArray(appts) ? appts : []);
      setCredentials(Array.isArray(creds) ? creds : []);

      setJournal(safeParse(localStorage.getItem("notary_journal"), []));
      setExpenses(safeParse(localStorage.getItem("notary_expenses"), []));
      setMileage(safeParse(localStorage.getItem("notary_mileage"), []));
    } catch (e) {
      setError(e?.message || "Unable to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return { loading, error, appointments, credentials, journal, expenses, mileage, refresh };
};

const Donut = ({ size = 64, percent = 86, stroke = "#0d9488", labelSize = 13 }) => {
  const r = Math.round((size / 2 - 4) * 0.875);
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - percent / 100);

  return (
    <div className="f5-donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="f5-donut-svg" aria-label={`Donut ${percent}%`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e8ecf1" strokeWidth="6" />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="f5-donut-label" style={{ fontSize: labelSize }}>
        {percent}%
      </div>
    </div>
  );
};

const SparkLine = ({ points, width = 80, height = 32, stroke = "#334155" }) => (
  <svg width={width} height={height} className="f5-sparkline" style={{ display: "block" }}>
    <polyline
      points={points}
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Dashboard = ({ appointments: initialAppointments, credentials: initialCredentials, setView, user, onOpenSettings }) => {
  const todayLabel = useMemo(() => formatNYDateLabel(new Date()), []);
  const { loading, error, appointments, credentials, journal, expenses, mileage, refresh } = useDashboardData({
    initialAppointments,
    initialCredentials,
  });

  const jobsToday = useMemo(() => countTodayJobs(appointments), [appointments]);
  const potentialRevenue = useMemo(
    () => sumFees(appointments.filter((a) => String(a?.status || "").toLowerCase() !== "paid")),
    [appointments]
  );
  const openRisks = useMemo(() => countOpenRisks({ credentials }), [credentials]);

  const setupSteps = useMemo(() => {
    const profileDone = !!(user?.name || user?.displayName) && !!(user?.company || user?.businessName);
    const apptDone = Array.isArray(appointments) && appointments.length > 0;
    const journalDone = Array.isArray(journal) && journal.length > 0;
    const expenseDone = Array.isArray(expenses) && expenses.length > 0;
    const gpsDone = Array.isArray(mileage) && mileage.length > 0;
    const exportDone = localStorage.getItem("notary_exported_once") === "true";

    const steps = [
      { key: "profile", title: "Profile", done: profileDone, cta: { label: "Update Profile", onClick: () => onOpenSettings?.() } },
      { key: "appointment", title: "First Appointment", done: apptDone, cta: { label: "Go to Schedule", onClick: () => setView?.("schedule") } },
      { key: "journal", title: "First eJournal Entry", done: journalDone, cta: { label: "Go to eJournal", onClick: () => setView?.("journal") } },
      { key: "expense", title: "First Expense", done: expenseDone, cta: { label: "Go to Finances", onClick: () => setView?.("finances") } },
      { key: "gps", title: "GPS Mileage", done: gpsDone, cta: { label: "Open GPS", onClick: () => showToast("Go to Finances → GPS Mileage to start a trip.") } },
      { key: "export", title: "Export Preview", done: exportDone, cta: { label: "Open Export", onClick: () => showToast("Go to Finances → Export to download a CSV.") } },
    ];
    const pct = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
    return { steps, pct };
  }, [user, appointments, journal, expenses, mileage, setView, onOpenSettings]);

  const opsCompleteness = useMemo(() => Math.max(0, Math.min(100, setupSteps.pct || 0)), [setupSteps.pct]);

  const conversionRate = useMemo(() => {
    const total = appointments.length || 0;
    if (!total) return 0;
    const paid = appointments.filter((a) => String(a?.status || "").toLowerCase() === "paid").length;
    return Math.round((paid / total) * 100);
  }, [appointments]);

  const revenue12m = useMemo(() => deriveRevenueSeries12m({ appointments, journal }), [appointments, journal]);
  const chartPath = useMemo(() => buildAreaPath(revenue12m.norm, 440, 140), [revenue12m.norm]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const appts = (Array.isArray(appointments) ? appointments : [])
      .filter((a) => a?.date)
      .map((a) => ({ ...a, _t: Date.parse(a.date) }))
      .filter((a) => Number.isFinite(a._t) && a._t >= now.getTime() - 6 * 60 * 60 * 1000)
      .sort((a, b) => a._t - b._t)
      .slice(0, 3);

    return appts.map((a) => {
      const dt = new Date(a._t);
      const time = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
      return { time, name: a.clientName || a.signer || "Signer", meta: `${a.location || "Location"} · ${a.type || "Signing"}` };
    });
  }, [appointments]);

  const openInvoices = useMemo(() => {
    const unpaid = appointments.filter((a) => String(a?.status || "").toLowerCase() !== "paid");
    return sumFees(unpaid);
  }, [appointments]);

  const actionItems = useMemo(() => {
    const unpaidCount = appointments.filter((a) => String(a?.status || "").toLowerCase() !== "paid").length;
    const expiringCreds = countOpenRisks({ credentials });
    return { unpaidCount, expiringCreds };
  }, [appointments, credentials]);

  const onKpiClick = (target) => setView?.(target);

  return (
    <div className="f5-dash">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>Dashboard</div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4, fontWeight: 700 }}>{todayLabel}</div>
        </div>

        <button className="btn btn-secondary" onClick={refresh} style={{ height: 40 }}>
          <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-rotate"}`} /> Refresh
        </button>
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fff" }}>
          <div style={{ fontWeight: 900, color: "#b91c1c", marginBottom: 6 }}>
            <i className="fas fa-triangle-exclamation" /> Dashboard data error
          </div>
          <div className="theme-text-muted" style={{ fontSize: 13 }}>{error}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <div className="f5-section-title">Today at a Glance</div>
      </div>

      <div className="f5-grid-3" style={{ marginBottom: 14 }}>
        <div className="f5-card f5-kpi" onClick={() => onKpiClick("schedule")} role="button" tabIndex={0}>
          <div className="f5-kpi-label">Jobs Today</div>
          <div className="f5-kpi-row">
            <div className="f5-kpi-value">{jobsToday}</div>
            <div className="f5-kpi-spark"><SparkLine points="0,28 10,22 20,26 30,16 40,20 50,10 60,14 70,20 80,8" /></div>
          </div>
        </div>

        <div className="f5-card f5-kpi" onClick={() => onKpiClick("finances")} role="button" tabIndex={0}>
          <div className="f5-kpi-label">Potential Revenue</div>
          <div className="f5-kpi-row">
            <div className="f5-kpi-value">{formatMoney(potentialRevenue)}</div>
            <span className={`f5-delta ${potentialRevenue > 0 ? "f5-delta-up" : ""}`}>{potentialRevenue > 0 ? "15%" : "0%"}</span>
          </div>
          <div className="f5-kpi-spark" style={{ marginTop: 8 }}>
            <SparkLine width={200} height={28} points="0,24 18,22 36,20 54,24 72,18 90,16 108,18 126,12 144,10 162,8 180,6 200,4" />
          </div>
        </div>

        <div className="f5-card f5-kpi" onClick={() => onKpiClick("credentials")} role="button" tabIndex={0}>
          <div className="f5-kpi-label">Open Risks</div>
          <div className="f5-kpi-row">
            <div className="f5-kpi-value">{openRisks}</div>
            <div className="f5-kpi-spark"><SparkLine points="0,12 10,20 20,8 30,18 40,12 50,20 60,26 70,18 80,10" stroke="#dc2626" /></div>
          </div>
        </div>
      </div>

      <div className="f5-grid-2" style={{ marginBottom: 14 }}>
        <div className="f5-card f5-kpi" onClick={() => onKpiClick("schedule")} role="button" tabIndex={0}>
          <div className="f5-kpi-label">Conversion Rate</div>
          <div className="f5-kpi-row">
            <div className="f5-kpi-value">{conversionRate}%</div>
            <span className={`f5-delta ${conversionRate >= 20 ? "f5-delta-up" : ""}`}>+ 4.5%</span>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="f5-progress-track">
              <div className="f5-progress-fill" style={{ width: `${conversionRate}%`, background: "linear-gradient(90deg,#334155,#64748b)" }} />
            </div>
          </div>
        </div>

        <div className="f5-card f5-kpi" onClick={() => onKpiClick("dashboard")} role="button" tabIndex={0}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div className="f5-kpi-label">Operational Completeness</div>
              <div className="f5-kpi-value">{opsCompleteness}%</div>
              <span className={`f5-delta ${opsCompleteness >= 50 ? "f5-delta-up" : ""}`} style={{ marginTop: 6 }}>+ 6%</span>
            </div>
            <Donut size={64} percent={opsCompleteness} stroke="#0d9488" labelSize={13} />
          </div>
        </div>
      </div>

      <div className="f5-grid-2" style={{ marginBottom: 14 }}>
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginBottom: 12 }}>Quick Actions</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button className="f5-btn-primary" onClick={() => setView?.("journal")}><i className="fas fa-pen-to-square" /> Log Journal Entry</button>
            <button className="f5-btn-secondary" onClick={() => setView?.("finances")}><i className="fas fa-receipt" /> Add Expense</button>
            <button className="f5-btn-secondary" onClick={() => showToast("Wire AI Coach view next.")}><i className="fas fa-robot" /> Ask AI Coach</button>
          </div>
        </div>

        <div className="f5-card">
          <div className="f5-section-title" style={{ marginBottom: 12 }}>Today’s Agenda</div>
          <div style={{ fontSize: 14, color: "#475569", marginBottom: 12, fontWeight: 700 }}>{upcoming.length || 0} upcoming signings</div>
          <button className="f5-btn-primary" onClick={() => setView?.("schedule")}><i className="fas fa-calendar" /> View Schedule</button>
        </div>
      </div>

      <div className="f5-grid-main" style={{ marginBottom: 14 }}>
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginBottom: 16 }}>Operational Status</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, marginBottom: 14 }}>
            <div>
              <div className="f5-kpi-label">Revenue (YTD)</div>
              <div className="f5-kpi-value">{formatMoney(revenue12m.values.reduce((a, b) => a + b, 0))}</div>
              <span className="f5-delta f5-delta-up" style={{ marginTop: 8 }}><i className="fas fa-arrow-trend-up" style={{ fontSize: 11 }} /> 12.5% vs last month</span>
            </div>

            <div>
              <div className="f5-kpi-label" style={{ marginBottom: 10 }}>Sales Pipeline</div>
              <div className="f5-pipeline-track">
                <div className="f5-pipeline-seg" style={{ width: "52%", background: "#1e293b" }} />
                <div className="f5-pipeline-seg" style={{ width: "18%", background: "#475569" }} />
                <div className="f5-pipeline-seg" style={{ width: "30%", background: "#94a3b8" }} />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
            <div className="f5-card" style={{ padding: 16, boxShadow: "none" }}>
              <div className="f5-kpi-label">Open Invoices</div>
              <div className="f5-kpi-value">{formatMoney(openInvoices)}</div>
              <div className="f5-progress-track" style={{ height: 6, marginTop: 10 }}>
                <div className="f5-progress-fill" style={{ width: "45%", background: "linear-gradient(90deg,#334155,#64748b,#94a3b8)" }} />
              </div>
            </div>

            <div className="f5-card" style={{ padding: 16, boxShadow: "none" }}>
              <div className="f5-kpi-label">Compliance Status</div>
              <div className="f5-kpi-value" style={{ color: "#059669" }}>{opsCompleteness}%</div>
              <div className="theme-text-muted" style={{ fontSize: 11, fontWeight: 800 }}>Compliant</div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <div className="f5-section-title" style={{ marginBottom: 0 }}>Revenue Trend</div>
              <div className="f5-section-subtitle">Last 12 Months</div>
            </div>

            <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="f5-chart">
                <div className="f5-chart-grid" style={{ top: 0 }} />
                <div className="f5-chart-grid" style={{ top: "25%" }} />
                <div className="f5-chart-grid" style={{ top: "50%" }} />
                <div className="f5-chart-grid" style={{ top: "75%" }} />
                <div className="f5-chart-grid" style={{ top: "100%" }} />

                <svg viewBox="0 0 440 140" preserveAspectRatio="none" className="f5-chart-area">
                  <defs>
                    <linearGradient id="f5AreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#334155" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#334155" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={chartPath.area} fill="url(#f5AreaGrad)" />
                  <polyline points={chartPath.poly} fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                <div className="f5-chart-x">{revenue12m.labels.map((l) => <span key={l}>{l}</span>)}</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="f5-card">
            <div className="f5-section-title" style={{ marginBottom: 12 }}>Upcoming Signings</div>

            {loading ? (
              <div className="theme-text-muted" style={{ fontSize: 13, fontWeight: 800 }}>
                <i className="fas fa-spinner fa-spin" /> Loading…
              </div>
            ) : upcoming.length ? (
              <>
                {upcoming.map((u, idx) => (
                  <div key={`${u.time}-${idx}`} className="f5-upcoming-item">
                    <div className="f5-upcoming-time">{u.time}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="f5-upcoming-name">{u.name}</div>
                      <div className="f5-upcoming-meta">{u.meta}</div>
                    </div>
                    <i className="fas fa-envelope" style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }} />
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <button className="f5-link" onClick={() => setView?.("schedule")}>
                    View All <i className="fas fa-chevron-right" style={{ fontSize: 10, marginLeft: 4 }} />
                  </button>
                </div>
              </>
            ) : (
              <div className="theme-text-muted" style={{ fontSize: 13, fontWeight: 800 }}>No upcoming signings yet.</div>
            )}
          </div>

          <div className="f5-card">
            <div className="f5-section-title" style={{ marginBottom: 12 }}>Action Items</div>
            <div className="f5-action-item"><div className="f5-action-dot f5-action-dot-ok" /><div className="f5-action-text">{actionItems.unpaidCount} invoices unpaid</div></div>
            <div className="f5-action-item"><div className="f5-action-dot f5-action-dot-warn" /><div className="f5-action-text">{actionItems.expiringCreds} expiring credential(s)</div></div>
          </div>
        </div>
      </div>

      <div className="f5-setup-bar">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Setup Progress</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#64748b" }}>{setupSteps.pct}% Complete</div>
        </div>

        <div className="f5-progress-track">
          <div className="f5-progress-fill" style={{ width: `${setupSteps.pct}%`, background: "linear-gradient(90deg,#3b82f6,#2563eb)" }} />
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          {setupSteps.steps.map((s) => (
            <div key={s.key} className="f5-card" style={{ boxShadow: "none", padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ fontWeight: 900 }}>{s.title}</div>
                {!s.done ? (
                  <button className="f5-btn-secondary" style={{ height: 36, whiteSpace: "nowrap" }} onClick={s.cta.onClick}>
                    {s.cta.label}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
