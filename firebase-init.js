// firebase-init.js
// Terminal-free Firebase setup for GitHub Pages (CDN compat)
//
// ✅ What this enables:
// - Google Sign-In (once you paste your Firebase web config)
// - Firebase Auth session persistence
//
// Steps:
// 1) Create a Firebase project
// 2) Add a Web App in Firebase console
// 3) Copy the config object below
// 4) Enable Authentication -> Sign-in method -> Google
// 5) Add your GitHub Pages domain to Auth -> Settings -> Authorized domains
//
// If you don't configure this file, demo email/password login still works,
// but Google sign-in will show "not configured".

window.FIREBASE_CONFIG = {
  // apiKey: "...",
  // authDomain: "...",
  // projectId: "...",
  // storageBucket: "...",
  // messagingSenderId: "...",
  // appId: "..."
};

(function initFirebase() {
  try {
    if (!window.firebase) return;
    const cfg = window.FIREBASE_CONFIG || {};
    if (!cfg.apiKey) return; // not configured yet
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(cfg);
    }
  } catch (e) {
    console.warn("Firebase init error:", e);
  }
})();
