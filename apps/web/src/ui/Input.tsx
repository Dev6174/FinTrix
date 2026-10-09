import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Field, controlBase } from './Field';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  error?: string | undefined;
  leading?: ReactNode;
}

export function Input({ label, hint, error, leading, className, ...rest }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          {leading && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-fg-3"
            >
              {leading}
            </span>
          )}
          <input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(controlBase, !!leading && 'pl-8')}
            {...rest}
          />
        </div>
      )}
    </Field>
  );
}
