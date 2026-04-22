// Telegram Mini App SDK helper.
// Підключений через <script> в index.html.

export function getTelegram() {
  return (typeof window !== "undefined" && window.Telegram?.WebApp) || null;
}

export function initTelegram() {
  const tg = getTelegram();
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setBackgroundColor?.("#0a0606");
    tg.setHeaderColor?.("#0a0606");
  } catch {
    /* ignore */
  }
}

export function getTelegramUser() {
  const tg = getTelegram();
  const u = tg?.initDataUnsafe?.user;
  if (!u) return null;
  return {
    id: String(u.id),
    name:
      [u.first_name, u.last_name].filter(Boolean).join(" ") ||
      u.username ||
      "Гравець",
    avatar: u.photo_url || "",
  };
}

export function getStartParam() {
  return getTelegram()?.initDataUnsafe?.start_param || null;
}

export function haptic(kind = "light") {
  getTelegram()?.HapticFeedback?.impactOccurred(kind);
}

export function hapticNotify(kind) {
  getTelegram()?.HapticFeedback?.notificationOccurred(kind);
}
