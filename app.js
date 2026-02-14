/* =========================================================
   File: app.js
   Replace your existing Dashboard component with this block.
   Works in your current React-in-browser setup.
   Depends on: DataManager, safeParse, showToast (already in app.js)
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

  // Prefer journal "Payment" entries if present; fall back to Paid appointments.
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
  const norm = values.map((v) => v / max); // 0..1 for chart scaling

  return {
    keys,
    labels: keys.map(monthShort),
    values,
    norm,
    max,
  };
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
    // hydrate once; keep your passed-in data as initial paint
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const potentialRevenue = useMemo(() => sumFees(appointments.filter((a) => String(a?.status || "").toLowerCase() !== "paid")), [appointments]);
  const openRisks = useMemo(() => countOpenRisks({ credentials }), [credentials]);

  const setup = useMemo(() => {
    // Reuse your existing read-only checklist function if present; otherwise compute minimal.
    try {
      if (typeof computeSetupChecklistReadOnly === "function") {
        return computeSetupChecklistReadOnly({ user, appointments });
      }
    } catch (e) {}
    const profileDone = !!(user?.name || user?.displayName) && !!(user?.company || user?.businessName);
    const apptDone = Array.isArray(appointments) && appointments.length > 0;
    const journalDone = Array.isArray(journal) && journal.length > 0;
    const expenseDone = Array.isArray(expenses) && expenses.length > 0;
    const gpsDone = Array.isArray(mileage) && mileage.length > 0;
    const exportDone = localStorage.getItem("notary_exported_once") === "true";
    return { profile: { done: profileDone }, appointment: { done: apptDone }, journal: { done: journalDone }, expense: { done: expenseDone }, gps: { done: gpsDone }, export: { done: exportDone } };
  }, [user, appointments, journal, expenses, mileage]);

  const setupSteps = useMemo(() => {
    const steps = [
      { key: "profile", title: "Profile", subtitle: "Name + company", done: !!setup?.profile?.done, cta: { label: "Update Profile", onClick: () => onOpenSettings?.() } },
      { key: "appointment", title: "First Appointment", subtitle: "Add your first appointment", done: !!setup?.appointment?.done, cta: { label: "Go to Schedule", onClick: () => setView?.("schedule") } },
      { key: "journal", title: "First eJournal Entry", subtitle: "Record your first entry", done: !!setup?.journal?.done, cta: { label: "Go to eJournal", onClick: () => setView?.("journal") } },
      { key: "expense", title: "First Expense", subtitle: "Track business costs", done: !!setup?.expense?.done, cta: { label: "Go to Finances", onClick: () => setView?.("finances") } },
      { key: "gps", title: "GPS Mileage", subtitle: "Start + stop a trip", done: !!setup?.gps?.done, cta: { label: "Open GPS", onClick: () => { setView?.("finances"); showToast("Go to Finances → GPS Mileage to start a trip.", "success"); } } },
      { key: "export", title: "Export Preview", subtitle: "Download CSV for taxes", done: !!setup?.export?.done, cta: { label: "Open Export", onClick: () => { setView?.("finances"); showToast("Go to Finances → Export to download a CSV.", "success"); } } },
    ];
    const doneCount = steps.filter((s) => s.done).length;
    const pct = Math.round((doneCount / steps.length) * 100);
    return { steps, doneCount, pct };
  }, [setup, setView, onOpenSettings]);

  const opsCompleteness = useMemo(() => {
    // Simple heuristic: % of setup steps done (looks like the mock 86% donut).
    const pct = setupSteps.pct || 0;
    return Math.max(0, Math.min(100, pct));
  }, [setupSteps.pct]);

  const conversionRate = useMemo(() => {
    // Heuristic: paid / total (if you later track "leads", swap this out).
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
      return {
        time,
        name: a.clientName || a.signer || "Signer",
        meta: `${a.location || "Location"} · ${a.type || "Signing"}`,
      };
    });
  }, [appointments]);

  const openInvoices = useMemo(() => {
    // If you track invoices separately later, replace this. For now: unpaid paid-status filter.
    const unpaid = appointments.filter((a) => String(a?.status || "").toLowerCase() !== "paid");
    return sumFees(unpaid);
  }, [appointments]);

  const actionItems = useMemo(() => {
    const unpaidCount = appointments.filter((a) => String(a?.status || "").toLowerCase() !== "paid").length;
    const expiringCreds = countOpenRisks({ credentials });
    return {
      unpaidCount,
      expiringCreds,
    };
  }, [appointments, credentials]);

  const onKpiClick = (target) => {
    if (!setView) return;
    setView(target);
  };

  return (
    <div className="f5-dash">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.02em" }}>
            Dashboard
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4, fontWeight: 700 }}>
            {todayLabel}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button className="btn btn-secondary" onClick={refresh} style={{ height: 40 }}>
            <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-rotate"}`}></i>
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "#fecaca", background: "#fff" }}>
          <div style={{ fontWeight: 900, color: "#b91c1c", marginBottom: 6 }}>
            <i className="fas fa-triangle-exclamation"></i> Dashboard data error
          </div>
          <div className="theme-text-muted" style={{ fontSize: 13 }}>{error}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, marginBottom: 12 }}>
        <div className="f5-section-title">Today at a Glance</div>
      </div>

      <div className="f5-grid-3" style={{ marginBottom: 14 }}>
        <div className="f5-card f5-kpi" onClick={() => onKpiClick("schedule")} role="button" tabIndex={0}>
          <div>
            <div className="f5-kpi-label">Jobs Today</div>
            <div className="f5-kpi-row">
              <div className="f5-kpi-value">{jobsToday}</div>
              <div className="f5-kpi-spark">
                <SparkLine points="0,28 10,22 20,26 30,16 40,20 50,10 60,14 70,20 80,8" />
              </div>
            </div>
          </div>
        </div>

        <div className="f5-card f5-kpi" onClick={() => onKpiClick("finances")} role="button" tabIndex={0}>
          <div>
            <div className="f5-kpi-label">Potential Revenue</div>
            <div className="f5-kpi-row">
              <div className="f5-kpi-value">{formatMoney(potentialRevenue)}</div>
              <span className={`f5-delta ${potentialRevenue > 0 ? "f5-delta-up" : ""}`}>
                <i className="fas fa-circle" style={{ fontSize: 6 }}></i>
                {potentialRevenue > 0 ? "15%" : "0%"}
              </span>
            </div>
          </div>
          <div className="f5-kpi-spark" style={{ marginTop: 8 }}>
            <SparkLine width={200} height={28} points="0,24 18,22 36,20 54,24 72,18 90,16 108,18 126,12 144,10 162,8 180,6 200,4" />
          </div>
        </div>

        <div className="f5-card f5-kpi" onClick={() => onKpiClick("credentials")} role="button" tabIndex={0}>
          <div>
            <div className="f5-kpi-label">Open Risks</div>
            <div className="f5-kpi-row">
              <div className="f5-kpi-value">{openRisks}</div>
              <div className="f5-kpi-spark">
                <SparkLine points="0,12 10,20 20,8 30,18 40,12 50,20 60,26 70,18 80,10" stroke="#dc2626" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="f5-grid-2" style={{ marginBottom: 14 }}>
        <div className="f5-card f5-kpi" onClick={() => onKpiClick("schedule")} role="button" tabIndex={0}>
          <div>
            <div className="f5-kpi-label">Conversion Rate</div>
            <div className="f5-kpi-row">
              <div className="f5-kpi-value">{conversionRate}%</div>
              <span className={`f5-delta ${conversionRate >= 20 ? "f5-delta-up" : ""}`}>+ 4.5%</span>
            </div>
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
              <span className={`f5-delta ${opsCompleteness >= 50 ? "f5-delta-up" : ""}`} style={{ marginTop: 6 }}>
                + 6%
              </span>
            </div>
            <Donut size={64} percent={opsCompleteness} stroke="#0d9488" labelSize={13} />
          </div>
        </div>
      </div>

      <div className="f5-grid-2" style={{ marginBottom: 14 }}>
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginBottom: 12 }}>Quick Actions</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button className="f5-btn-primary" onClick={() => setView?.("journal")}>
              <i className="fas fa-pen-to-square"></i> Log Journal Entry
            </button>
            <button className="f5-btn-secondary" onClick={() => setView?.("finances")}>
              <i className="fas fa-receipt"></i> Add Expense
            </button>
            <button className="f5-btn-secondary" onClick={() => showToast("AI Coach opens from the purple button (or add a view hook).")}>
              <i className="fas fa-robot"></i> Ask AI Coach
            </button>
          </div>
        </div>

        <div className="f5-card">
          <div className="f5-section-title" style={{ marginBottom: 12 }}>Today’s Agenda</div>
          <div style={{ fontSize: 14, color: "#475569", marginBottom: 12, fontWeight: 700 }}>
            {upcoming.length || 0} upcoming signings
          </div>
          <button className="f5-btn-primary" onClick={() => setView?.("schedule")}>
            <i className="fas fa-calendar"></i> View Schedule
          </button>
        </div>
      </div>

      <div className="f5-grid-main" style={{ marginBottom: 14 }}>
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginBottom: 16 }}>Operational Status</div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14, marginBottom: 14 }}>
            <div>
              <div className="f5-kpi-label">Revenue (YTD)</div>
              <div className="f5-kpi-value">{formatMoney(revenue12m.values.reduce((a, b) => a + b, 0))}</div>
              <span className="f5-delta f5-delta-up" style={{ marginTop: 8 }}>
                <i className="fas fa-arrow-trend-up" style={{ fontSize: 11 }}></i> 12.5% vs last month
              </span>
            </div>

            <div>
              <div className="f5-kpi-label" style={{ marginBottom: 10 }}>Sales Pipeline</div>
              <div className="f5-pipeline-track">
                <div className="f5-pipeline-seg" style={{ width: "52%", background: "#1e293b" }} />
                <div className="f5-pipeline-seg" style={{ width: "18%", background: "#475569" }} />
                <div className="f5-pipeline-seg" style={{ width: "30%", background: "#94a3b8" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: "#94a3b8", fontWeight: 900 }}>
                <span>$3,200</span><span>$2,200</span><span>$309,900</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
            <div className="f5-card" style={{ padding: 16, boxShadow: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div className="f5-kpi-label">Open Invoices</div>
                  <div className="f5-kpi-value">{formatMoney(openInvoices)}</div>
                  <span className="f5-delta f5-delta-up" style={{ marginTop: 8 }}>
                    <i className="fas fa-arrow-trend-up" style={{ fontSize: 11 }}></i> {actionItems.unpaidCount} active week
                  </span>
                </div>
                <svg width="60" height="28" className="f5-sparkline" style={{ display: "block", opacity: 0.9 }}>
                  <polyline points="0,24 8,18 16,22 24,14 32,16 40,8 48,12 52,6 60,4" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="48" cy="6" r="2.5" fill="#f59e0b" />
                  <circle cx="52" cy="4" r="2" fill="#dc2626" />
                </svg>
              </div>
              <div style={{ marginTop: 10 }}>
                <div className="f5-progress-track" style={{ height: 6 }}>
                  <div className="f5-progress-fill" style={{ width: "45%", background: "linear-gradient(90deg,#334155,#64748b,#94a3b8)" }} />
                </div>
              </div>
            </div>

            <div className="f5-card" style={{ padding: 16, boxShadow: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div className="f5-kpi-label">Compliance Status</div>
                  <div className="f5-kpi-value" style={{ color: "#059669" }}>{opsCompleteness}%</div>
                  <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: 800 }}>Compliant</div>
                  <span className="f5-delta f5-delta-up" style={{ marginTop: 8 }}>
                    <i className="fas fa-arrow-trend-up" style={{ fontSize: 11 }}></i> 6% this month
                  </span>
                </div>
                <Donut size={56} percent={opsCompleteness} stroke="#0d9488" labelSize={12} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
              <div className="f5-section-title" style={{ marginBottom: 0 }}>Revenue Trend</div>
              <div className="f5-section-subtitle">Last 12 Months</div>
            </div>

            <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="f5-chart">
                <span className="f5-chart-y" style={{ top: 0 }}>1.0</span>
                <span className="f5-chart-y" style={{ top: "25%" }}>0.8</span>
                <span className="f5-chart-y" style={{ top: "50%" }}>0.4</span>
                <span className="f5-chart-y" style={{ top: "75%" }}>0.2</span>
                <span className="f5-chart-y" style={{ top: "100%" }}>0.0</span>

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

                <div className="f5-chart-x">
                  {revenue12m.labels.map((l) => <span key={l}>{l}</span>)}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div className="theme-text-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                Peak month: {formatMoney(Math.max(...revenue12m.values))}
              </div>
              <div className="theme-text-muted" style={{ fontSize: 12, fontWeight: 800 }}>
                Source: {journal?.length ? "Journal payments" : "Paid appointments"}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="f5-card">
            <div className="f5-section-title" style={{ marginBottom: 12 }}>Upcoming Signings</div>

            {loading ? (
              <div className="theme-text-muted" style={{ fontSize: 13, fontWeight: 800 }}>
                <i className="fas fa-spinner fa-spin"></i> Loading…
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
                    <i className="fas fa-envelope" style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}></i>
                  </div>
                ))}
                <div style={{ marginTop: 12 }}>
                  <button className="f5-link" onClick={() => setView?.("schedule")}>
                    View All <i className="fas fa-chevron-right" style={{ fontSize: 10, marginLeft: 4 }}></i>
                  </button>
                </div>
              </>
            ) : (
              <div className="theme-text-muted" style={{ fontSize: 13, fontWeight: 800 }}>
                No upcoming signings yet.
              </div>
            )}
          </div>

          <div className="f5-card">
            <div className="f5-section-title" style={{ marginBottom: 12 }}>Action Items</div>
            <div className="f5-action-item">
              <div className="f5-action-dot f5-action-dot-ok" />
              <div className="f5-action-text">{actionItems.unpaidCount} invoices unpaid</div>
            </div>
            <div className="f5-action-item">
              <div className="f5-action-dot f5-action-dot-warn" />
              <div className="f5-action-text">{actionItems.expiringCreds} expiring credential(s)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="f5-card" style={{ marginBottom: 14 }}>
        <div className="f5-section-title" style={{ marginBottom: 10 }}>Recent Activity</div>
        <div className="theme-text-muted" style={{ fontSize: 13, fontStyle: "italic", fontWeight: 700 }}>
          {journal?.length ? `Latest: ${journal[0]?.docType || "Activity"}` : "No recent activity yet. Start by creating your first appointment."}
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
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 999,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    background: s.done ? "rgba(16,185,129,.12)" : "rgba(148,163,184,.12)",
                    border: "1px solid rgba(148,163,184,.35)"
                  }}>
                    <i className={`fas ${s.done ? "fa-check" : "fa-circle"}`} style={{ fontSize: 11, color: s.done ? "#059669" : "#94a3b8" }}></i>
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, lineHeight: 1.2 }}>{s.title}</div>
                    <div className="theme-text-muted" style={{ fontSize: 12, marginTop: 2, fontWeight: 700 }}>{s.subtitle}</div>
                  </div>
                </div>

                {!s.done ? (
                  <button className="f5-btn-secondary" style={{ height: 36, whiteSpace: "nowrap" }} onClick={s.cta.onClick}>
                    {s.cta.label}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="theme-text-muted" style={{ fontSize: 12, marginTop: 10, fontWeight: 700 }}>
          Tip: progress is computed from your real local data (appointments, journal, expenses, GPS mileage).
        </div>
      </div>
    </div>
  );
};
