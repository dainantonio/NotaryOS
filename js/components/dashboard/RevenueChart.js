// js/components/dashboard/RevenueChart.js
(() => {
  const RevenueChart = ({ series }) => {
    const api = window.NotaryOSDashboard?.api;
    const path = api.buildAreaPath(series.norm, 440, 140);

    return (
      <div>
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
              <path d={path.area} fill="url(#f5AreaGrad)" />
              <polyline points={path.poly} fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
