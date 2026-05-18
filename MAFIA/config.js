// =====================================================================
//  Налаштування Firebase.
// ---------------------------------------------------------------------
//  ЯК УВІМКНУТИ ОНЛАЙН-РЕЖИМ ЧЕРЕЗ FIREBASE:
//    1) Створіть проєкт на https://console.firebase.google.com
//    2) Додайте Web-додаток, скопіюйте firebaseConfig.
//    3) Увімкніть Cloud Firestore (test mode для початку).
//    4) Вставте значення нижче.
//
//  Якщо лишити поля порожніми — гра працює БЕЗ Firebase:
//  онлайн-кімнати синхронізуються через localStorage у межах
//  одного браузера/пристрою (зручно для тестування).
// =====================================================================

export const firebaseConfig = {
    apiKey: "AIzaSyBAtxUHSyMNjzHJLzpC-T_3sdgDVo5T6qI",
    authDomain: "js25-52181.firebaseapp.com",
    projectId: "js25-52181",
    storageBucket: "js25-52181.appspot.com",
    messagingSenderId: "948851257740",
    appId: "1:948851257740:web:c1310e73adae048235e6a9",
    measurementId: "G-K77YQN0D58"
};

export const isFirebaseConfigured =
  !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
