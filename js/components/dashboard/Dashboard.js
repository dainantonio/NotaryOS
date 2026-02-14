// js/components/dashboard/Dashboard.js
(() => {
  const { Donut, SparkLine, RevenueChart, api } = window.NotaryOSDashboard;

  const KpiSkeleton = () => (
    <div className="f5-kpi-skel">
      <div className="f5-skel f5-skel-line sm" style={{ width: "42%" }} />
      <div className="row">
        <div className="f5-skel f5-skel-line lg" style={{ width: "46%" }} />
        <div className="f5-skel spark" />
      </div>
    </div>
  );

  const UpcomingSkeleton = () => (
    <div className="f5-list-skel">
      {[1, 2, 3].map((n) => (
        <div key={n} className="item">
          <div className="f5-skel time" />
          <div className="text">
            <div className="f5-skel f5-skel-line" style={{ width: "60%" }} />
            <div className="f5-skel f5-skel-line sm" style={{ width: "80%" }} />
          </div>
          <div className="f5-skel icon" />
        </div>
      ))}
    </div>
  );

  const DashboardV2 = ({
    appointments: initialAppointments = [],
    credentials: initialCredentials = [],
    setView,
    user,
    onOpenSettings,
  }) => {
    const showToast = window.showToast || (() => {});
    const computeSetupChecklistReadOnly = window.computeSetupChecklistReadOnly;

    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState("");
    const [data, setData] = React.useState({
      appointments: Array.isArray(initialAppointments) ? initialAppointments : [],
      credentials: Array.isArray(initialCredentials) ? initialCredentials : [],
      journal: [],
      expenses: [],
      mileage: [],
    });

    const refresh = React.useCallback(async () => {
      setError("");
      setLoading(true);
      try {
        const res = await api.loadDashboardData();
        setData(res);
      } catch (e) {
        setError(e?.message || "Unable to load dashboard data");
      } finally {
        setLoading(false);
      }
    }, []);

    React.useEffect(() => {
      refresh();
    }, [refresh]);

    const todayLabel = React.useMemo(() => api.safeDateLabel(new Date()), []);
    const jobsToday = React.useMemo(() => api.countTodayJobs(data.appointments), [data.appointments]);

    const potentialRevenue = React.useMemo(() => {
      const unpaid = data.appointments.filter((a) => String(a?.status || "").toLowerCase() !== "paid");
      return api.sumFees(unpaid);
    }, [data.appointments]);

    const openRisks = React.useMemo(() => api.countOpenRisks(data.credentials), [data.credentials]);

    const setup = React.useMemo(() => {
      try {
        if (typeof computeSetupChecklistReadOnly === "function")
          return computeSetupChecklistReadOnly({ user, appointments: data.appointments });
      } catch {}
      const profileDone = !!(user?.name || user?.displayName) && !!(user?.company || user?.businessName);
      return {
        profile: { done: profileDone },
        appointment: { done: data.appointments.length > 0 },
        journal: { done: data.journal.length > 0 },
        expense: { done: data.expenses.length > 0 },
        gps: { done: data.mileage.length > 0 },
        export: { done: localStorage.getItem("notary_exported_once") === "true" },
      };
    }, [user, data.appointments, data.journal, data.expenses, data.mileage]);

    const steps = React.useMemo(() => {
      const list = [
        {
          key: "profile",
          title: "Profile",
          subtitle: "Name + company",
          done: !!setup?.profile?.done,
          cta: { label: "Update Profile", onClick: () => onOpenSettings?.() },
        },
        {
          key: "appointment",
          title: "First Appointment",
          subtitle: "Add your first appointment",
          done: !!setup?.appointment?.done,
          cta: { label: "Go to Schedule", onClick: () => setView?.("schedule") },
        },
        {
          key: "journal",
          title: "First eJournal Entry",
          subtitle: "Record your first entry",
          done: !!setup?.journal?.done,
          cta: { label: "Go to eJournal", onClick: () => setView?.("journal") },
        },
        {
          key: "expense",
          title: "First Expense",
          subtitle: "Track business costs",
          done: !!setup?.expense?.done,
          cta: { label: "Go to Finances", onClick: () => setView?.("finances") },
        },
        {
          key: "gps",
          title: "GPS Mileage",
          subtitle: "Start + stop a trip",
          done: !!setup?.gps?.done,
          cta: {
            label: "Open GPS",
            onClick: () => {
              setView?.("finances");
              showToast("Go to Finances → GPS Mileage to start a trip.", "info");
            },
          },
        },
        {
          key: "export",
          title: "Export Preview",
          subtitle: "Download CSV for taxes",
          done: !!setup?.export?.done,
          cta: {
            label: "Open Export",
            onClick: () => {
              setView?.("finances");
              showToast("Go to Finances → Export to download a CSV.", "info");
            },
          },
        },
      ];
      const pct = Math.round((list.filter((s) => s.done).length / list.length) * 100);
      return { list, pct };
    }, [setup, setView, onOpenSettings]);

    const opsCompleteness = steps.pct;

    const conversionRate = React.useMemo(() => {
      const total = data.appointments.length || 0;
      if (!total) return 0;
      const paid = data.appointments.filter((a) => String(a?.status || "").toLowerCase() === "paid").length;
      return Math.round((paid / total) * 100);
    }, [data.appointments]);

    const revenue12m = React.useMemo(
      () => api.deriveRevenueSeries12m({ appointments: data.appointments, journal: data.journal }),
      [data.appointments, data.journal]
    );

    const upcoming = React.useMemo(() => {
      const now = Date.now();
      return data.appointments
        .filter((a) => a?.date)
        .map((a) => ({ ...a, _t: Date.parse(a.date) }))
        .filter((a) => Number.isFinite(a._t) && a._t >= now - 6 * 60 * 60 * 1000)
        .sort((a, b) => a._t - b._t)
        .slice(0, 3)
        .map((a) => {
          const dt = new Date(a._t);
          return {
            time: dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase(),
            name: a.clientName || a.signer || "Signer",
            meta: `${a.location || "Location"} · ${a.type || "Signing"}`,
          };
        });
    }, [data.appointments]);

    const openInvoices = React.useMemo(() => {
      const unpaid = data.appointments.filter((a) => String(a?.status || "").toLowerCase() !== "paid");
      return api.sumFees(unpaid);
    }, [data.appointments]);

    const clickIfReady = (fn) => (loading ? undefined : fn);

    return (
      <div className="f5-dash">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "-0.02em" }}>Dashboard</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4, fontWeight: 700 }}>{todayLabel}</div>
          </div>

          <button className="btn btn-secondary" onClick={refresh} style={{ height: 40 }}>
            <i className={`fas ${loading ? "fa-spinner fa-spin" : "fa-rotate"}`} /> Refresh
          </button>
        </div>

        {error ? (
          <div className="card" style={{ borderColor: "#fecaca", background: "#fff", marginBottom: 12 }}>
            <div style={{ fontWeight: 900, color: "#b91c1c", marginBottom: 6 }}>
              <i className="fas fa-triangle-exclamation" /> Dashboard data error
            </div>
            <div className="theme-text-muted" style={{ fontSize: 13 }}>
              {error}
            </div>
          </div>
        ) : null}

        <div className="f5-section-title" style={{ marginBottom: 12 }}>
          Today at a Glance
        </div>

        <div className="f5-grid-3" style={{ marginBottom: 14 }}>
          <div
            className={`f5-card f5-kpi ${loading ? "f5-loading" : ""}`}
            onClick={clickIfReady(() => setView?.("schedule"))}
            role="button"
            tabIndex={0}
          >
            {loading ? (
              <KpiSkeleton />
            ) : (
              <>
                <div className="f5-kpi-label">Jobs Today</div>
                <div className="f5-kpi-row">
                  <div className="f5-kpi-value">{jobsToday}</div>
                  <div className="f5-kpi-spark">
                    <SparkLine points="0,28 10,22 20,26 30,16 40,20 50,10 60,14 70,20 80,8" />
                  </div>
                </div>
              </>
            )}
          </div>

          <div
            className={`f5-card f5-kpi ${loading ? "f5-loading" : ""}`}
            onClick={clickIfReady(() => setView?.("finances"))}
            role="button"
            tabIndex={0}
          >
            {loading ? (
              <KpiSkeleton />
            ) : (
              <>
                <div className="f5-kpi-label">Potential Revenue</div>
                <div className="f5-kpi-row">
                  <div className="f5-kpi-value">{api.formatMoney(potentialRevenue)}</div>
                  <span className={`f5-delta ${potentialRevenue > 0 ? "f5-delta-up" : ""}`}>15%</span>
                </div>
                <div className="f5-kpi-spark" style={{ marginTop: 8 }}>
                  <SparkLine
                    width={200}
                    height={28}
                    points="0,24 18,22 36,20 54,24 72,18 90,16 108,18 126,12 144,10 162,8 180,6 200,4"
                  />
                </div>
              </>
            )}
          </div>

          <div
            className={`f5-card f5-kpi ${loading ? "f5-loading" : ""}`}
            onClick={clickIfReady(() => setView?.("credentials"))}
            role="button"
            tabIndex={0}
          >
            {loading ? (
              <KpiSkeleton />
            ) : (
              <>
                <div className="f5-kpi-label">Open Risks</div>
                <div className="f5-kpi-row">
                  <div className="f5-kpi-value">{openRisks}</div>
                  <div className="f5-kpi-spark">
                    <SparkLine points="0,12 10,20 20,8 30,18 40,12 50,20 60,26 70,18 80,10" stroke="#dc2626" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="f5-grid-2" style={{ marginBottom: 14 }}>
          <div
            className={`f5-card f5-kpi ${loading ? "f5-loading" : ""}`}
            onClick={clickIfReady(() => setView?.("schedule"))}
            role="button"
            tabIndex={0}
          >
            {loading ? (
              <KpiSkeleton />
            ) : (
              <>
                <div className="f5-kpi-label">Conversion Rate</div>
                <div className="f5-kpi-row">
                  <div className="f5-kpi-value">{conversionRate}%</div>
                  <span className={`f5-delta ${conversionRate >= 20 ? "f5-delta-up" : ""}`}>+ 4.5%</span>
                </div>
                <div style={{ marginTop: 12 }}>
                  <div className="f5-progress-track">
                    <div
                      className="f5-progress-fill"
                      style={{ width: `${conversionRate}%`, background: "linear-gradient(90deg,#334155,#64748b)" }}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className={`f5-card f5-kpi ${loading ? "f5-loading" : ""}`}>
            {loading ? (
              <KpiSkeleton />
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div className="f5-kpi-label">Operational Completeness</div>
                  <div className="f5-kpi-value">{opsCompleteness}%</div>
                  <span className={`f5-delta ${opsCompleteness >= 50 ? "f5-delta-up" : ""}`} style={{ marginTop: 6 }}>
                    + 6%
                  </span>
                </div>
                <Donut size={64} percent={opsCompleteness} />
              </div>
            )}
          </div>
        </div>

        <div className="f5-grid-2" style={{ marginBottom: 14 }}>
          <div className="f5-card">
            <div className="f5-section-title" style={{ marginBottom: 12 }}>
              Quick Actions
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="f5-btn-primary" onClick={() => setView?.("journal")}>
                <i className="fas fa-pen-to-square" /> Log Journal Entry
              </button>
              <button className="f5-btn-secondary" onClick={() => setView?.("finances")}>
                <i className="fas fa-receipt" /> Add Expense
              </button>
              <button className="f5-btn-secondary" onClick={() => showToast("Wire AI Coach view next.")}>
                <i className="fas fa-robot" /> Ask AI Coach
              </button>
            </div>
          </div>

          <div className="f5-card">
            <div className="f5-section-title" style={{ marginBottom: 12 }}>
              Today’s Agenda
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#475569", marginBottom: 12 }}>
              {loading ? "—" : upcoming.length} upcoming signings
            </div>
            <button className="f5-btn-primary" onClick={() => setView?.("schedule")}>
              <i className="fas fa-calendar" /> View Schedule
            </button>
          </div>
        </div>

        <div className="f5-grid-main" style={{ marginBottom: 14 }}>
          <div className="f5-card">
            <div className="f5-section-title" style={{ marginBottom: 16 }}>
              Operational Status
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14, marginBottom: 14 }}>
              <div>
                <div className="f5-kpi-label">Revenue (YTD)</div>
                <div className="f5-kpi-value">{api.formatMoney(revenue12m.values.reduce((a, b) => a + b, 0))}</div>
                <span className="f5-delta f5-delta-up" style={{ marginTop: 8 }}>
                  <i className="fas fa-arrow-trend-up" /> 12.5% vs last month
                </span>
              </div>

              <div>
                <div className="f5-kpi-label" style={{ marginBottom: 10 }}>
                  Sales Pipeline
                </div>
                <div className="f5-pipeline-track">
                  <div className="f5-pipeline-seg" style={{ width: "52%", background: "#1e293b" }} />
                  <div className="f5-pipeline-seg" style={{ width: "18%", background: "#475569" }} />
                  <div className="f5-pipeline-seg" style={{ width: "30%", background: "#94a3b8" }} />
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 14, marginBottom: 14 }}>
              <div className="f5-card" style={{ padding: 16, boxShadow: "none" }}>
                <div className="f5-kpi-label">Open Invoices</div>
                <div className="f5-kpi-value">{api.formatMoney(openInvoices)}</div>
              </div>
              <div className="f5-card" style={{ padding: 16, boxShadow: "none" }}>
                <div className="f5-kpi-label">Compliance Status</div>
                <div className="f5-kpi-value" style={{ color: "#059669" }}>
                  {opsCompleteness}%
                </div>
              </div>
            </div>

            {loading ? <div className="f5-skel f5-chart-skel" /> : <RevenueChart series={revenue12m} />}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="f5-card">
              <div className="f5-section-title" style={{ marginBottom: 12 }}>
                Upcoming Signings
              </div>

              {loading ? (
                <UpcomingSkeleton />
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
                <div className="theme-text-muted" style={{ fontWeight: 800 }}>
                  No upcoming signings yet.
                </div>
              )}
            </div>

            <div className="f5-card">
              <div className="f5-section-title" style={{ marginBottom: 12 }}>
                Action Items
              </div>
              <div className="f5-action-item">
                <div className="f5-action-dot f5-action-dot-ok" />
                <div className="f5-action-text">Invoices tracked</div>
              </div>
              <div className="f5-action-item">
                <div className="f5-action-dot f5-action-dot-warn" />
                <div className="f5-action-text">{openRisks} expiring credential(s)</div>
              </div>
            </div>
          </div>
        </div>

        <div className="f5-setup-bar">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
            <div style={{ fontWeight: 900 }}>Setup Progress</div>
            <div style={{ fontWeight: 900, color: "#64748b" }}>{steps.pct}% Complete</div>
          </div>

          <div className="f5-progress-track">
            <div
              className="f5-progress-fill"
              style={{ width: `${steps.pct}%`, background: "linear-gradient(90deg,#3b82f6,#2563eb)" }}
            />
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
            {steps.list.map((s) => (
              <div key={s.key} className="f5-card" style={{ boxShadow: "none", padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900 }}>{s.title}</div>
                    <div className="theme-text-muted" style={{ fontSize: 12, fontWeight: 700 }}>
                      {s.subtitle}
                    </div>
                  </div>
                  {!s.done ? (
                    <button className="f5-btn-secondary" style={{ height: 36 }} onClick={s.cta.onClick}>
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

  window.NotaryOSDashboard = window.NotaryOSDashboard || {};
  window.NotaryOSDashboard.DashboardV2 = DashboardV2;
})();
