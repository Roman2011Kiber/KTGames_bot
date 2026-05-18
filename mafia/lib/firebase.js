// =====================================================================
//  Firebase через ES-модулі з gstatic.com (без жодного збирача).
//  Завантажується тільки якщо config.js заповнений.
// =====================================================================

import { firebaseConfig, isFirebaseConfigured } from "../config.js";

let dbPromise = null;
let firestoreApi = null;

export { isFirebaseConfigured };

export async function getDb() {
  if (!isFirebaseConfigured) return null;
  if (!dbPromise) {
    dbPromise = (async () => {
      const appMod = await import(
        "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js"
      );
      firestoreApi = await import(
        "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js"
      );
      const app = appMod.initializeApp(firebaseConfig);
      return firestoreApi.getFirestore(app);
    })();
  }
  return dbPromise;
}

export async function getApi() {
  await getDb();
  return firestoreApi;
}
