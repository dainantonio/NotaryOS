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
    apiKey: "AIzaSyA32kVbmGOcY_CdDymrom9rWVzyXTj3so0",
    authDomain: "notaryos-67cd2.firebaseapp.com",
    databaseURL: "https://notaryos-67cd2-default-rtdb.firebaseio.com",
    projectId: "notaryos-67cd2",
    storageBucket: "notaryos-67cd2.firebasestorage.app",
    messagingSenderId: "660325303334",
    appId: "1:660325303334:web:bb0f062fd4da8c7fca12e7"
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
