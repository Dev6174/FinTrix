import { Command } from 'cmdk';
import { useEffect, useState, type ReactNode } from 'react';
import { create } from 'zustand';

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon?: ReactNode;
  shortcut?: string;
  keywords?: string[];
  run: () => void;
}

/** Screens register commands while mounted; the palette lists whatever is registered. */
interface CommandRegistry {
  items: Map<string, CommandItem>;
  register: (items: CommandItem[]) => () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useCommands = create<CommandRegistry>((set, get) => ({
  items: new Map(),
  register: (items) => {
    const next = new Map(get().items);
    for (const i of items) next.set(i.id, i);
    set({ items: next });
    return () => {
      const m = new Map(get().items);
      for (const i of items) m.delete(i.id);
      set({ items: m });
    };
  },
  open: false,
  setOpen: (open) => set({ open }),
}));

export function useRegisterCommands(items: CommandItem[]) {
  const register = useCommands((s) => s.register);
  useEffect(() => register(items), [register, items]);
}

export function CommandPalette() {
  const open = useCommands((s) => s.open);
  const setOpen = useCommands((s) => s.setOpen);
  const items = useCommands((s) => s.items);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useCommands.getState().open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const groups = new Map<string, CommandItem[]>();
  for (const i of items.values()) groups.set(i.group, [...(groups.get(i.group) ?? []), i]);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery('');
      }}
      label="Command palette"
      overlayClassName="fixed inset-0 z-40 bg-overlay"
      contentClassName="fixed top-[18vh] left-1/2 z-50 w-[min(560px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-lg border border-border-subtle bg-bg-2 shadow-lg"
    >
      <Command.Input
        value={query}
        onValueChange={setQuery}
        placeholder="Type a command or search…"
        className="h-12 w-full border-b border-border-subtle bg-transparent px-4 text-md text-fg placeholder:text-fg-3 focus:outline-none"
      />
      <Command.List className="max-h-80 overflow-y-auto p-1.5">
        <Command.Empty className="px-3 py-6 text-center text-base text-fg-3">
          No commands match “{query}”.
        </Command.Empty>
        {[...groups].map(([group, list]) => (
          <Command.Group
            key={group}
            heading={group}
            className="[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-3"
          >
            {list.map((i) => (
              <Command.Item
                key={i.id}
                value={`${i.label} ${i.keywords?.join(' ') ?? ''}`}
                onSelect={() => {
                  setOpen(false);
                  setQuery('');
                  i.run();
                }}
                className="flex h-9 cursor-default items-center gap-2.5 rounded-sm px-2.5 text-base text-fg-2 data-[selected=true]:bg-bg-3 data-[selected=true]:text-fg"
              >
                <span aria-hidden className="text-fg-3 [&_svg]:size-4">
                  {i.icon}
                </span>
                <span className="flex-1">{i.label}</span>
                {i.shortcut && <kbd className="num text-xs text-fg-3">{i.shortcut}</kbd>}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
