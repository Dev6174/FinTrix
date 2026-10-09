import { create } from 'zustand';

export type ThemePref = 'dark' | 'light' | 'system';
export type Density = 'comfortable' | 'compact';

const KEY = 'fintrix.ui';

interface UiPrefs {
  theme: ThemePref;
  density: Density;
}

function load(): UiPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<UiPrefs>;
    return {
      theme: v.theme === 'light' || v.theme === 'system' ? v.theme : 'dark',
      density: v.density === 'compact' ? 'compact' : 'comfortable',
    };
  } catch {
    return { theme: 'dark', density: 'comfortable' };
  }
}

export const resolveTheme = (t: ThemePref): 'dark' | 'light' =>
  t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;

function apply({ theme, density }: UiPrefs) {
  const el = document.documentElement;
  el.dataset.theme = resolveTheme(theme);
  el.dataset.density = density;
}

interface UiStore extends UiPrefs {
  setTheme: (t: ThemePref) => void;
  setDensity: (d: Density) => void;
}

export const useUi = create<UiStore>((set, get) => {
  const save = (p: Partial<UiPrefs>) => {
    set(p);
    const s = get();
    const prefs = { theme: s.theme, density: s.density };
    apply(prefs);
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* storage blocked: prefs still apply for this session */
    }
  };
  return {
    ...load(),
    setTheme: (theme) => save({ theme }),
    setDensity: (density) => save({ density }),
  };
});

export function initTheme() {
  apply(useUi.getState());
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () =>
    apply(useUi.getState()),
  );
}
