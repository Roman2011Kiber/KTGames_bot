import { navigate } from '../lib/router.js';

const TABS = [
  { id: 'rooms',    icon: '🎭', label: 'Кімнати',  path: '/'         },
  { id: 'rules',    icon: '📖', label: 'Правила',   path: '/rules'    },
  { id: 'fab' },
  { id: 'stats',    icon: '🏆', label: 'Рейтинг',   path: '/stats'    },
  { id: 'settings', icon: '⚙️', label: 'Налашт.',   path: '/settings' },
];

const HIDDEN_ON = ['/game', '/new', '/online/'];

function getActive() {
  const path = (location.hash.replace(/^#/, '') || '/').split('?')[0];
  if (path === '/')            return 'rooms';
  if (path.startsWith('/rules'))    return 'rules';
  if (path.startsWith('/stats'))    return 'stats';
  if (path.startsWith('/settings')) return 'settings';
  return '';
}

function isHiddenRoute() {
  const path = (location.hash.replace(/^#/, '') || '/');
  return HIDDEN_ON.some(h => path === h || path.startsWith(h));
}

export function mountBottomNav({ onFabToggle }) {
  let fabOpen = false;
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';

  function setFabOpen(open) {
    fabOpen = open;
    render();
    onFabToggle(open);
  }

  function render() {
    const active = getActive();
    nav.innerHTML = '';

    for (const tab of TABS) {
      if (tab.id === 'fab') {
        const wrap = document.createElement('div');
        wrap.className = 'nav-fab-wrap';

        const btn = document.createElement('button');
        btn.className = 'nav-fab' + (fabOpen ? ' open' : '');
        btn.setAttribute('aria-label', fabOpen ? 'Закрити' : 'Нова гра');
        btn.innerHTML = fabOpen ? '✕' : '+';
        btn.onclick = () => setFabOpen(!fabOpen);

        const lbl = document.createElement('span');
        lbl.className = 'nav-fab-label';
        lbl.textContent = fabOpen ? 'Закрити' : 'Нова гра';

        wrap.appendChild(btn);
        wrap.appendChild(lbl);
        nav.appendChild(wrap);
      } else {
        const btn = document.createElement('button');
        btn.className = 'nav-item' + (active === tab.id ? ' active' : '');
        btn.innerHTML = `<span class="nav-icon">${tab.icon}</span><span>${tab.label}</span>`;
        btn.onclick = () => {
          setFabOpen(false);
          navigate(tab.path);
        };
        nav.appendChild(btn);
      }
    }
  }

  function onHash() {
    if (isHiddenRoute()) {
      nav.style.display = 'none';
      document.body.classList.remove('has-nav');
    } else {
      nav.style.display = '';
      document.body.classList.add('has-nav');
      render();
    }
  }

  window.addEventListener('hashchange', onHash);
  document.body.appendChild(nav);
  onHash();

  return {
    setFabOpen,
    destroy() {
      window.removeEventListener('hashchange', onHash);
      nav.remove();
      document.body.classList.remove('has-nav');
    },
  };
}
