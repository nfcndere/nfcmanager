'use client';

import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useEffect,
} from 'react';
import { Loader2, Minus, Plus, X } from 'lucide-react';

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const variants = {
    primary: 'bg-[var(--nfc-green)] text-white hover:bg-[var(--nfc-green-dark)] shadow-sm active:scale-[0.99]',
    accent: 'bg-[var(--nfc-yellow)] text-[#0c130e] hover:bg-[var(--nfc-yellow-hover)] font-semibold shadow-sm active:scale-[0.99]',
    dark: 'bg-[var(--nfc-dark)] text-white hover:bg-[var(--nfc-surface-2)] shadow-sm active:scale-[0.99]',
    secondary: 'bg-[var(--nfc-surface-subtle)] text-[var(--nfc-text)] hover:bg-[var(--nfc-divider)] active:scale-[0.99]',
    outline: 'bg-transparent text-[var(--nfc-text)] border border-[var(--nfc-divider)] hover:bg-[var(--nfc-surface-subtle)]',
    ghost: 'bg-transparent text-[var(--nfc-muted)] hover:bg-[var(--nfc-surface-subtle)] hover:text-[var(--nfc-text)]',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm active:scale-[0.99]',
  };

  const sizes = {
    sm: 'h-8 px-3 text-xs rounded-md',
    md: 'h-9 px-4 text-xs font-medium rounded-lg',
    lg: 'h-11 px-5 text-sm font-medium rounded-lg',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...props}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--nfc-surface-subtle)] text-[var(--nfc-muted)] transition hover:text-[var(--nfc-text)] hover:bg-[var(--nfc-divider)] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function SectionTitle({
  children,
  tag,
  action,
}: {
  children: ReactNode;
  tag?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {tag && <span className="section-tag mb-1">{tag}</span>}
        <h2 className="text-lg font-semibold tracking-tight text-[var(--nfc-text)] sm:text-xl">{children}</h2>
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = '',
  accent = false,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
  hover?: boolean;
}) {
  return (
    <div
      className={`nfc-card ${hover ? 'nfc-card-hover' : ''} ${accent ? 'border-t-2 border-[var(--nfc-green)]' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-xs">
      <span className="flex items-center gap-1 font-medium text-[var(--nfc-text)]">
        {label}
        {required && (
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {hint && !error && <span className="block text-[11px] text-[var(--nfc-muted)]">{hint}</span>}
      {error && (
        <span role="alert" className="block text-[11px] font-medium text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}

const inputBase =
  'w-full rounded-lg bg-[var(--nfc-input-bg)] px-3 text-xs text-[var(--nfc-text)] outline-none transition placeholder:text-[var(--nfc-muted)]/70 focus:bg-[var(--nfc-card)] focus:ring-2 focus:ring-[var(--nfc-green)]/20 disabled:opacity-60 border border-[var(--nfc-divider)]';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-9 ${inputBase} ${className}`} />;
}

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`py-2 ${inputBase} ${className}`} />;
}

export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`h-9 ${inputBase} ${className}`}>
      {children}
    </select>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--nfc-surface-subtle)] px-3.5 py-2.5 text-left text-xs transition hover:bg-[var(--nfc-divider)] disabled:opacity-50"
    >
      <div>
        <p className="font-medium text-[var(--nfc-text)]">{label}</p>
        {description && <p className="mt-0.5 text-[11px] text-[var(--nfc-muted)]">{description}</p>}
      </div>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
          checked ? 'bg-[var(--nfc-green)]' : 'bg-gray-300 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-4.5' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  label,
  size = 'md',
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  label?: string;
  size?: 'md' | 'xl';
}) {
  const btnClass = size === 'xl' ? 'h-11 w-11 text-base' : 'h-8 w-8 text-xs';
  const valClass =
    size === 'xl'
      ? 'min-w-12 text-2xl font-semibold tabular-nums'
      : 'min-w-10 text-base font-semibold tabular-nums';

  return (
    <div
      className="inline-flex items-center rounded-lg bg-[var(--nfc-surface-subtle)] p-0.5 text-[var(--nfc-text)] border border-[var(--nfc-divider)]"
      aria-label={label}
    >
      <button
        type="button"
        aria-label={label ? `Diminuer ${label}` : 'Diminuer'}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`inline-flex items-center justify-center rounded-md bg-[var(--nfc-card)] text-[var(--nfc-muted)] shadow-xs transition hover:text-[var(--nfc-text)] disabled:opacity-30 ${btnClass}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className={`px-2 text-center ${valClass}`}>{value}</span>
      <button
        type="button"
        aria-label={label ? `Augmenter ${label}` : 'Augmenter'}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`inline-flex items-center justify-center rounded-md bg-[var(--nfc-card)] text-[var(--nfc-muted)] shadow-xs transition hover:text-[var(--nfc-text)] disabled:opacity-30 ${btnClass}`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export type BadgeTone =
  | 'green'
  | 'yellow'
  | 'red'
  | 'amber'
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'brand'
  | 'dark';

export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  const styles: Record<BadgeTone, string> = {
    green: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    success: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    brand: 'bg-[var(--nfc-green)] text-white',
    yellow: 'bg-lime-100 text-lime-900 dark:bg-lime-950/60 dark:text-lime-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
    danger: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
    amber: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    info: 'bg-sky-50 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300',
    dark: 'bg-[var(--nfc-dark)] text-gray-200',
    neutral: 'bg-[var(--nfc-surface-subtle)] text-[var(--nfc-muted)]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="tablist" aria-label={ariaLabel} className="inline-flex gap-1 rounded-lg bg-[var(--nfc-surface-subtle)] p-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`h-7 px-3 text-xs font-medium rounded-md transition ${
              active
                ? 'bg-[var(--nfc-card)] text-[var(--nfc-text)] shadow-xs'
                : 'text-[var(--nfc-muted)] hover:text-[var(--nfc-text)]'
            }`}
          >
            {opt.label}
            {typeof opt.count === 'number' && (
              <span className={`ml-1.5 text-[10px] ${active ? 'text-[var(--nfc-muted)]' : 'text-[var(--nfc-muted)]/70'}`}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SheetDialog({
  open,
  onClose,
  title,
  subtitle,
  description,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, open]);

  if (!open) return null;

  const sub = subtitle ?? description;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`animate-slide-up flex max-h-[90dvh] w-full flex-col rounded-t-2xl sm:rounded-2xl bg-[var(--nfc-card)] shadow-2xl sm:max-h-[85vh] ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--nfc-divider)]">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--nfc-text)]">{title}</h2>
            {sub && <p className="mt-0.5 text-xs text-[var(--nfc-muted)] truncate">{sub}</p>}
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--nfc-muted)] hover:bg-[var(--nfc-surface-subtle)] hover:text-[var(--nfc-text)] transition"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="safe-bottom flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t border-[var(--nfc-divider)] bg-[var(--nfc-surface-subtle)]/50 rounded-b-2xl">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  destructive = true,
  pending = false,
  loading = false,
  onConfirm,
  onCancel,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}) {
  const isBusy = pending || loading;
  const handleClose = () => {
    onCancel?.();
    onClose?.();
  };
  return (
    <SheetDialog
      open={open}
      onClose={handleClose}
      title={title}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isBusy}>
            Annuler
          </Button>
          <Button
            type="button"
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={isBusy}
          >
            {isBusy ? 'Traitement…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-xs leading-relaxed text-[var(--nfc-muted)]">{description}</p>
    </SheetDialog>
  );
}
