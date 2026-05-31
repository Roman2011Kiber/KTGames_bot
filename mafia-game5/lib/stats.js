/**
 * stats.js — Player statistics stored in Firestore `stats/{playerId}`.
 * Works only in Firestore mode (firebaseConfig.apiKey set).
 * In REST mode every function is a silent no-op / returns null.
 */

import { firebaseConfig } from './config.js';
import { initFirestoreDb, fs } from './firebase.js';

export const USE_STATS = Boolean(firebaseConfig?.apiKey);

let _db = null;
async function getDb() {
  if (_db) return _db;
  if (!USE_STATS) return null;
  _db = await initFirestoreDb(firebaseConfig);
  return _db;
}
getDb().catch(() => {});

/**
 * Update the current player's own stats after a game ends.
 * @param {string} playerId
 * @param {{ nickname, photoUrl, won, role, mafiaKills, sheriffKills, successfulVotes }} data
 */
export async function recordMyStats(playerId, {
  nickname, photoUrl = '', won, role,
  mafiaKills = 0, sheriffKills = 0, successfulVotes = 0, doctorSaves = 0,
  isTgUser = false,
}) {
  if (!USE_STATS || !playerId) return;
  const db = await getDb();
  if (!db) return;
  const { doc, runTransaction } = await fs();
  const ref = doc(db, 'stats', String(playerId));
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? snap.data() : {};
    tx.set(ref, {
      nickname,
      photoUrl:       photoUrl || cur.photoUrl || '',
      isTgUser,
      gamesPlayed:    (cur.gamesPlayed    || 0) + 1,
      wins:           (cur.wins           || 0) + (won ? 1 : 0),
      losses:         (cur.losses         || 0) + (won ? 0 : 1),
      mafiaKills:     (cur.mafiaKills     || 0) + mafiaKills,
      sheriffKills:   (cur.sheriffKills   || 0) + sheriffKills,
      successfulVotes:(cur.successfulVotes|| 0) + successfulVotes,
      doctorSaves:    (cur.doctorSaves    || 0) + doctorSaves,
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
  const { doc, getDoc } = await fs();
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
  const { doc, setDoc } = await fs();
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
  // Fetch all stats and sort client-side (avoids requiring a Firestore composite index)
  const { collection, getDocs } = await fs();
  const snap = await getDocs(collection(db, 'stats'));
  const all = snap.docs.map(d => ({ _id: d.id, ...d.data() }));
  // Only show verified Telegram users; sort by wins descending
  return all
    .filter(p => p.isTgUser === true && (p.gamesPlayed || 0) > 0)
    .sort((a, b) => (b.wins || 0) - (a.wins || 0))
    .slice(0, 200);
}
