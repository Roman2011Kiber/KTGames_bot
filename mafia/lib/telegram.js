export const tg = () => window.Telegram?.WebApp || null;

export function initTelegram() {
  const t = tg();
  if (!t) return;
  try { t.ready(); t.expand(); t.setBackgroundColor?.('#0a0606'); t.setHeaderColor?.('#0a0606'); } catch {}
}

export function getTelegramUser() {
  const u = tg()?.initDataUnsafe?.user;
  if (!u) return null;
  return {
    id: String(u.id),
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Гравець',
    avatar: u.photo_url || '',
  };
}

export function haptic(kind = 'light') { tg()?.HapticFeedback?.impactOccurred(kind); }
export function hapticNotify(kind) { tg()?.HapticFeedback?.notificationOccurred(kind); }
