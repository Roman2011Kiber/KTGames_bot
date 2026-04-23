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
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

export const isFirebaseConfigured =
  !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
