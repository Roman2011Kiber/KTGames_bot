// Storage abstraction: Firestore (real-time) when configured, localStorage otherwise.
import { db, isFirebaseConfigured } from "@/config/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  deleteDoc,
  getDoc,
  arrayUnion,
} from "firebase/firestore";

const LS_PREFIX = "mafia:room:";
const LS_LAST = "mafia:last-game";
const LS_NICK = "mafia:nick";

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

export function saveNickname(name) {
  try { localStorage.setItem(LS_NICK, name); } catch { /* */ }
}
export function loadNickname() {
  try { return localStorage.getItem(LS_NICK) || ""; } catch { return ""; }
}

// ---------- Room CRUD ----------

export async function saveRoom(code, state) {
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "mafia_rooms", code), state);
  } else {
    try {
      localStorage.setItem(LS_PREFIX + code, JSON.stringify(state));
      window.dispatchEvent(new CustomEvent("mafia-room-update", { detail: { code } }));
    } catch { /* */ }
  }
}

export async function patchRoom(code, partial) {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, "mafia_rooms", code), partial);
  } else {
    const cur = await loadRoom(code);
    if (!cur) return;
    const next = applyPatch(cur, partial);
    await saveRoom(code, next);
  }
}

export async function appendChatMessage(code, msg) {
  if (isFirebaseConfigured && db) {
    await updateDoc(doc(db, "mafia_rooms", code), {
      chat: arrayUnion(msg),
    });
  } else {
    const cur = await loadRoom(code);
    if (!cur) return;
    const chat = [...(cur.chat || []), msg].slice(-50);
    await saveRoom(code, { ...cur, chat });
  }
}

export async function loadRoom(code) {
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db, "mafia_rooms", code));
    return snap.exists() ? snap.data() : null;
  }
  try {
    const raw = localStorage.getItem(LS_PREFIX + code);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function deleteRoom(code) {
  if (isFirebaseConfigured && db) {
    await deleteDoc(doc(db, "mafia_rooms", code));
  } else {
    try { localStorage.removeItem(LS_PREFIX + code); } catch { /* */ }
  }
}

// onSnapshot is push-based via Firestore. localStorage fallback uses storage event
// + custom event + a *gentle* poll only when document is visible, so it doesn't
// burn battery on backgrounded tabs.
export function subscribeRoom(code, cb) {
  if (isFirebaseConfigured && db) {
    return onSnapshot(doc(db, "mafia_rooms", code), (snap) => {
      cb(snap.exists() ? snap.data() : null);
    });
  }
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
  // Poll only when the tab is visible — saves CPU when it's in the background.
  let interval = null;
  const startInterval = () => {
    if (interval) return;
    interval = window.setInterval(tick, 2000);
  };
  const stopInterval = () => {
    if (!interval) return;
    window.clearInterval(interval); interval = null;
  };
  const onVis = () => (document.hidden ? stopInterval() : startInterval());
  document.addEventListener("visibilitychange", onVis);
  if (!document.hidden) startInterval();
  return () => {
    cancelled = true;
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("mafia-room-update", onCustom);
    document.removeEventListener("visibilitychange", onVis);
    stopInterval();
  };
}

// Apply a Firestore-style nested patch (with dotted paths) to a plain object,
// used in localStorage fallback so patchRoom() behaves the same in both modes.
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
