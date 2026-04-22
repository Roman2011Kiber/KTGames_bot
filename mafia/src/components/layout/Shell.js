import { Link } from "wouter";

export function Shell({ children, back, title }) {
  return (
    <div className="relative z-10 mx-auto w-full max-w-3xl px-5 pt-6 pb-24">
      <header className="flex items-center justify-between mb-6">
        <Link
          href={back ?? "/"}
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-accent transition-colors"
        >
          ← Назад
        </Link>
        {title && (
          <span className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">
            {title}
          </span>
        )}
        <span className="w-10" />
      </header>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }) {
  return (
    <div className={`card-noir rounded-lg p-5 ${className}`}>{children}</div>
  );
}
