// =====================================================================
//  Легкі онлайн-сповіщення (без галасу і без перенавантаження).
// ---------------------------------------------------------------------
//  Використовуються для подій ігри: "ваш хід", "когось вбили", тощо.
//  • Тостер на 3 секунди (1 елемент в DOM, без сторонніх бібліотек)
//  • Telegram haptic, якщо доступно
//  • Не використовує ані звуку, ані Notification API за замовчуванням
//    (щоб не дратувати користувача та не просити дозволу).
// =====================================================================

import { hapticNotify } from "./telegram";

let queue = [];
let listeners = new Set();

export function notify(text, kind = "info") {
  const item = { id: Math.random().toString(36).slice(2, 9), text, kind, ts: Date.now() };
  queue = [...queue, item];
  listeners.forEach((cb) => cb(queue));
  if (kind === "success") hapticNotify("success");
  else if (kind === "error") hapticNotify("error");
  else hapticNotify("warning");
  setTimeout(() => {
    queue = queue.filter((q) => q.id !== item.id);
    listeners.forEach((cb) => cb(queue));
  }, 3200);
}

export function subscribeNotify(cb) {
  listeners.add(cb);
  cb(queue);
  return () => listeners.delete(cb);
}
