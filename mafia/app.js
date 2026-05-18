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
import { NotFoundPage }       from './pages/not-found.js';

initTelegram();
mountNotifier();
mountSoundToggle();

const root = document.getElementById('root');

function transitionPage(fn, params) {
  // Remove animation class, force reflow, re-add to restart animation
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

start(() => NotFoundPage(root));

// â”€â”€ Global sound toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function mountSoundToggle() {
  let btn;

  function update() {
    if (btn) btn.textContent = isSoundOn() ? 'ðŸ”Š' : 'ðŸ”‡';
  }

  btn = h('button.sound-fab', {
    title: 'Ð£Ð²Ñ–Ð¼ÐºÐ½ÑƒÑ‚Ð¸ / Ð²Ð¸Ð¼ÐºÐ½ÑƒÑ‚Ð¸ Ð¾Ð·Ð²ÑƒÑ‡ÐºÑƒ',
    onclick: () => { toggleSound(); update(); },
  }, isSoundOn() ? 'ðŸ”Š' : 'ðŸ”‡');

  document.body.appendChild(btn);
}
