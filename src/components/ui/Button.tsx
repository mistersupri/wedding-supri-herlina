import React from 'react';
import { Spinner } from './StateView.js';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'deep';
type Size = 'md' | 'sm';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-field bg-card text-ink hover:bg-paper-2',
  ghost: 'text-ink hover:bg-paper-2',
  danger: 'bg-no text-white hover:brightness-110',
  // For use on the dark wedel bands.
  deep: 'bg-on-deep text-deep hover:bg-white',
};

// Both sizes keep a 44px tap target on touch; "sm" only tightens type and padding.
const SIZES: Record<Size, string> = {
  md: 'min-h-11 px-5 text-sm',
  sm: 'min-h-11 px-3.5 text-[13px]',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', extra = '') =>
  `inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-colors disabled:opacity-55 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, className = '', children, disabled, type = 'button', ...rest }, ref) => (
    <button ref={ref} type={type} disabled={disabled || loading} className={buttonClass(variant, size, className)} {...rest}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only buttons need a spoken name. */
  label: string;
  tone?: 'paper' | 'deep' | 'danger';
}

const ICON_TONES = {
  paper: 'text-ink-soft hover:bg-paper-2 hover:text-ink',
  deep: 'text-on-deep hover:bg-white/10',
  danger: 'text-no hover:bg-no-bg',
};

export const IconButton: React.FC<IconButtonProps> = ({ label, tone = 'paper', className = '', children, type = 'button', ...rest }) => (
  <button
    type={type}
    aria-label={label}
    title={label}
    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-sm transition-colors disabled:opacity-50 ${ICON_TONES[tone]} ${className}`}
    {...rest}
  >
    {children}
  </button>
);
