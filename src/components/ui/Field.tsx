import React, { useId } from 'react';

const CONTROL =
  'w-full rounded-xs border border-field bg-card px-3.5 text-[15px] text-ink placeholder:text-ink-soft/70 focus:border-primary focus:outline-2 focus:outline-offset-0 focus:outline-primary disabled:cursor-not-allowed disabled:bg-paper-2 disabled:text-ink-soft';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  /** Rendered next to the label, e.g. "opsional". */
  aside?: string;
  className?: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
}

/** Label + control + hint/error, wired with ids so screen readers announce all three. */
export const Field: React.FC<FieldProps> = ({ label, hint, error, aside, className = '', children }) => {
  const id = useId();
  const hintId = hint || error ? `${id}-hint` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-sm font-semibold text-ink">
        <span>{label}</span>
        {aside && <span className="text-xs font-normal text-ink-soft">{aside}</span>}
      </label>
      {children({ id, 'aria-describedby': hintId, 'aria-invalid': error ? true : undefined })}
      {(error || hint) && (
        <p id={hintId} className={`text-xs ${error ? 'font-medium text-no' : 'text-ink-soft'}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
};

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className = '', ...rest }, ref) => (
  <input ref={ref} className={`${CONTROL} h-11 ${className}`} {...rest} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', rows = 3, ...rest }, ref) => (
    <textarea ref={ref} rows={rows} className={`${CONTROL} resize-y py-2.5 leading-relaxed ${className}`} {...rest} />
  ),
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...rest }, ref) => (
    <select ref={ref} className={`${CONTROL} h-11 pr-8 ${className}`} {...rest}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

/** Checkbox with its label as one 44px-tall tap target. */
export const Checkbox: React.FC<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: React.ReactNode; description?: string }
> = ({ label, description, className = '', ...rest }) => (
  <label className={`flex min-h-11 cursor-pointer items-start gap-3 py-2 ${className}`}>
    <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]" {...rest} />
    <span className="text-sm">
      <span className="font-semibold text-ink">{label}</span>
      {description && <span className="mt-0.5 block text-ink-soft">{description}</span>}
    </span>
  </label>
);

/** Segmented single choice (radio group) styled as buttons. */
export function Segmented<T extends string>({
  name,
  value,
  options,
  onChange,
  disabled,
  className = '',
}: {
  name: string;
  value: T;
  options: { value: T; label: string; activeClass?: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={`grid gap-1.5 ${className}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`min-h-11 rounded-xs border px-2 text-sm font-semibold transition-colors ${
              active ? opt.activeClass || 'border-primary bg-primary text-on-primary' : 'border-field bg-card text-ink hover:bg-paper-2'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
