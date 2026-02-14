
// js/data/dashboardApi.js
(() => {
  const formatMoney = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

  const safeDateLabel = (date = new Date()) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "America/New_York",
      }).format(date);
    } catch {
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
    for (let i = n - 1; i >= 0; i -= 1) out.push(startOfMonthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    return out;
  };

  const monthShort = (yyyyMm) => {
    const [y, m] = String(yyyyMm).split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-US", { month: "short" });
  };

  const sumFees = (appts) => (Array.isArray(appts) ? appts : []).reduce((a, x) => a + Number(x?.fee || 0), 0);

  const countTodayJobs = (appts) => {
    const today = new Date().toISOString().slice(0, 10);
    return (Array.isArray(appts) ? appts : []).filter((a) => String(a?.date || "").slice(0, 10) === today).length;
  };

  const countOpenRisks = (credentials) => {
    const now = Date.now();
    const soonMs = 30 * 24 * 60 * 60 * 1000;
    const creds = Array.isArray(credentials) ? credentials : [];
    return creds.filter((c) => {
      const exp = c?.expiresAt || c?.expiresOn || c?.expiry || c?.expiration;
      if (!exp) return false;
      const t = typeof exp === "number" ? exp : Date.parse(exp);
      return Number.isFinite(t) && t <= now + soonMs;
    }).length;
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
      (Array.isArray(appointments) ? appointments : [])
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
    return { area: `${line} L${w},${h} L0,${h} Z`, poly: pts.map((p) => `${p.x},${p.y}`).join(" ") };
  };

  const loadDashboardData = async () => {
    const DataManager = window.DataManager;
    const safeParse = window.safeParse || ((s, fb) => { try { return JSON.parse(s) ?? fb; } catch { return fb; } });

    const [appointments, credentials] = await Promise.all([
      DataManager?.get ? DataManager.get("notary_appointments") : Promise.resolve([]),
      DataManager?.get ? DataManager.get("notary_credentials") : Promise.resolve([]),
    ]);

    return {
      appointments: Array.isArray(appointments) ? appointments : [],
      credentials: Array.isArray(credentials) ? credentials : [],
      journal: safeParse(localStorage.getItem("notary_journal"), []),
      expenses: safeParse(localStorage.getItem("notary_expenses"), []),
      mileage: safeParse(localStorage.getItem("notary_mileage"), []),
    };
  };

  window.NotaryOSDashboard = window.NotaryOSDashboard || {};
  window.NotaryOSDashboard.api = {
    formatMoney,
    safeDateLabel,
    sumFees,
    countTodayJobs,
    countOpenRisks,
    deriveRevenueSeries12m,
    buildAreaPath,
    loadDashboardData,
  };
})();
