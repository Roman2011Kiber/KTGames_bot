import { useEffect, lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { Notifier } from "@/components/ui/Notifier";
import { initTelegram } from "@/lib/telegram";

// =====================================================================
//  Кожна сторінка завантажується окремим файлом — так у зібраному
//  сайті видно, де яка сторінка, і легше у них орієнтуватися.
// =====================================================================
const Home        = lazy(() => import("@/pages/Home"));
const NewGame     = lazy(() => import("@/pages/NewGame"));
const Rules       = lazy(() => import("@/pages/Rules"));
const NotFound    = lazy(() => import("@/pages/NotFound"));
const Game        = lazy(() => import("@/pages/game/Game"));
const OnlineLobby = lazy(() => import("@/pages/online/OnlineLobby"));
const OnlineRoom  = lazy(() => import("@/pages/online/OnlineRoom"));

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground font-serif italic">
      Завантаження...
    </div>
  );
}

function App() {
  useEffect(() => { initTelegram(); }, []);
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <div className="min-h-screen bg-noir grain vignette text-foreground">
        <Suspense fallback={<Loading />}>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/new" component={NewGame} />
            <Route path="/game" component={Game} />
            <Route path="/rules" component={Rules} />
            <Route path="/online" component={OnlineLobby} />
            <Route path="/online/:code" component={OnlineRoom} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
        <Notifier />
      </div>
    </WouterRouter>
  );
}

export default App;
