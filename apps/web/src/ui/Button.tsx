import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/cn';
import { Tooltip } from './Tooltip';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover border-transparent',
  secondary: 'bg-bg-2 text-fg border-border-strong hover:bg-bg-3',
  ghost: 'bg-transparent text-fg-2 border-transparent hover:bg-bg-3 hover:text-fg',
  danger: 'bg-transparent text-danger border-danger hover:bg-danger hover:text-bg-0',
};
const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-sm gap-1.5',
  md: 'h-control px-3.5 text-base gap-2',
};

export const buttonBase =
  'inline-flex select-none items-center justify-center whitespace-nowrap rounded-sm border font-medium ' +
  'transition-[background-color,color,border-color,transform] duration-(--dur-fast) ' +
  'active:translate-y-px aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:active:translate-y-0';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'disabled'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  /** Shown in a tooltip when disabled. Keeps the button focusable so the reason is discoverable. */
  disabledReason?: string;
  icon?: ReactNode;
  shortcut?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading,
    disabled,
    disabledReason,
    icon,
    shortcut,
    className,
    children,
    onClick,
    ...rest
  },
  ref,
) {
  const inert = disabled || loading;
  const btn = (
    <button
      ref={ref}
      type="button"
      aria-disabled={inert || undefined}
      aria-busy={loading || undefined}
      className={cn(buttonBase, variants[variant], sizes[size], className)}
      onClick={(e) => {
        if (inert) return e.preventDefault();
        onClick?.(e);
      }}
      {...rest}
    >
      {loading ? <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} /> : icon}
      {children}
      {shortcut && (
        <kbd className="num ml-1 rounded-sm border border-current/30 px-1 text-xs opacity-70">
          {shortcut}
        </kbd>
      )}
    </button>
  );
  return disabled && disabledReason ? <Tooltip content={disabledReason}>{btn}</Tooltip> : btn;
});

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'icon' | 'shortcut'> {
  /** Required: becomes aria-label and tooltip. */
  label: string;
  icon: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, variant = 'ghost', size = 'md', className, disabledReason, disabled, ...rest },
  ref,
) {
  return (
    <Tooltip content={disabled && disabledReason ? disabledReason : label}>
      <Button
        ref={ref}
        aria-label={label}
        variant={variant}
        size={size}
        disabled={disabled}
        className={cn(size === 'sm' ? 'w-7 px-0' : 'w-(--control-h) px-0', className)}
        {...rest}
      >
        {icon}
      </Button>
    </Tooltip>
  );
});
