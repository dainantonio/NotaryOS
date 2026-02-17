// js/components/dashboard/RevenueChart.js
(() => {
  const RevenueChart = ({ series }) => {
    const api = window.NotaryOSDashboard && window.NotaryOSDashboard.api;

    // Guard: if api not ready or series malformed, render nothing
    if (!api || !series || !Array.isArray(series.norm)) {
      return <div className="f5-chart-skel f5-skel" style={{ height: 180, borderRadius: 14 }} />;
    }

    const path = api.buildAreaPath(series.norm, 440, 140);

    return (
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
          <div className="f5-section-title" style={{ marginBottom: 0 }}>Revenue Trend</div>
          <div className="f5-section-subtitle">Last 12 Months</div>
        </div>

        <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="f5-chart">
            {["0", "0.25", "0.50", "0.75", "1.0"].map((label, i) => (
              <span
                key={label}
                className="f5-chart-y"
                style={{ top: `${i * 25}%` }}
              >
                {["1.0","0.8","0.4","0.2","0.0"][i]}
              </span>
            ))}

            {[0, 25, 50, 75, 100].map((pct) => (
              <div key={pct} className="f5-chart-grid" style={{ top: `${pct}%` }} />
            ))}

            <svg viewBox="0 0 440 140" preserveAspectRatio="none" className="f5-chart-area">
              <defs>
                <linearGradient id="f5AreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#334155" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#334155" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={path.area} fill="url(#f5AreaGrad)" />
              <polyline
                points={path.poly}
                fill="none"
                stroke="#334155"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="f5-chart-x">
              {series.labels.map((l) => <span key={l}>{l}</span>)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  window.NotaryOSDashboard = window.NotaryOSDashboard || {};
  window.NotaryOSDashboard.RevenueChart = RevenueChart;
})();
