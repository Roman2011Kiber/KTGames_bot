// Легкі сповіщення-тости (без звуку, без браузерних дозволів).
import { hapticNotify } from "./telegram.js";

let queue = [];
const listeners = new Set();

export function notify(text, kind = "info") {
  const item = {
    id: Math.random().toString(36).slice(2, 9),
    text, kind, ts: Date.now(),
  };
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
