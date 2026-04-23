// Точка входу. Реєструє маршрути та підіймає всі сторінки.
import { mountNotifier } from "./components/notifier.js";
import { initTelegram } from "./lib/telegram.js";
import { route, start } from "./lib/router.js";
import { HomePage } from "./pages/home.js";
import { NewGamePage } from "./pages/new-game.js";
import { RulesPage } from "./pages/rules.js";
import { OnlineLobbyPage } from "./pages/online-lobby.js";
import { OnlineRoomPage } from "./pages/online-room.js";
import { SoloGamePage } from "./pages/solo-game.js";
import { NotFoundPage } from "./pages/not-found.js";
import { mount } from "./lib/dom.js";

initTelegram();
mountNotifier();

const root = document.getElementById("root");

route("/", () => {
  document.body.className = "bg-noir grain vignette";
  mount(root, HomePage());
});
route("/new", () => {
  document.body.className = "bg-noir grain vignette";
  return NewGamePage(root);
});
route("/rules", () => {
  document.body.className = "bg-noir grain vignette";
  RulesPage(root);
});
route("/online", () => {
  document.body.className = "bg-noir grain vignette";
  return OnlineLobbyPage(root);
});
route("/online/:code", (params) => {
  document.body.className = "bg-noir grain vignette";
  return OnlineRoomPage(root, params.code.toUpperCase());
});
route("/game", () => {
  document.body.className = "grain vignette";
  return SoloGamePage(root);
});

start(() => NotFoundPage(root));
