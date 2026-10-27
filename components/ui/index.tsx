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

// ===================================
// Composants inspirés de Medusa UI (@medusajs/ui) :
// lignes épurées, bordures 1px subtiles, ombres douces, typographie posée.
// ===================================

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const variants = {
    primary:
      'border border-[#184c30] bg-[var(--nfc-green)] text-white shadow-2xs hover:bg-[var(--nfc-green-dark)]',
    secondary:
      'border border-[var(--nfc-border)] bg-[var(--nfc-card)] text-[var(--nfc-text)] shadow-2xs hover:bg-[var(--nfc-surface-subtle)]',
    outline:
      'border border-[var(--nfc-border)] bg-[var(--nfc-card)] text-[var(--nfc-text)] shadow-2xs hover:bg-[var(--nfc-surface-subtle)]',
    accent:
      'border border-[#72c943] bg-[var(--nfc-yellow)] text-[#0b0d0e] shadow-2xs hover:bg-[#78d04a]',
    ghost:
      'border border-transparent bg-transparent text-[var(--nfc-muted)] hover:bg-[var(--nfc-surface-subtle)] hover:text-[var(--nfc-text)]',
    danger: 'border border-red-700 bg-red-600 text-white shadow-2xs hover:bg-red-700',
  };
  const sizes = {
    sm: 'min-h-8 px-2.5 py-1 text-xs',
    md: 'min-h-9 px-3.5 py-1.5 text-[13px]',
    lg: 'min-h-11 px-4 py-2.5 text-sm',
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
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
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--nfc-border)] bg-[var(--nfc-card)] text-[var(--nfc-muted)] shadow-2xs transition hover:bg-[var(--nfc-surface-subtle)] hover:text-[var(--nfc-text)] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
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
    <label className="block space-y-1.5 text-[13px]">
      <span className="flex items-center gap-1 font-medium text-[var(--nfc-text)]">
        {label}
        {required && (
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {hint && !error && <span className="block text-xs text-[var(--nfc-muted)]">{hint}</span>}
      {error && (
        <span role="alert" className="block text-xs font-medium text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-9 w-full rounded-lg border border-[var(--nfc-border)] bg-[var(--nfc-input-bg)] px-3 py-1.5 text-[13px] text-[var(--nfc-text)] shadow-2xs transition placeholder:text-[var(--nfc-muted)]/70 focus:border-[var(--nfc-green)] focus:outline-none focus:ring-2 focus:ring-[var(--nfc-green)]/15 ${className}`}
    />
  );
}

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border border-[var(--nfc-border)] bg-[var(--nfc-input-bg)] px-3 py-2 text-[13px] text-[var(--nfc-text)] shadow-2xs transition placeholder:text-[var(--nfc-muted)]/70 focus:border-[var(--nfc-green)] focus:outline-none focus:ring-2 focus:ring-[var(--nfc-green)]/15 ${className}`}
    />
  );
}

export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`min-h-9 w-full rounded-lg border border-[var(--nfc-border)] bg-[var(--nfc-input-bg)] px-3 py-1.5 text-[13px] text-[var(--nfc-text)] shadow-2xs transition focus:border-[var(--nfc-green)] focus:outline-none focus:ring-2 focus:ring-[var(--nfc-green)]/15 ${className}`}
    >
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
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--nfc-border)] bg-[var(--nfc-surface-subtle)]/50 px-3.5 py-2.5 text-left text-[13px] transition hover:bg-[var(--nfc-surface-subtle)] disabled:opacity-50"
    >
      <div>
        <p className="font-medium text-[var(--nfc-text)]">{label}</p>
        {description && <p className="mt-0.5 text-xs text-[var(--nfc-muted)]">{description}</p>}
      </div>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
          checked ? 'bg-[var(--nfc-green)]' : 'bg-zinc-300 dark:bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform ${
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
  const btnClass = size === 'xl' ? 'min-h-14 min-w-14 text-xl' : 'min-h-11 min-w-11 text-sm';
  const valClass =
    size === 'xl'
      ? 'min-w-16 text-3xl font-semibold tabular-nums'
      : 'min-w-12 text-xl font-semibold tabular-nums';
  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] text-[var(--nfc-text)] shadow-2xs"
      aria-label={label}
    >
      <button
        type="button"
        aria-label={label ? `Diminuer ${label}` : 'Diminuer'}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`inline-flex items-center justify-center border-r border-[var(--nfc-border)] hover:bg-[var(--nfc-surface-subtle)] disabled:opacity-40 ${btnClass}`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={`px-3 text-center ${valClass}`}>{value}</span>
      <button
        type="button"
        aria-label={label ? `Augmenter ${label}` : 'Augmenter'}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`inline-flex items-center justify-center border-l border-[var(--nfc-border)] hover:bg-[var(--nfc-surface-subtle)] disabled:opacity-40 ${btnClass}`}
      >
        <Plus className="h-4 w-4" />
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
  | 'brand';

/** StatusBadge style Medusa UI : pastille colorée + bordure fine + texte posé */
export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  const styles: Record<BadgeTone, { pill: string; dot: string }> = {
    green: {
      pill: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
      dot: 'bg-emerald-500',
    },
    success: {
      pill: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
      dot: 'bg-emerald-500',
    },
    yellow: {
      pill: 'border-lime-500/30 bg-lime-500/15 text-lime-900 dark:text-lime-200',
      dot: 'bg-lime-500',
    },
    brand: {
      pill: 'border-[#1f5f3d]/25 bg-[#1f5f3d]/10 text-[#1f5f3d] dark:border-[#8cea5a]/30 dark:bg-[#8cea5a]/10 dark:text-[#8cea5a]',
      dot: 'bg-[#1f5f3d] dark:bg-[#8cea5a]',
    },
    red: {
      pill: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
      dot: 'bg-red-500',
    },
    danger: {
      pill: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
      dot: 'bg-red-500',
    },
    amber: {
      pill: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
      dot: 'bg-amber-500',
    },
    warning: {
      pill: 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300',
      dot: 'bg-amber-500',
    },
    info: {
      pill: 'border-sky-500/25 bg-sky-500/10 text-sky-800 dark:text-sky-300',
      dot: 'bg-sky-500',
    },
    neutral: {
      pill: 'border-[var(--nfc-border)] bg-[var(--nfc-surface-subtle)] text-[var(--nfc-muted)]',
      dot: 'bg-zinc-400',
    },
  };
  const current = styles[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${current.pill}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${current.dot}`} />
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
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex flex-wrap gap-0.5 rounded-lg border border-[var(--nfc-border)] bg-[var(--nfc-surface-subtle)] p-1"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`min-h-7 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              active
                ? 'bg-[var(--nfc-card)] text-[var(--nfc-text)] shadow-2xs'
                : 'text-[var(--nfc-muted)] hover:text-[var(--nfc-text)]'
            }`}
          >
            {opt.label}
            {typeof opt.count === 'number' && (
              <span className="ml-1.5 text-[11px] text-[var(--nfc-muted)]">{opt.count}</span>
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[1px] sm:items-center sm:p-4"
    >
      <div
        className={`flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] shadow-2xl sm:max-h-[86vh] sm:rounded-2xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        }`}
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--nfc-border)] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--nfc-text)]">{title}</h2>
            {sub && <p className="mt-0.5 text-xs text-[var(--nfc-muted)]">{sub}</p>}
          </div>
          <IconButton label="Fermer" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--nfc-border)] bg-[var(--nfc-surface-subtle)]/50 px-5 py-3">
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
          <Button type="button" variant="outline" onClick={handleClose} disabled={isBusy}>
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
      <p className="text-[13px] leading-relaxed text-[var(--nfc-muted)]">{description}</p>
    </SheetDialog>
  );
}
