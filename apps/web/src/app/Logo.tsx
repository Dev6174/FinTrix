/** FinTrix mark: an "F" built from a matrix of bars that fade out — scenarios fanning from one policy. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <rect width="32" height="32" rx="8" className="fill-bg-3" />
      <rect x="7" y="7" width="4" height="18" rx="1.5" className="fill-accent" />
      <rect x="13" y="7" width="12" height="4" rx="1.5" className="fill-accent" />
      <rect x="13" y="14" width="8" height="4" rx="1.5" className="fill-accent" opacity=".7" />
      <rect x="13" y="21" width="4" height="4" rx="1.5" className="fill-accent" opacity=".45" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="text-md font-semibold tracking-tight text-fg">
      Fin<span className="text-accent">Trix</span>
    </span>
  );
}
