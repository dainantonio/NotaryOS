
// js/components/dashboard/Donut.js
(() => {
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

  window.NotaryOSDashboard = window.NotaryOSDashboard || {};
  window.NotaryOSDashboard.Donut = Donut;
})();
