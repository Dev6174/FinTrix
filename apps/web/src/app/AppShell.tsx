import { CandlestickChart, LayoutGrid, Monitor, Moon, Search, Sun } from 'lucide-react';
import { Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useCommands, useRegisterCommands, type CommandItem } from '../ui/CommandPalette';
import { Skeleton } from '../ui/Skeleton';
import { Tooltip } from '../ui/Tooltip';
import { LogoMark } from './Logo';
import { useUi } from './theme';

/** Only routes that exist are listed. */
const NAV = [
  { to: '/lab', label: 'Policy Lab', icon: CandlestickChart },
  { to: '/gallery', label: 'Component gallery', icon: LayoutGrid },
] as const;

const TOOLBAR_ID = 'fx-toolbar-slot';

/** Screens render their toolbar into the shared top bar (one bar, trading-terminal style). */
export function Toolbar({ children }: { children: ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  useEffect(() => setEl(document.getElementById(TOOLBAR_ID)), []);
  return el ? createPortal(children, el) : null;
}

export function ToolbarDivider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border-subtle" />;
}

export function AppShell() {
  const theme = useUi((s) => s.theme);
  const setTheme = useUi((s) => s.setTheme);
  const openPalette = useCommands((s) => s.setOpen);
  const navigate = useNavigate();

  const commands = useMemo<CommandItem[]>(
    () => [
      ...NAV.map((n) => ({
        id: `nav:${n.to}`,
        group: 'Navigate',
        label: n.label,
        icon: <n.icon />,
        run: () => navigate(n.to),
      })),
      {
        id: 'theme:dark',
        group: 'Theme',
        label: 'Dark theme',
        icon: <Moon />,
        run: () => setTheme('dark'),
      },
      {
        id: 'theme:light',
        group: 'Theme',
        label: 'Light theme',
        icon: <Sun />,
        run: () => setTheme('light'),
      },
      {
        id: 'theme:system',
        group: 'Theme',
        label: 'Match system theme',
        icon: <Monitor />,
        run: () => setTheme('system'),
      },
    ],
    [navigate, setTheme],
  );
  useRegisterCommands(commands);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const ThemeIcon = theme === 'dark' ? Moon : Sun;

  return (
    <div className="grid h-full grid-cols-[48px_1fr] grid-rows-[40px_1fr] gap-1 bg-bg-0">
      <a
        href="#main"
        className="sr-only z-50 rounded-sm bg-accent px-3 py-2 text-accent-fg focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      <NavLink
        to="/"
        aria-label="FinTrix home"
        className="flex items-center justify-center bg-bg-1"
      >
        <LogoMark className="size-7" />
      </NavLink>

      <header className="flex min-w-0 items-center gap-1 bg-bg-1 pr-2 pl-1">
        <span className="px-2 text-md font-semibold tracking-tight text-fg">
          Fin<span className="text-accent">Trix</span>
        </span>
        <span aria-hidden className="mx-1 h-5 w-px bg-border-subtle" />
        <div id={TOOLBAR_ID} className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" />
        <button
          type="button"
          onClick={() => openPalette(true)}
          className="flex h-7 items-center gap-2 rounded-sm px-2 text-sm text-fg-2 hover:bg-bg-3 hover:text-fg"
        >
          <Search aria-hidden className="size-4" strokeWidth={1.5} />
          <span className="hidden lg:inline">Search</span>
          <kbd className="num hidden text-xs text-fg-3 lg:inline">Ctrl K</kbd>
        </button>
        <Tooltip content={`Switch to ${nextTheme} theme`}>
          <button
            type="button"
            aria-label={`Switch to ${nextTheme} theme`}
            onClick={() => setTheme(nextTheme)}
            className="flex size-7 items-center justify-center rounded-sm text-fg-2 hover:bg-bg-3 hover:text-fg"
          >
            <ThemeIcon aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        </Tooltip>
      </header>

      <nav aria-label="Primary" className="flex flex-col items-center gap-1 bg-bg-1 py-2">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Tooltip key={to} content={label} side="right">
            <NavLink
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  'flex size-9 items-center justify-center rounded-sm text-fg-2 transition-colors duration-(--dur-fast) hover:bg-bg-3 hover:text-fg',
                  isActive && 'text-accent hover:text-accent',
                )
              }
            >
              <Icon aria-hidden className="size-5" strokeWidth={1.5} />
            </NavLink>
          </Tooltip>
        ))}
      </nav>

      <main id="main" className="min-h-0 min-w-0 overflow-auto">
        <Suspense fallback={<RouteSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function RouteSkeleton() {
  return (
    <div className="flex h-full flex-col gap-1" role="status" aria-label="Loading screen">
      <Skeleton className="flex-1 rounded-none" />
      <Skeleton className="h-48 rounded-none" />
    </div>
  );
}
