import { createRoom, joinRoom, loadNickname, saveNickname, saveMe } from '../lib/storage.js';
import { getTelegramUser, haptic } from '../lib/telegram.js';
import { notify } from '../lib/notify.js';
import { navigate } from '../lib/router.js';

const VIS_OPTIONS = [
  { v: 'public',    icon: '🌍', label: 'Публічна',   desc: 'Видима всім у списку кімнат' },
  { v: 'protected', icon: '🔒', label: 'З паролем',  desc: 'Потрібен пароль для входу' },
  { v: 'private',   icon: '👁️', label: 'Прихована',  desc: 'Знайти можна лише за кодом' },
];

export function mountGameModal({ onClose }) {
  const root = document.getElementById('modal-root');
  const tgUser = getTelegramUser();

  let state = {
    view:       'menu',
    name:       tgUser?.name || loadNickname() || '',
    code:       '',
    visibility: 'public',
    password:   '',
    busy:       false,
    error:      '',
  };

  function set(patch) {
    Object.assign(state, patch);
    mount();
  }

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleCreate() {
    const n = state.name.trim();
    if (!n) { set({ error: "Введіть ваше ім'я" }); return; }
    if (state.visibility === 'protected' && !state.password.trim()) {
      set({ error: 'Введіть пароль для кімнати' }); return;
    }
    set({ busy: true, error: '' });
    haptic('medium');
    try {
      const r = await createRoom(n, {
        hostId:     tgUser?.id   ? String(tgUser.id) : undefined,
        photoUrl:   tgUser?.avatar || '',
        visibility: state.visibility,
        password:   state.visibility === 'protected' ? state.password.trim() : '',
      });
      saveNickname(n);
      saveMe(r.code, { id: r.playerId, name: n, avatar: '🎭', photoUrl: tgUser?.avatar || '' });
      onClose();
      navigate(`/online/${r.code}`);
    } catch (e) {
      set({ busy: false, error: e.message || 'Помилка' });
    }
  }

  async function handleJoin() {
    const c = state.code.trim().toUpperCase();
    const n = state.name.trim();
    if (!c) { set({ error: 'Введіть код кімнати' }); return; }
    if (!n) { set({ error: "Введіть ваше ім'я" }); return; }
    set({ busy: true, error: '' });
    haptic('medium');
    try {
      const r = await joinRoom(c, n, {
        id:       tgUser?.id ? String(tgUser.id) : undefined,
        photoUrl: tgUser?.avatar || '',
        password: state.password,
      });
      saveNickname(n);
      saveMe(r.code, { id: r.playerId, name: n, avatar: '🎭', photoUrl: tgUser?.avatar || '' });
      onClose();
      navigate(`/online/${r.code}`);
    } catch (e) {
      set({ busy: false, error: e.message || 'Кімнату не знайдено' });
    }
  }

  // ── Build UI ───────────────────────────────────────────────────────────────
  function build() {
    const wrapper = document.createElement('div');
    wrapper.className = 'game-modal';

    const backdrop = document.createElement('div');
    backdrop.className = 'game-modal-backdrop';
    backdrop.onclick = onClose;
    wrapper.appendChild(backdrop);

    const sheet = document.createElement('div');
    sheet.className = 'game-modal-sheet';
    sheet.onclick = e => e.stopPropagation();
    wrapper.appendChild(sheet);

    sheet.appendChild(el('div', 'game-modal-handle'));

    sheet.appendChild(el('div', 'game-modal-title', 'Нова гра'));

    if (state.view === 'menu') {
      const grid = el('div', 'modal-action-grid');
      grid.appendChild(actionCard('🎭', 'Соло гра',   'Проти ботів',    () => { onClose(); navigate('/new'); }));
      grid.appendChild(actionCard('🕯️', 'Онлайн',    'Створити кімнату', () => set({ view: 'create', error: '' })));
      grid.appendChild(actionCard('🔑', 'Увійти',    'За кодом',        () => set({ view: 'join', error: '' })));
      sheet.appendChild(grid);
    }

    if (state.view !== 'menu') {
      const back = document.createElement('button');
      back.className = 'modal-back-btn';
      back.innerHTML = '← Назад';
      back.onclick = () => set({ view: 'menu', error: '', password: '' });
      sheet.appendChild(back);
    }

    if (state.view === 'create') {
      const form = el('div', 'modal-form');
      form.appendChild(el('div', 'modal-form-title', '🕯️ Створити кімнату'));

      form.appendChild(label("Ваше ім'я"));
      form.appendChild(input(state.name, "Введіть ім'я", e => set({ name: e.target.value }), !!tgUser));

      const visLbl = label('Тип кімнати');
      visLbl.style.marginTop = '14px';
      form.appendChild(visLbl);

      const visPicker = el('div', 'vis-picker');
      for (const opt of VIS_OPTIONS) {
        const btn = document.createElement('button');
        btn.className = 'vis-btn' + (state.visibility === opt.v ? ' selected' : '');
        btn.innerHTML = `<span class="vis-icon">${opt.icon}</span>${opt.label}`;
        btn.onclick = () => set({ visibility: opt.v, password: '' });
        visPicker.appendChild(btn);
      }
      form.appendChild(visPicker);

      const visDesc = el('p', 'vis-desc',
        VIS_OPTIONS.find(o => o.v === state.visibility)?.desc || '');
      form.appendChild(visDesc);

      if (state.visibility === 'protected') {
        const pwLbl = label('Пароль кімнати');
        pwLbl.style.marginTop = '10px';
        form.appendChild(pwLbl);
        const pw = input(state.password, 'Введіть пароль', e => set({ password: e.target.value }));
        pw.type = 'password';
        form.appendChild(pw);
      }

      if (state.error) form.appendChild(errorEl(state.error));

      const btn = document.createElement('button');
      btn.className = 'btn btn-blood';
      btn.style.marginTop = '16px';
      btn.disabled = state.busy;
      btn.textContent = state.busy ? 'Створення...' : 'Створити кімнату';
      btn.onclick = handleCreate;
      form.appendChild(btn);

      sheet.appendChild(form);
    }

    if (state.view === 'join') {
      const form = el('div', 'modal-form');
      form.appendChild(el('div', 'modal-form-title', '🔑 Приєднатися за кодом'));

      form.appendChild(label("Ваше ім'я"));
      form.appendChild(input(state.name, "Введіть ім'я", e => set({ name: e.target.value }), !!tgUser));

      const codeLbl = label('Код кімнати');
      codeLbl.style.marginTop = '14px';
      form.appendChild(codeLbl);

      const codeInp = document.createElement('input');
      codeInp.className = 'input input-code';
      codeInp.value = state.code;
      codeInp.placeholder = 'ABCDE';
      codeInp.maxLength = 6;
      codeInp.oninput = e => {
        e.target.value = e.target.value.toUpperCase();
        set({ code: e.target.value, error: '' });
      };
      codeInp.onkeydown = e => { if (e.key === 'Enter') handleJoin(); };
      form.appendChild(codeInp);

      const pwLbl = label('Пароль (якщо кімната захищена)');
      pwLbl.style.marginTop = '10px';
      form.appendChild(pwLbl);
      const pwInp = input(state.password, 'Залиште порожнім якщо немає', e => set({ password: e.target.value }));
      pwInp.type = 'password';
      form.appendChild(pwInp);

      if (state.error) form.appendChild(errorEl(state.error));

      const btn = document.createElement('button');
      btn.className = 'btn btn-blood';
      btn.style.marginTop = '16px';
      btn.disabled = state.busy;
      btn.textContent = state.busy ? 'Підключення...' : 'Приєднатися';
      btn.onclick = handleJoin;
      form.appendChild(btn);

      sheet.appendChild(form);
    }

    return wrapper;
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function label(text) {
    const l = document.createElement('label');
    l.className = 'label';
    l.textContent = text;
    return l;
  }
  function input(value, placeholder, oninput, disabled = false) {
    const i = document.createElement('input');
    i.className = 'input';
    i.value = value || '';
    i.placeholder = placeholder;
    i.oninput = oninput;
    i.disabled = disabled;
    return i;
  }
  function errorEl(msg) {
    const p = document.createElement('p');
    p.className = 'modal-error';
    p.textContent = '⚠️ ' + msg;
    return p;
  }
  function actionCard(icon, title, sub, onClick) {
    const btn = document.createElement('button');
    btn.className = 'modal-action-btn';
    btn.innerHTML = `<span class="action-icon">${icon}</span><span class="action-label">${title}</span><span class="action-sub">${sub}</span>`;
    btn.onclick = onClick;
    return btn;
  }

  // ── Mount / re-render ──────────────────────────────────────────────────────
  let current = null;

  function mount() {
    if (current) current.remove();
    current = build();
    root.appendChild(current);
  }

  mount();

  return {
    destroy() {
      if (current) { current.remove(); current = null; }
    },
  };
}
