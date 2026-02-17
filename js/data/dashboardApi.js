// js/data/dashboardApi.js
//
// FIX: This file is pure JS — NO JSX. It must be loaded as a plain <script>,
// NOT type="text/babel". Loading it with Babel caused the IIFE to be silently
// discarded, so window.NotaryOSDashboard.api was never defined.
//
(() => {
  const formatMoney = (n) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

  const safeDateLabel = (date) => {
    date = date || new Date();
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(date);
    } catch (e) {
      return date.toDateString();
    }
  };

  const startOfMonthKey = (d) => {
    const dt = new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    return y + "-" + m;
  };

  const lastNMonthKeys = (n) => {
    n = n || 12;
    var out = [];
    var now = new Date();
    for (var i = n - 1; i >= 0; i--) {
      out.push(startOfMonthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    }
    return out;
  };

  const monthShort = (yyyyMm) => {
    var parts = String(yyyyMm).split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, 1)
      .toLocaleString("en-US", { month: "short" });
  };

  const sumFees = (appts) =>
    (Array.isArray(appts) ? appts : []).reduce((a, x) => a + Number((x && x.fee) || 0), 0);

  const countTodayJobs = (appts) => {
    var today = new Date().toISOString().slice(0, 10);
    return (Array.isArray(appts) ? appts : [])
      .filter((a) => String((a && a.date) || "").slice(0, 10) === today).length;
  };

  const countOpenRisks = (credentials) => {
    var now = Date.now();
    var soonMs = 30 * 24 * 60 * 60 * 1000;
    var creds = Array.isArray(credentials) ? credentials : [];
    return creds.filter((c) => {
      var exp = (c && (c.expiresAt || c.expiresOn || c.expiry || c.expiration));
      if (!exp) return false;
      var t = typeof exp === "number" ? exp : Date.parse(exp);
      return Number.isFinite(t) && t <= now + soonMs;
    }).length;
  };

  const deriveRevenueSeries12m = (opts) => {
    var appointments = (opts && opts.appointments) || [];
    var journal = (opts && opts.journal) || [];
    var keys = lastNMonthKeys(12);
    var map = {};
    keys.forEach((k) => { map[k] = 0; });

    var j = Array.isArray(journal) ? journal : [];
    var payments = j.filter((row) =>
      String((row && row.docType) || "").toLowerCase().includes("payment")
    );

    if (payments.length) {
      payments.forEach((p) => {
        var k = startOfMonthKey((p && p.date) || Date.now());
        if (map[k] !== undefined) map[k] += Number((p && p.fee) || 0);
      });
    } else {
      (Array.isArray(appointments) ? appointments : [])
        .filter((a) => String((a && a.status) || "").toLowerCase() === "paid")
        .forEach((a) => {
          var k = startOfMonthKey((a && a.date) || Date.now());
          if (map[k] !== undefined) map[k] += Number((a && a.fee) || 0);
        });
    }

    var values = keys.map((k) => map[k] || 0);
    var max = Math.max.apply(null, [1].concat(values));
    var norm = values.map((v) => v / max);
    return { keys: keys, labels: keys.map(monthShort), values: values, norm: norm, max: max };
  };

  const buildAreaPath = (normValues, w, h) => {
    w = w || 440;
    h = h || 140;
    var vals = Array.isArray(normValues) ? normValues : [];
    var n = vals.length || 1;
    var step = w / Math.max(1, n - 1);

    var pts = vals.map((v, idx) => ({
      x: Math.round(idx * step),
      y: Math.round(h - v * (h - 12) - 6),
    }));

    var line = pts.map((p, i) => (i === 0 ? "M" : "L") + p.x + "," + p.y).join(" ");
    return {
      area: line + " L" + w + "," + h + " L0," + h + " Z",
      poly: pts.map((p) => p.x + "," + p.y).join(" "),
    };
  };

  const loadDashboardData = function () {
    var DataManager = window.DataManager;
    var safeParse = window.safeParse || function (s, fb) {
      try { var v = JSON.parse(s); return (v != null) ? v : fb; } catch (e) { return fb; }
    };

    var getAppts = DataManager && DataManager.get
      ? DataManager.get("notary_appointments")
      : Promise.resolve([]);
    var getCreds = DataManager && DataManager.get
      ? DataManager.get("notary_credentials")
      : Promise.resolve([]);

    return Promise.all([getAppts, getCreds]).then(function (results) {
      return {
        appointments: Array.isArray(results[0]) ? results[0] : [],
        credentials: Array.isArray(results[1]) ? results[1] : [],
        journal: safeParse(localStorage.getItem("notary_journal"), []),
        expenses: safeParse(localStorage.getItem("notary_expenses"), []),
        mileage: safeParse(localStorage.getItem("notary_mileage"), []),
      };
    });
  };

  window.NotaryOSDashboard = window.NotaryOSDashboard || {};
  window.NotaryOSDashboard.api = {
    formatMoney: formatMoney,
    safeDateLabel: safeDateLabel,
    sumFees: sumFees,
    countTodayJobs: countTodayJobs,
    countOpenRisks: countOpenRisks,
    deriveRevenueSeries12m: deriveRevenueSeries12m,
    buildAreaPath: buildAreaPath,
    loadDashboardData: loadDashboardData,
  };
})();
