// =====================================================================
//  Сховище: Firestore (real-time) якщо налаштовано, інакше localStorage.
//  Однаковий API для обох режимів.
// =====================================================================

import { getDb, getApi, isFirebaseConfigured } from "./firebase.js";

const LS_PREFIX = "mafia:room:";
const LS_LAST = "mafia:last-game";
const LS_NICK = "mafia:nick";

// ---------- Solo game cache ----------
export function saveLastGame(g) {
  try { localStorage.setItem(LS_LAST, JSON.stringify(g)); } catch { /* */ }
}
export function loadLastGame() {
  try { const s = localStorage.getItem(LS_LAST); return s ? JSON.parse(s) : null; }
  catch { return null; }
}
export function clearLastGame() {
  try { localStorage.removeItem(LS_LAST); } catch { /* */ }
}

// ---------- Nickname ----------
export function saveNickname(name) {
  try { localStorage.setItem(LS_NICK, name); } catch { /* */ }
}
export function loadNickname() {
  try { return localStorage.getItem(LS_NICK) || ""; } catch { return ""; }
}

// ---------- Room CRUD ----------
export async function saveRoom(code, state) {
  if (isFirebaseConfigured) {
    const db = await getDb();
    const api = await getApi();
    await api.setDoc(api.doc(db, "mafia_rooms", code), state);
  } else {
    try {
      localStorage.setItem(LS_PREFIX + code, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("mafia-room-update", { detail: { code } }));
    } catch { /* */ }
  }
}

export async function patchRoom(code, partial) {
  if (isFirebaseConfigured) {
    const db = await getDb();
    const api = await getApi();
    await api.updateDoc(api.doc(db, "mafia_rooms", code), partial);
  } else {
    const cur = await loadRoom(code);
    if (!cur) return;
    const next = applyPatch(cur, partial);
    await saveRoom(code, next);
  }
}

export async function appendChatMessage(code, msg) {
  if (isFirebaseConfigured) {
    const db = await getDb();
    const api = await getApi();
    await api.updateDoc(api.doc(db, "mafia_rooms", code), {
      chat: api.arrayUnion(msg),
    });
  } else {
    const cur = await loadRoom(code);
    if (!cur) return;
    const chat = [...(cur.chat || []), msg].slice(-50);
    await saveRoom(code, { ...cur, chat });
  }
}

export async function loadRoom(code) {
  if (isFirebaseConfigured) {
    const db = await getDb();
    const api = await getApi();
    const snap = await api.getDoc(api.doc(db, "mafia_rooms", code));
    return snap.exists() ? snap.data() : null;
  }
  try {
    const raw = localStorage.getItem(LS_PREFIX + code);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function deleteRoom(code) {
  if (isFirebaseConfigured) {
    const db = await getDb();
    const api = await getApi();
    await api.deleteDoc(api.doc(db, "mafia_rooms", code));
  } else {
    try { localStorage.removeItem(LS_PREFIX + code); } catch { /* */ }
  }
}

// Підписка на зміни кімнати. Повертає функцію відписки.
export function subscribeRoom(code, cb) {
  if (isFirebaseConfigured) {
    let unsub = () => {};
    let cancelled = false;
    (async () => {
      const db = await getDb();
      const api = await getApi();
      if (cancelled) return;
      unsub = api.onSnapshot(api.doc(db, "mafia_rooms", code), (snap) => {
        cb(snap.exists() ? snap.data() : null);
      });
    })();
    return () => { cancelled = true; try { unsub(); } catch { /* */ } };
  }

  // localStorage режим: storage event + custom event + м'який polling.
  let cancelled = false;
  let lastJson = "";
  const tick = async () => {
    if (cancelled) return;
    const v = await loadRoom(code);
    const json = v ? JSON.stringify(v) : "";
    if (json !== lastJson) { lastJson = json; cb(v); }
  };
  tick();
  const onStorage = (e) => { if (e.key === LS_PREFIX + code) tick(); };
  const onCustom = (e) => { if (e.detail?.code === code) tick(); };
  window.addEventListener("storage", onStorage);
  window.addEventListener("mafia-room-update", onCustom);
  let interval = null;
  const startInt = () => { if (!interval) interval = setInterval(tick, 2000); };
  const stopInt = () => { if (interval) { clearInterval(interval); interval = null; } };
  const onVis = () => (document.hidden ? stopInt() : startInt());
  document.addEventListener("visibilitychange", onVis);
  if (!document.hidden) startInt();
  return () => {
    cancelled = true;
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("mafia-room-update", onCustom);
    document.removeEventListener("visibilitychange", onVis);
    stopInt();
  };
}

function applyPatch(obj, patch) {
  const out = JSON.parse(JSON.stringify(obj));
  for (const [path, value] of Object.entries(patch)) {
    const segs = path.split(".");
    let node = out;
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i];
      if (typeof node[k] !== "object" || node[k] === null) node[k] = {};
      node = node[k];
    }
    node[segs[segs.length - 1]] = value;
  }
  return out;
}
