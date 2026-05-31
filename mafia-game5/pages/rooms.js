import { h } from '../lib/dom.js';
import { listPublicRooms, joinRoom, loadNickname, saveNickname, saveMe } from '../lib/storage.js';
import { getTelegramUser, haptic } from '../lib/telegram.js';
import { notify } from '../lib/notify.js';
import { navigate } from '../lib/router.js';
import { loadLastGame } from '../lib/storage.js';

const BADGE = {
  public:    { icon: '🌍', label: 'Публічна',   cls: 'badge-public'    },
  protected: { icon: '🔒', label: 'З паролем',  cls: 'badge-protected' },
  private:   { icon: '👁️', label: 'Прихована',  cls: 'badge-private'   },
};

export async function RoomsPage(container) {
  let rooms       = [];
  let filter      = 'all';
  let loading     = true;
  let loadError   = null;
  let refreshTimer = null;

  function render() {
    container.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'rooms-page';

    // ── Hero ─────────────────────────────────────────────────────────────
    const hero = document.createElement('div');
    hero.className = 'rooms-hero';
    hero.innerHTML = `
      <p class="home-eyebrow">ТЕМНА СТОРОНА МІСТА</p>
      <h1 class="home-title gold-text">МАФІЯ</h1>
      <p class="home-tagline font-serif italic">Місто засинає. Прокидається мафія.</p>
    `;
    page.appendChild(hero);

    // ── Continue game ─────────────────────────────────────────────────────
    const last = loadLastGame();
    if (last && last.phase !== 'ended' && last.phase !== 'result') {
      const wrap = document.createElement('div');
      wrap.style.padding = '0 16px 12px';
      const link = document.createElement('a');
      link.className = 'home-card primary';
      link.href = '#/game';
      link.innerHTML = `<div><div class="title">Продовжити гру</div><div class="sub">Соло — ніч ${last.day || 1}</div></div><span class="icon">▶️</span>`;
      wrap.appendChild(link);
      page.appendChild(wrap);
    }

    // ── Section header ─────────────────────────────────────────────────────
    const secHead = document.createElement('div');
    secHead.className = 'rooms-section-head';
    const secTitle = document.createElement('div');
    secTitle.className = 'rooms-section-title';
    secTitle.textContent = '🎮 Відкриті кімнати';
    secHead.appendChild(secTitle);
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'rooms-refresh-btn';
    refreshBtn.title = 'Оновити список';
    refreshBtn.innerHTML = loading ? '⏳' : '🔄';
    refreshBtn.disabled = loading;
    refreshBtn.onclick = () => { loadError = null; loading = true; render(); loadRooms(); };
    secHead.appendChild(refreshBtn);
    page.appendChild(secHead);

    // ── Firebase error banner ─────────────────────────────────────────────
    if (loadError) {
      const banner = document.createElement('div');
      banner.className = 'rooms-error-banner';
      const isPermission = loadError.toLowerCase().includes('permission')
        || loadError.toLowerCase().includes('denied')
        || loadError.toLowerCase().includes('missing');
      const isTimeout = loadError.includes('timeout');
      if (isPermission) {
        banner.innerHTML = `
          <strong>🔒 Firestore заблокував читання</strong>
          Відкрийте <a href="https://console.firebase.google.com/project/js25-52181/firestore/rules" target="_blank" class="rooms-error-link">Firebase Console → Rules</a>
          і додайте правило для кімнат:<br>
          <code class="rooms-error-code">match /rooms/{code} {\n  allow read, write: if true;\n}</code>`;
      } else if (isTimeout) {
        banner.innerHTML = `
          <strong>⏱️ Firebase не відповів за 8 секунд</strong>
          Перевірте підключення до мережі або
          <a href="https://console.firebase.google.com/project/js25-52181/firestore/rules" target="_blank" class="rooms-error-link">правила Firestore</a>.
          <br><br>
          <button onclick="this.closest('.rooms-error-banner').remove(); window.location.reload()" 
            style="margin-top:8px;padding:6px 14px;border-radius:8px;background:var(--blood);color:#fff;border:none;cursor:pointer;font-size:.82rem">
            🔄 Спробувати ще раз
          </button>`;
      } else {
        banner.innerHTML = `<strong>⚠️ Помилка з'єднання з Firestore</strong><br>${loadError}`;
      }
      page.appendChild(banner);
    }

    // ── Filter chips ──────────────────────────────────────────────────────
    if (!loadError) {
      const filterRow = document.createElement('div');
      filterRow.className = 'rooms-filter';
      [
        { id: 'all',       label: 'Всі' },
        { id: 'public',    label: '🌍 Публічні' },
        { id: 'protected', label: '🔒 З паролем' },
      ].forEach(({ id, label }) => {
        const chip = document.createElement('button');
        chip.className = 'filter-chip' + (filter === id ? ' active' : '');
        chip.textContent = label;
        chip.onclick = () => { filter = id; render(); };
        filterRow.appendChild(chip);
      });
      page.appendChild(filterRow);
    }

    // ── Room list ─────────────────────────────────────────────────────────
    const listEl = document.createElement('div');
    listEl.className = 'rooms-list';

    if (loading) {
      const ld = document.createElement('div');
      ld.className = 'rooms-loading';
      ld.innerHTML = '<span class="rooms-loading-dot"></span>Завантаження кімнат...';
      listEl.appendChild(ld);
    } else if (!loadError) {
      const visible = rooms.filter(r =>
        filter === 'all' || (r.visibility || 'public') === filter
      );
      if (!visible.length) {
        const empty = document.createElement('div');
        empty.className = 'rooms-empty';
        empty.innerHTML = `
          <div class="rooms-empty-icon">🏙️</div>
          <p>Наразі немає відкритих кімнат</p>
          <p class="rooms-empty-sub">Натисніть <b>+</b> щоб створити першу!</p>
        `;
        listEl.appendChild(empty);
      } else {
        visible.forEach(room => listEl.appendChild(buildRoomCard(room)));
      }
    }

    page.appendChild(listEl);
    page.appendChild(Object.assign(document.createElement('div'), { className: 'rooms-bottom-spacer' }));
    container.appendChild(page);
  }

  function buildRoomCard(room) {
    const vis   = room.visibility || 'public';
    const badge = BADGE[vis] || BADGE.public;
    const host  = (room.players || []).find(p => p.id === room.hostId);
    const humans = (room.players || []).filter(p => !p.isBot).length;

    const card = document.createElement('div');
    card.className = 'room-card';

    const info = document.createElement('div');
    info.className = 'room-card-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'room-card-name';
    nameEl.textContent = host ? `${host.avatar || '🎭'} ${host.name}` : `Кімната #${room.code}`;
    info.appendChild(nameEl);

    const meta = document.createElement('div');
    meta.className = 'room-card-meta';
    const badgeEl = document.createElement('span');
    badgeEl.className = `room-badge ${badge.cls}`;
    badgeEl.textContent = `${badge.icon} ${badge.label}`;
    meta.appendChild(document.createTextNode(`${humans} гравців · `));
    meta.appendChild(badgeEl);
    meta.appendChild(document.createTextNode(` · #${room.code}`));
    info.appendChild(meta);
    card.appendChild(info);

    const joinBtn = document.createElement('button');
    joinBtn.className = 'room-join-btn';
    joinBtn.textContent = vis === 'protected' ? '🔒 Увійти' : 'Увійти';
    joinBtn.onclick = () => handleJoinRoom(room);
    card.appendChild(joinBtn);

    return card;
  }

  async function handleJoinRoom(room) {
    const tgUser = getTelegramUser();
    const name = tgUser?.name || loadNickname() || '';
    if (!name) { notify("Спочатку введіть ім'я в Налаштуваннях", 'error'); return; }

    let password = '';
    if (room.visibility === 'protected') {
      const pw = window.prompt(`🔒 Кімната #${room.code} захищена паролем:`);
      if (pw === null) return;
      password = pw;
    }

    haptic('medium');
    try {
      const r = await joinRoom(room.code, name, {
        id:       tgUser?.id ? String(tgUser.id) : undefined,
        photoUrl: tgUser?.avatar || '',
        password,
      });
      saveNickname(name);
      saveMe(r.code, { id: r.playerId, name, avatar: '🎭', photoUrl: tgUser?.avatar || '' });
      navigate(`/online/${r.code}`);
    } catch (e) {
      notify(e.message || 'Помилка підключення', 'error');
    }
  }

  async function loadRooms() {
    clearTimeout(refreshTimer);
    try {
      // 8-секундний таймаут щоб не зависати
      const timeout = new Promise((_, rej) =>
        setTimeout(() => rej(new Error('timeout: Firebase не відповідає')), 8000)
      );
      rooms     = await Promise.race([listPublicRooms(), timeout]);
      loading   = false;
      loadError = null;
    } catch (e) {
      loading   = false;
      loadError = e.message || 'Невідома помилка';
      rooms     = [];
    }
    render();
    // Авто-оновлення кожні 30с (лише якщо немає помилки)
    if (!loadError) {
      refreshTimer = setTimeout(loadRooms, 30_000);
    }
  }

  window.addEventListener('hashchange', () => clearTimeout(refreshTimer), { once: true });

  render();
  loadRooms();
}
