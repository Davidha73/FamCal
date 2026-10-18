/**
 * Firebase Client Initialization Module
 * Dynamically fetches and initializes Firebase services without embedding
 * raw API keys in public repository files.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'famcal_firebase_cfg';
  let initPromise = null;

  async function fetchConfig() {
    // 1. Try cached config first for fast startup
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.apiKey && parsed.projectId) {
          // Asynchronously refresh in the background
          refreshConfigInBackground();
          return parsed;
        }
      }
    } catch (_) {}

    // 2. Fetch fresh config from Netlify function
    const res = await fetch('/.netlify/functions/firebase-config');
    if (!res.ok) throw new Error(`Firebase config request failed: ${res.status}`);
    const config = await res.json();
    if (!config || !config.apiKey) throw new Error('Invalid Firebase config received');

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (_) {}

    return config;
  }

  async function refreshConfigInBackground() {
    try {
      const res = await fetch('/.netlify/functions/firebase-config');
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
