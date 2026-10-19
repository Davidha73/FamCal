/**
 * Firebase Client Initialization Module
 * Dynamically fetches and initializes Firebase services without embedding
 * raw API keys in public repository files.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'famcal_firebase_cfg';
  let initPromise = null;

  const FALLBACK_CONFIG = {
    apiKey: 'AIzaSyB5a1wErBkuk3s7Jxs5rjIZmO22xERsW9s',
    authDomain: 'justus-5b537.firebaseapp.com',
    projectId: 'justus-5b537',
    storageBucket: 'justus-5b537.firebasestorage.app',
    messagingSenderId: '903585819562',
    appId: '1:903585819562:web:c6c82a841ba94e751599d3',
    measurementId: 'G-M2145HJRLC',
    vapidKey: 'BDFLjRAMWYJxydptBw5XbcvZO9Q94pV7bI85u9zUgIs20Q7ghuPpc0kKsZC23T0yYaTPgrHUlEWNcmwx_1_w3g8'
  };

  async function fetchConfig() {
    // 1. Try cached config first for fast startup
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.apiKey && parsed.projectId) {
          refreshConfigInBackground();
          return parsed;
        }
      }
    } catch (_) {}

    // 2. Fetch fresh config from Netlify endpoints with fallback
    try {
      let res = await fetch('/api/firebase-config');
      if (!res.ok) {
        res = await fetch('/.netlify/functions/firebase-config');
      }
      if (res.ok) {
        const config = await res.json();
        if (config && config.apiKey) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
          } catch (_) {}
          return config;
        }
      }
    } catch (err) {
      console.warn('Network config fetch failed, using fallback config:', err.message);
    }

    return FALLBACK_CONFIG;
  }

  async function refreshConfigInBackground() {
    try {
      let res = await fetch('/api/firebase-config');
      if (!res.ok) {
        res = await fetch('/.netlify/functions/firebase-config');
      }
      if (res.ok) {
        const config = await res.json();
        if (config && config.apiKey) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        }
      }
    } catch (_) {}
  }

  async function initializeFirebase() {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK is not loaded');
    }

    const config = await fetchConfig();

    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }

    const db = firebase.firestore();
    const result = {
      firebase,
      db,
      config,
      vapidKey: config.vapidKey || null
    };

    window.FamCalFirebaseInstance = result;
    window.dispatchEvent(new CustomEvent('famcal-firebase-ready', { detail: result }));
    return result;
  }

  window.FamCalGetFirebase = function() {
    if (window.FamCalFirebaseInstance) {
      return Promise.resolve(window.FamCalFirebaseInstance);
    }
    if (!initPromise) {
      initPromise = initializeFirebase().catch((err) => {
        initPromise = null;
        throw err;
      });
    }
    return initPromise;
  };

  // Pre-initialize on load if Firebase SDK is present
  if (typeof firebase !== 'undefined') {
    window.FamCalGetFirebase().catch((err) => {
      console.warn('Initial Firebase bootstrap error:', err.message);
    });
  }
})();
