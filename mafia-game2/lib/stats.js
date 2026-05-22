/**
 * stats.js — Player statistics stored in Firestore `stats/{playerId}`.
 * Works only in Firestore mode (firebaseConfig.apiKey set).
 * In REST mode every function is a silent no-op / returns null.
 */

import { firebaseConfig } from './config.js';

export const USE_STATS = Boolean(firebaseConfig?.apiKey);

let _db = null;
async function getDb() {
  if (_db) return _db;
  if (!USE_STATS) return null;
  const { getApps, getApp, initializeApp } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js");
  const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  _db = getFirestore(app);
  return _db;
}
getDb().catch(() => {});

/**
 * Update the current player's own stats after a game ends.
 * @param {string} playerId
 * @param {{ nickname, photoUrl, won, role, mafiaKills, sheriffKills, successfulVotes }} data
 */
export async function recordMyStats(playerId, { nickname, photoUrl = '', won, role, mafiaKills = 0, sheriffKills = 0, successfulVotes = 0 }) {
  if (!USE_STATS || !playerId) return;
  const db = await getDb();
  if (!db) return;
  const { doc, runTransaction } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
  const ref = doc(db, 'stats', String(playerId));
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? snap.data() : {};
    const roles = { ...(cur.gamesAsRole || {}), [role]: ((cur.gamesAsRole || {})[role] || 0) + 1 };
    tx.set(ref, {
      nickname,
      photoUrl: photoUrl || cur.photoUrl || '',
      gamesPlayed:    (cur.gamesPlayed    || 0) + 1,
      wins:           (cur.wins           || 0) + (won ? 1 : 0),
      losses:         (cur.losses         || 0) + (won ? 0 : 1),
      mafiaKills:     (cur.mafiaKills     || 0) + mafiaKills,
      sheriffKills:   (cur.sheriffKills   || 0) + sheriffKills,
      successfulVotes:(cur.successfulVotes|| 0) + successfulVotes,
      gamesAsRole: roles,
      updatedAt: Date.now(),
    });
  });
}

/**
 * Fetch stats for any player by ID.
 * @param {string} playerId
 * @returns {Promise<object|null>}
 */
export async function getPlayerStats(playerId) {
  if (!USE_STATS || !playerId) return null;
  const db = await getDb();
  if (!db) return null;
  const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
  const snap = await getDoc(doc(db, 'stats', String(playerId)));
  return snap.exists() ? snap.data() : null;
}

/**
 * Moderator: overwrite specific stat fields for a player.
 * Uses merge:true so unspecified fields are untouched.
 */
export async function editPlayerStats(playerId, updates) {
  if (!USE_STATS || !playerId) return;
  const db = await getDb();
  if (!db) return;
  const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
  await setDoc(doc(db, 'stats', String(playerId)), updates, { merge: true });
}

/**
 * Top-50 players by wins.
 * @returns {Promise<Array>}
 */
export async function getLeaderboard() {
  if (!USE_STATS) return [];
  const db = await getDb();
  if (!db) return [];
  const { collection, getDocs, query, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
  const q = query(collection(db, 'stats'), orderBy('wins', 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ _id: d.id, ...d.data() }));
}
