// For Firebase JS SDK v7.20.0 and later, measurementId is optional
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyBAtxUHSyMNjzHJLzpC-T_3sdgDVo5T6qI",
    authDomain: "js25-52181.firebaseapp.com",
    projectId: "js25-52181",
    storageBucket: "js25-52181.appspot.com",
    messagingSenderId: "948851257740",
    appId: "1:948851257740:web:c1310e73adae048235e6a9",
    measurementId: "G-K77YQN0D58"
};
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/* =========================
   MODE
========================= */
export const MODE = "web"; // "tg"

/* =========================
   USER
========================= */
export function getUserId() {
  if (MODE === "tg") {
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  }

  let id = localStorage.getItem("dev_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dev_id", id);
  }
  return id;
}

export function getUserName(inputName) {
  if (MODE === "tg") {
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name || "User";
  }

  return inputName?.trim() || "";
}

/* =========================
   ROOM HELPERS
========================= */
export function roomRef(code) {
  return doc(db, "rooms", code);
}

export async function getRoom(code) {
  const snap = await getDoc(roomRef(code));
  return snap.data();
}

export async function createRoom(code, data) {
  await setDoc(roomRef(code), data);
}

export async function updateRoom(code, data) {
  await updateDoc(roomRef(code), data);
}

export async function deleteRoom(code) {
  await deleteDoc(roomRef(code));
}

export function listenRoom(code, cb) {
  return onSnapshot(roomRef(code), (snap) => {
    cb(snap.data());
  });
}

/* =========================
   ROOM CODE
========================= */
export function createRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}