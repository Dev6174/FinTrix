import { LayoutGrid, Monitor, Moon, Search, Sun } from 'lucide-react';
import { Suspense, useMemo } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { cn } from '../lib/cn';
import { useCommands, useRegisterCommands, type CommandItem } from '../ui/CommandPalette';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Skeleton } from '../ui/Skeleton';
import { Tooltip } from '../ui/Tooltip';
import { LogoMark, Wordmark } from './Logo';
import { useUi, type ThemePref } from './theme';

/** Only routes that exist are listed; later steps append Lab, Monitor, Results, HPC, History. */
const NAV = [{ to: '/gallery', label: 'Component gallery', icon: LayoutGrid }] as const;

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

  return (
    <div className="grid h-full grid-cols-[56px_1fr] grid-rows-[48px_1fr]">
      <a
        href="#main"
        className="sr-only z-50 rounded-sm bg-accent px-3 py-2 text-accent-fg focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <nav
        aria-label="Primary"
        className="row-span-2 flex flex-col items-center gap-1 border-r border-border-subtle bg-bg-1 py-2"
      >
        <NavLink to="/" aria-label="FinTrix home" className="mb-3 rounded-md">
          <LogoMark className="size-8" />
        </NavLink>
        {NAV.map(({ to, label, icon: Icon }) => (
          <Tooltip key={to} content={label} side="right">
            <NavLink
              to={to}
              aria-label={label}
              className={({ isActive }) =>
                cn(
                  'flex size-10 items-center justify-center rounded-md text-fg-3 transition-colors duration-(--dur-fast) hover:bg-bg-3 hover:text-fg',
                  isActive &&
                    'bg-accent-subtle text-accent hover:bg-accent-subtle hover:text-accent',
                )
              }
            >
              <Icon aria-hidden className="size-5" strokeWidth={1.5} />
            </NavLink>
          </Tooltip>
        ))}
      </nav>

      <header className="flex items-center justify-between gap-4 border-b border-border-subtle bg-bg-1 px-4">
        <Wordmark />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openPalette(true)}
            className="flex h-control w-56 items-center gap-2 rounded-sm border border-border-subtle bg-bg-0 px-2.5 text-sm text-fg-3 transition-colors duration-(--dur-fast) hover:border-border-strong hover:text-fg-2"
          >
            <Search aria-hidden className="size-4" strokeWidth={1.5} />
            <span className="flex-1 text-left">Search or run a command</span>
            <kbd className="num text-xs">Ctrl K</kbd>
          </button>
          <SegmentedControl<ThemePref>
            label="Theme"
            value={theme}
            onChange={setTheme}
            segments={[
              {
                value: 'dark',
                label: <Moon aria-label="Dark" className="size-4" strokeWidth={1.5} />,
              },
              {
                value: 'light',
                label: <Sun aria-label="Light" className="size-4" strokeWidth={1.5} />,
              },
              {
                value: 'system',
                label: <Monitor aria-label="System" className="size-4" strokeWidth={1.5} />,
              },
            ]}
          />{' '}
        </div>
      </header>

      <main id="main" className="min-w-0 overflow-auto bg-bg-0">
        <Suspense fallback={<RouteSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function RouteSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6" role="status" aria-label="Loading screen">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
