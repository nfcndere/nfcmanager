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
// Composants alignés sur la charte du site nfcwebsite :
// angles droits, Oswald en majuscules pour les actions et titres,
// vert du club, surfaces blanches sans bordure, ombres douces.
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
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}) {
  const variants = {
    primary: 'bg-[var(--nfc-green)] text-white hover:bg-[var(--nfc-green-dark)] hover:shadow-[var(--nfc-shadow-hover)]',
    accent: 'bg-[var(--nfc-yellow)] text-[var(--nfc-dark)] hover:bg-[var(--nfc-yellow-hover)] hover:shadow-[var(--nfc-shadow-hover)]',
    dark: 'bg-[var(--nfc-dark)] text-white hover:bg-[var(--nfc-surface-2)]',
    secondary: 'bg-[var(--nfc-surface-subtle)] text-[var(--nfc-text)] hover:bg-[var(--nfc-green)]/10 hover:text-[var(--nfc-green)]',
    outline: 'bg-[var(--nfc-surface-subtle)] text-[var(--nfc-text)] hover:bg-[var(--nfc-green)]/10 hover:text-[var(--nfc-green)]',
    ghost: 'bg-transparent text-[var(--nfc-muted)] hover:bg-[var(--nfc-surface-subtle)] hover:text-[var(--nfc-text)]',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const sizes = {
    sm: 'min-h-8 px-3 py-1 text-[11px]',
    md: 'min-h-10 px-5 py-2 text-xs',
    lg: 'min-h-12 px-6 py-3 text-sm',
  };
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-display font-bold uppercase tracking-[0.06em] transition-all duration-200 hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${variants[variant]} ${sizes[size]} ${className}`}
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
      className={`inline-flex h-9 w-9 items-center justify-center bg-transparent text-[var(--nfc-muted)] transition hover:bg-[var(--nfc-surface-subtle)] hover:text-[var(--nfc-green)] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/** Titre de section du site : libellé Oswald + barre verte */
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
        <h2 className="text-lg font-bold text-[var(--nfc-text)] sm:text-xl">{children}</h2>
        <div className="mt-2 h-1 w-12 bg-[var(--nfc-green)]" />
      </div>
      {action}
    </div>
  );
}

/** Carte du site : fond blanc, sans bordure, ombre douce */
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
      className={`nfc-card ${hover ? 'nfc-card-hover' : ''} ${accent ? 'border-t-4 border-[var(--nfc-green)]' : ''} ${className}`}
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
    <label className="block space-y-1.5 text-[13px]">
      <span className="flex items-center gap-1 font-display text-[11px] font-bold uppercase tracking-wider text-[var(--nfc-muted)]">
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
        <span role="alert" className="block text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}

const inputBase =
  'w-full bg-[var(--nfc-input-bg)] px-3.5 text-sm text-[var(--nfc-text)] outline-none transition placeholder:text-[var(--nfc-muted)]/70 focus:bg-[var(--nfc-card)] focus:shadow-[inset_0_-2px_0_var(--nfc-green),var(--nfc-shadow)] disabled:opacity-60';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`min-h-10 py-2 ${inputBase} ${className}`} />;
}

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`py-2.5 ${inputBase} ${className}`} />;
}

export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`min-h-10 py-2 ${inputBase} ${className}`}>
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
      className="flex w-full items-center justify-between gap-3 bg-[var(--nfc-surface-subtle)] px-4 py-3 text-left text-[13px] transition hover:bg-[var(--nfc-green)]/5 disabled:opacity-50"
    >
      <div>
        <p className="font-semibold text-[var(--nfc-text)]">{label}</p>
        {description && <p className="mt-0.5 text-xs text-[var(--nfc-muted)]">{description}</p>}
      </div>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
          checked ? 'bg-[var(--nfc-green)]' : 'bg-gray-300 dark:bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
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
      ? 'min-w-16 font-display text-4xl font-bold tabular-nums'
      : 'min-w-12 font-display text-2xl font-bold tabular-nums';
  return (
    <div
      className="inline-flex items-center bg-[var(--nfc-surface-subtle)] text-[var(--nfc-text)]"
      aria-label={label}
    >
      <button
        type="button"
        aria-label={label ? `Diminuer ${label}` : 'Diminuer'}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`inline-flex items-center justify-center bg-[var(--nfc-dark)] text-white transition hover:bg-[var(--nfc-green)] disabled:opacity-30 ${btnClass}`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={`px-3 text-center ${valClass}`}>{value}</span>
      <button
        type="button"
        aria-label={label ? `Augmenter ${label}` : 'Augmenter'}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`inline-flex items-center justify-center bg-[var(--nfc-green)] text-white transition hover:bg-[var(--nfc-green-dark)] disabled:opacity-30 ${btnClass}`}
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
  | 'brand'
  | 'dark';

/** Badge du site : pavé plein, Oswald, majuscules, sans bordure */
export function StatusBadge({
  tone = 'neutral',
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  const styles: Record<BadgeTone, string> = {
    green: 'bg-[var(--nfc-green)] text-white',
    success: 'bg-[var(--nfc-green)] text-white',
    brand: 'bg-[var(--nfc-green)] text-white',
    yellow: 'bg-[var(--nfc-yellow)] text-[var(--nfc-dark)]',
    red: 'bg-red-600 text-white',
    danger: 'bg-red-600 text-white',
    amber: 'bg-amber-400 text-[var(--nfc-dark)]',
    warning: 'bg-amber-400 text-[var(--nfc-dark)]',
    info: 'bg-sky-600 text-white',
    dark: 'bg-[var(--nfc-dark)] text-gray-200',
    neutral: 'bg-[var(--nfc-surface-subtle)] text-[var(--nfc-muted)]',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.06em] ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

/** Onglets façon navigation du site : libellés Oswald, soulignement vert sur l'onglet actif */
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
    <div role="tablist" aria-label={ariaLabel} className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`min-h-9 px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wide transition ${
              active
                ? 'bg-[var(--nfc-green)] text-white'
                : 'bg-[var(--nfc-card)] text-[var(--nfc-muted)] shadow-[var(--nfc-shadow)] hover:text-[var(--nfc-green)]'
            }`}
          >
            {opt.label}
            {typeof opt.count === 'number' && (
              <span className={`ml-1.5 text-[11px] ${active ? 'text-white/70' : 'text-[var(--nfc-muted)]'}`}>
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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`animate-slide-up flex max-h-[92dvh] w-full flex-col bg-[var(--nfc-card)] shadow-2xl sm:max-h-[86vh] ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        }`}
      >
        <header className="flex items-center justify-between gap-3 bg-[var(--nfc-dark)] px-5 py-4 text-white">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-white">{title}</h2>
            {sub && <p className="mt-0.5 truncate text-xs text-gray-400">{sub}</p>}
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="h-1 bg-[var(--nfc-green)]" />
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && (
          <footer className="safe-bottom flex flex-wrap items-center justify-end gap-2 bg-[var(--nfc-surface-subtle)] px-5 py-3">
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
      <p className="text-sm leading-relaxed text-[var(--nfc-muted)]">{description}</p>
    </SheetDialog>
  );
}
