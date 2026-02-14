// js/components/dashboard/SparkLine.js
(() => {
  const SparkLine = ({ points, width = 80, height = 32, stroke = "#334155" }) => (
    <svg width={width} height={height} className="f5-sparkline" style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  window.NotaryOSDashboard = window.NotaryOSDashboard || {};
  window.NotaryOSDashboard.SparkLine = SparkLine;
})();
