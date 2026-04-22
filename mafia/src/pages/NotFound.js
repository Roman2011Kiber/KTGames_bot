import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="relative z-10 mx-auto w-full max-w-3xl px-5 pt-24 text-center">
      <div className="text-6xl mb-4">🃏</div>
      <h1 className="font-display text-5xl gold-text">404</h1>
      <p className="mt-3 text-muted-foreground font-serif italic">
        Цю сторінку місто не знає.
      </p>
      <Link
        href="/"
        className="inline-block mt-8 px-6 py-3 rounded-md border border-gold text-accent hover:bg-accent/10"
      >
        ← На головну
      </Link>
    </div>
  );
}
