import { route, start }      from './lib/router.js';
import { initTelegram }       from './lib/telegram.js';
import { mountNotifier }      from './components/notifier.js';
import { toggleSound, isSoundOn } from './lib/sound.js';
import { h }                  from './lib/dom.js';

import { HomePage }           from './pages/home.js';
import { NewGamePage }        from './pages/new-game.js';
import { SoloGamePage }       from './pages/solo-game.js';
import { RulesPage }          from './pages/rules.js';
import { OnlineLobbyPage }    from './pages/online-lobby.js';
import { OnlineRoomPage }     from './pages/online-room.js';
import { StatsPage }          from './pages/stats.js';
import { SettingsPage }       from './pages/settings.js';
import { NotFoundPage }       from './pages/not-found.js';

initTelegram();
mountNotifier();
mountSoundToggle();

const root = document.getElementById('root');

function transitionPage(fn, params) {
  root.classList.remove('page-enter');
  void root.offsetWidth;
  root.innerHTML = '';
  root.classList.add('page-enter');
  return fn(root, params);
}

function page(fn) {
  return params => transitionPage(fn, params);
}

route('/',              page(r => { const el = HomePage(); r.appendChild(el); }));
route('/new',           page(NewGamePage));
route('/game',          page(SoloGamePage));
route('/rules',         page(RulesPage));
route('/online',        page(OnlineLobbyPage));
route('/online/:code',  params => transitionPage((r, p) => OnlineRoomPage(r, p), params));
route('/stats',         page(r => StatsPage(r)));
route('/settings',      page(r => SettingsPage(r)));

start(() => NotFoundPage(root));

// ── Global sound toggle ────────────────────────────────────────────────────────
function mountSoundToggle() {
  let btn;

  function update() {
    if (btn) btn.textContent = isSoundOn() ? '🔊' : '🔇';
  }

  btn = h('button.sound-fab', {
    title: 'Увімкнути / вимкнути озвучку',
    onclick: () => { toggleSound(); update(); },
  }, isSoundOn() ? '🔊' : '🔇');

  document.body.appendChild(btn);
}
