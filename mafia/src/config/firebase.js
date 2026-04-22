// =====================================================================
//  Firebase Firestore configuration
// ---------------------------------------------------------------------
//  Підключіть свій акаунт Firebase, щоб дані про ігрові кімнати
//  зберігались у вашому Firestore. Все інше працюватиме автоматично.
//
//  Як отримати конфіг:
//    1. https://console.firebase.google.com → Створити проєкт
//    2. Add app → Web → скопіюйте об'єкт firebaseConfig
//    3. Увімкніть Firestore Database (test mode для початку)
//    4. Вставте значення нижче
//
//  Поки конфіг не заповнено — гра працює локально (single-player vs AI)
//  і онлайн-кімнати зберігаються в localStorage браузера.
// =====================================================================

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyBAtxUHSyMNjzHJLzpC-T_3sdgDVo5T6qI",
  authDomain: "js25-52181.firebaseapp.com",
  projectId: "js25-52181",
  storageBucket: "js25-52181.appspot.com",
  messagingSenderId: "948851257740",
  appId: "1:948851257740:web:c1310e73adae048235e6a9",
  measurementId: "G-K77YQN0D58",
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let app = null;
let db = null;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export { app, db };
