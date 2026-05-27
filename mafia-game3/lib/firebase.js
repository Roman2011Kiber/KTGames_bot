/**
 * firebase.js — Firebase SDK loaded from Google CDN.
 *
 * All modules are cached after the first import so subsequent calls
 * are synchronous. No npm package needed — bundle stays small.
 */

const VER = '10.14.1';

let _appMod = null;
let _fsMod  = null;

async function appMod() {
  if (!_appMod) {
    _appMod = await import(
      /* @vite-ignore */
      `https://www.gstatic.com/firebasejs/${VER}/firebase-app.js`
    );
  }
  return _appMod;
}

async function fsMod() {
  if (!_fsMod) {
    _fsMod = await import(
      /* @vite-ignore */
      `https://www.gstatic.com/firebasejs/${VER}/firebase-firestore.js`
    );
  }
  return _fsMod;
}

/**
 * Initialise (or retrieve) the Firebase App singleton.
 * @param {object} config
 */
export async function initFirebaseApp(config) {
  const { initializeApp, getApps, getApp } = await appMod();
  return getApps().length ? getApp() : initializeApp(config);
}

/**
 * Initialise (or retrieve) the Firestore DB singleton.
 * @param {object} config
 */
export async function initFirestoreDb(config) {
  const app = await initFirebaseApp(config);
  const { getFirestore } = await fsMod();
  return getFirestore(app);
}

/**
 * Returns all Firestore SDK exports.
 * Usage:  const { doc, runTransaction } = await fs();
 */
export async function fs() {
  return fsMod();
}
