// Простий хеш-роутер. Маршрути виду "#/", "#/online/:code".
// Відкривається з file://, з будь-якого хостингу, з підпапки — без серверної конфігурації.

const routes = [];
let currentCleanup = null;

export function route(pattern, handler) {
  // /online/:code → regex /^\/online\/([^/]+)$/
  const keys = [];
  const regex = new RegExp(
    "^" +
      pattern
        .replace(/\/$/, "")
        .replace(/:[^/]+/g, (m) => {
          keys.push(m.slice(1));
          return "([^/]+)";
        }) +
      "/?$",
  );
  routes.push({ regex, keys, handler });
}

export function navigate(path) {
  if (!path.startsWith("#")) path = "#" + path;
  if (location.hash === path) {
    handleRoute();
  } else {
    location.hash = path;
  }
}

export function start(notFound) {
  window.addEventListener("hashchange", handleRoute);
  handleRoute(notFound);
}

function handleRoute(notFound) {
  if (typeof currentCleanup === "function") {
    try { currentCleanup(); } catch { /* */ }
    currentCleanup = null;
  }
  let path = location.hash.replace(/^#/, "") || "/";
  if (!path.startsWith("/")) path = "/" + path;
  for (const r of routes) {
    const m = path.match(r.regex);
    if (m) {
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      const result = r.handler(params);
      if (typeof result === "function") currentCleanup = result;
      window.scrollTo(0, 0);
      return;
    }
  }
  if (notFound) notFound();
}
