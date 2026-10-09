import * as T from '@radix-ui/react-toast';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { create } from 'zustand';
import { cn } from '../lib/cn';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';
export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

const MAX_TOASTS = 4; // bounded: a burst of background events never piles up

interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;
export const useToasts = create<ToastState>((set) => ({
  items: [],
  push: (t) => set((s) => ({ items: [...s.items, { ...t, id: nextId++ }].slice(-MAX_TOASTS) })),
  dismiss: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));

export const toast = (t: Omit<ToastItem, 'id'>) => useToasts.getState().push(t);

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;
const toneText: Record<ToastTone, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function Toaster() {
  const items = useToasts((s) => s.items);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <T.Provider swipeDirection="right" duration={5000}>
      {items.map((t) => {
        const Icon = icons[t.tone];
        return (
          <T.Root
            key={t.id}
            type={t.tone === 'danger' ? 'foreground' : 'background'}
            onOpenChange={(open) => !open && dismiss(t.id)}
            className="flex items-start gap-3 rounded-md border border-border-subtle bg-bg-2 p-3 shadow-lg data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)"
          >
            <Icon
              aria-hidden
              className={cn('mt-0.5 size-4 shrink-0', toneText[t.tone])}
              strokeWidth={1.5}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <T.Title className="text-base font-medium text-fg">{t.title}</T.Title>
              {t.description && (
                <T.Description className="text-sm text-fg-2">{t.description}</T.Description>
              )}
            </div>
            <T.Close
              aria-label="Dismiss"
              className="rounded-sm p-0.5 text-fg-3 hover:bg-bg-3 hover:text-fg"
            >
              <X aria-hidden className="size-4" strokeWidth={1.5} />
            </T.Close>
          </T.Root>
        );
      })}
      <T.Viewport className="fixed right-4 bottom-4 z-50 flex w-90 max-w-[calc(100vw-32px)] flex-col gap-2 outline-none" />
    </T.Provider>
  );
}
