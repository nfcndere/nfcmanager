'use client';

import {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  useEffect,
} from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  Inbox,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';

/* ==========================================================================
   1. BOUTONS & RACCOURCIS (Button, IconButton, Kbd)
   ========================================================================== */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary:
      'bg-[var(--accent)] text-[var(--accent-contrast)] hover:bg-[var(--accent-hover)] shadow-xs disabled:opacity-50',
    secondary:
      'bg-[var(--bg-subtle)] text-[var(--text)] hover:bg-[var(--bg-hover)] border border-[var(--border)] disabled:opacity-50',
    outline:
      'bg-transparent text-[var(--text)] border border-[var(--border)] hover:bg-[var(--bg-subtle)] disabled:opacity-50',
    ghost:
      'bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)] disabled:opacity-50',
    danger:
      'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] hover:opacity-90 border border-[var(--border)] disabled:opacity-50',
    accent:
      'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30 hover:bg-[var(--accent)]/15 disabled:opacity-50',
  };

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs rounded-[8px]',
    md: 'h-10 px-4 text-xs font-medium rounded-[10px]',
    lg: 'h-11 px-5 text-sm font-medium rounded-[12px]',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap transition-subtle select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30 active:scale-[0.99] disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
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
      className={`inline-flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-subtle disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function Kbd({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={`inline-flex items-center justify-center rounded-[6px] border border-[var(--border)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)] shadow-xs ${className}`}
    >
      {children}
    </kbd>
  );
}

/* ==========================================================================
   2. FORMULAIRES & CONTRÔLES (Input, Textarea, Select, Checkbox, Switch, Stepper, FormField)
   ========================================================================== */

export function FormField({
  label,
  required,
  hint,
  error,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 text-xs ${className}`}>
      <span className="flex items-center gap-1 font-medium text-[var(--text)]">
        {label}
        {required && (
          <span className="text-red-500 font-bold" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
      {hint && !error && <span className="block text-[11px] text-[var(--text-muted)]">{hint}</span>}
      {error && (
        <span role="alert" className="block text-[11px] font-medium text-[var(--status-danger-text)]">
          {error}
        </span>
      )}
    </label>
  );
}
export const Field = FormField;

const controlBase =
  'w-full rounded-[8px] bg-[var(--bg)] px-3 text-xs text-[var(--text)] outline-none border border-[var(--border)] transition-subtle placeholder:text-[var(--text-soft)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15 disabled:bg-[var(--bg-subtle)] disabled:opacity-60';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`h-10 ${controlBase} ${className}`} />;
}

export function Textarea({ className = '', ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`py-2.5 ${controlBase} ${className}`} />;
}

export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`h-10 appearance-none pr-8 ${controlBase} ${className}`}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`inline-flex items-start gap-2.5 cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-subtle ${
          checked
            ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
            : 'border-[var(--border)] bg-[var(--bg)]'
        }`}
      >
        {checked && <Check className="h-3 w-3 stroke-[3]" />}
      </span>
      {label && (
        <span className="text-xs">
          <span className="font-medium text-[var(--text)] block">{label}</span>
          {description && <span className="text-[11px] text-[var(--text-muted)] block mt-0.5">{description}</span>}
        </span>
      )}
    </label>
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
      className="flex w-full items-center justify-between gap-3 rounded-[12px] bg-[var(--bg-subtle)] p-3.5 text-left text-xs transition-subtle hover:bg-[var(--bg-hover)] disabled:opacity-50"
    >
      <div>
        <p className="font-medium text-[var(--text)]">{label}</p>
        {description && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{description}</p>}
      </div>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
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
  const isXl = size === 'xl';
  return (
    <div
      className="inline-flex items-center rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-1 text-[var(--text)]"
      aria-label={label}
    >
      <button
        type="button"
        aria-label={label ? `Diminuer ${label}` : 'Diminuer'}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`inline-flex items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] transition-subtle disabled:opacity-30 ${
          isXl ? 'h-11 w-11 text-base' : 'h-8 w-8 text-xs'
        }`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span className={`text-center font-semibold tabular-nums ${isXl ? 'min-w-16 text-3xl px-2' : 'min-w-10 text-base px-1'}`}>
        {value}
      </span>
      <button
        type="button"
        aria-label={label ? `Augmenter ${label}` : 'Augmenter'}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`inline-flex items-center justify-center rounded-[6px] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] transition-subtle disabled:opacity-30 ${
          isXl ? 'h-11 w-11 text-base' : 'h-8 w-8 text-xs'
        }`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ==========================================================================
   3. AVATARS & BADGES (LetterAvatar, StatusBadge, Pill)
   ========================================================================== */

export type AvatarPalette = 'violet' | 'rose' | 'green' | 'yellow' | 'blue' | 'orange';

const PALETTES: AvatarPalette[] = ['violet', 'rose', 'green', 'yellow', 'blue', 'orange'];

export function getDeterministicPalette(text: string): AvatarPalette {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PALETTES.length;
  return PALETTES[index];
}

export function LetterAvatar({
  name,
  letter,
  size = 'md',
  shape = 'square',
  palette,
  className = '',
}: {
  name?: string;
  letter?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'square' | 'circle';
  palette?: AvatarPalette;
  className?: string;
}) {
  const chosenLetter = (letter || name?.[0] || '?').toUpperCase();
  const chosenPalette = palette || (name ? getDeterministicPalette(name) : 'green');

  const paletteStyles: Record<AvatarPalette, string> = {
    violet: 'bg-[var(--avatar-violet-bg)] text-[var(--avatar-violet-text)]',
    rose: 'bg-[var(--avatar-rose-bg)] text-[var(--avatar-rose-text)]',
    green: 'bg-[var(--avatar-green-bg)] text-[var(--avatar-green-text)]',
    yellow: 'bg-[var(--avatar-yellow-bg)] text-[var(--avatar-yellow-text)]',
    blue: 'bg-[var(--avatar-blue-bg)] text-[var(--avatar-blue-text)]',
    orange: 'bg-[var(--avatar-orange-bg)] text-[var(--avatar-orange-text)]',
  };

  const sizeStyles = {
    xs: 'h-5 w-5 text-[10px] rounded-[5px]',
    sm: 'h-6 w-6 text-[10px] rounded-[6px]',
    md: 'h-8 w-8 text-xs rounded-[8px]',
    lg: 'h-10 w-10 text-sm rounded-[10px]',
  };

  const shapeClass = shape === 'circle' ? '!rounded-full' : '';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center font-semibold select-none ${paletteStyles[chosenPalette]} ${sizeStyles[size]} ${shapeClass} ${className}`}
    >
      {chosenLetter}
    </span>
  );
}

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'green' | 'red' | 'amber' | 'brand';

export function StatusBadge({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  const toneMap: Record<BadgeTone, string> = {
    success: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]',
    green: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]',
    brand: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]',
    warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
    amber: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
    danger: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]',
    red: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]',
    info: 'bg-[var(--status-info-bg)] text-[var(--status-info-text)]',
    neutral: 'bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 py-0.5 text-[11px] font-medium leading-none ${toneMap[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
export const Badge = StatusBadge;

export function Pill({
  icon,
  count,
  label,
  className = '',
}: {
  icon?: ReactNode;
  count?: number | string;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-1 text-xs text-[var(--text-muted)] shadow-xs ${className}`}
    >
      {icon && <span className="text-[var(--text)]">{icon}</span>}
      {count !== undefined && <strong className="font-semibold text-[var(--text)] tabular-nums">{count}</strong>}
      <span>{label}</span>
    </span>
  );
}

/* ==========================================================================
   4. CARTES & INDICATEURS STATS (Card, StatCard)
   ========================================================================== */

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
      className={`app-card p-5 sm:p-6 ${accent ? 'border-t-2 border-[var(--accent)]' : ''} ${
        hover ? 'hover:border-[var(--accent)]/50 transition-subtle' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  icon,
  value,
  label,
  change,
  changeTone = 'neutral',
  palette = 'green',
  className = '',
}: {
  icon: ReactNode;
  value: number | string;
  label: string;
  change?: string;
  changeTone?: 'positive' | 'negative' | 'neutral';
  palette?: AvatarPalette;
  className?: string;
}) {
  const paletteBg: Record<AvatarPalette, string> = {
    green: 'bg-[var(--avatar-green-bg)] text-[var(--avatar-green-text)]',
    blue: 'bg-[var(--avatar-blue-bg)] text-[var(--avatar-blue-text)]',
    violet: 'bg-[var(--avatar-violet-bg)] text-[var(--avatar-violet-text)]',
    yellow: 'bg-[var(--avatar-yellow-bg)] text-[var(--avatar-yellow-text)]',
    rose: 'bg-[var(--avatar-rose-bg)] text-[var(--avatar-rose-text)]',
    orange: 'bg-[var(--avatar-orange-bg)] text-[var(--avatar-orange-text)]',
  };

  const changeStyles = {
    positive: 'text-[var(--status-success-text)] bg-[var(--status-success-bg)]',
    negative: 'text-[var(--status-danger-text)] bg-[var(--status-danger-bg)]',
    neutral: 'text-[var(--text-muted)] bg-[var(--bg-subtle)]',
  };

  return (
    <div className={`app-card p-5 sm:p-6 flex flex-col justify-between ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-[12px] ${paletteBg[palette]}`}>
          {icon}
        </span>
        {change && (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums ${changeStyles[changeTone]}`}>
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-semibold tracking-tight text-[var(--text)] tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
      </div>
    </div>
  );
}

/* ==========================================================================
   5. NAVIGATION & ONGLETS (SegmentedControl, Tabs)
   ========================================================================== */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (next: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex gap-1 rounded-full bg-[var(--bg-subtle)] p-1 border border-[var(--border-subtle)] ${className}`}
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
            className={`h-7 px-3 text-xs font-medium rounded-full transition-subtle select-none ${
              active
                ? 'bg-[var(--card)] text-[var(--text)] shadow-xs font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {opt.label}
            {typeof opt.count === 'number' && (
              <span className={`ml-1.5 text-[10px] tabular-nums ${active ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div className="flex border-b border-[var(--border)] gap-6">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`flex items-center gap-2 pb-3 text-xs font-medium transition-subtle border-b-2 -mb-px ${
              active
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   6. LISTES & TABLEAUX (ListRow, DataTable)
   ========================================================================== */

export function ListRow({
  avatar,
  title,
  subtitle,
  badge,
  action,
  onClick,
  className = '',
}: {
  avatar?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const isClickable = Boolean(onClick);
  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
      className={`flex items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3 rounded-[12px] transition-subtle ${
        isClickable ? 'cursor-pointer hover:bg-[var(--bg-subtle)] active:scale-[0.99]' : ''
      } ${className}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        {avatar}
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-[var(--text)]">{title}</p>
          {subtitle && <p className="truncate text-[11px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge}
        {action}
      </div>
    </div>
  );
}

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  selectable = false,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
  sortKey,
  sortDirection,
  onSort,
  emptyMessage = 'Aucun élément trouvé.',
  className = '',
}: {
  columns: Column<T>[];
  data: T[];
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onToggleSelect?: (id: string | number) => void;
  onToggleSelectAll?: () => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  emptyMessage?: string;
  className?: string;
}) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;

  if (data.length === 0) {
    return (
      <div className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-8 text-center text-xs text-[var(--text-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)] ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs tabular-nums">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)] text-[11px] font-medium text-[var(--text-muted)]">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={allSelected}
                    onChange={() => onToggleSelectAll?.()}
                    aria-label="Tout sélectionner"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium ${col.className || ''}`}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-[var(--text)] transition-subtle"
                    >
                      <span>{col.header}</span>
                      {sortKey === col.key ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {data.map((row) => {
              const isSelected = selectedIds.includes(row.id);
              return (
                <tr
                  key={row.id}
                  className={`transition-subtle hover:bg-[var(--bg-subtle)]/60 ${isSelected ? 'bg-[var(--accent-soft)]/40' : ''}`}
                >
                  {selectable && (
                    <td className="w-10 px-4 py-3">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => onToggleSelect?.(row.id)}
                        aria-label={`Sélectionner l'élément ${row.id}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-[var(--text)] ${col.className || ''}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ==========================================================================
   7. DIALOGUES & FEUILLES (SheetDialog / Sheet, ConfirmDialog)
   ========================================================================== */

export function SheetDialog({
  open,
  onClose,
  title,
  subtitle,
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
        className={`flex max-h-[92dvh] w-full flex-col rounded-t-[20px] sm:rounded-[16px] bg-[var(--card)] border border-[var(--border)] shadow-[var(--shadow-pop)] sm:max-h-[85vh] ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
      >
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)]">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)] truncate">{subtitle}</p>}
          </div>
          <IconButton label="Fermer" onClick={onClose}>
            <X className="h-4 w-4" />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="safe-bottom flex flex-wrap items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border)] bg-[var(--bg-subtle)] sm:rounded-b-[16px]">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
export const Sheet = SheetDialog;

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmer',
  destructive = true,
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
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button
            type="button"
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-xs leading-relaxed text-[var(--text-muted)]">{description}</p>
    </SheetDialog>
  );
}

/* ==========================================================================
   8. ÉTATS (Skeleton, EmptyState, ErrorState, SyncIndicator)
   ========================================================================== */

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-[8px] bg-[var(--bg-subtle)] ${className}`}
    />
  );
}

export function EmptyState({
  icon = <Inbox className="h-6 w-6" />,
  title = 'Aucune donnée',
  description = 'Il n’y a aucun élément à afficher pour le moment.',
  action,
  className = '',
}: {
  icon?: ReactNode;
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-8 text-center flex flex-col items-center justify-center ${className}`}>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--bg-subtle)] text-[var(--text-muted)]">
        {icon}
      </span>
      <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'Une erreur est survenue',
  description = 'Impossible de charger les données demandées.',
  onRetry,
  className = '',
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={`rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-6 sm:p-8 text-center flex flex-col items-center justify-center ${className}`}>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-[12px] bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
        <AlertCircle className="h-6 w-6" />
      </span>
      <h3 className="mt-3 text-sm font-semibold text-[var(--text)]">{title}</h3>
      <p className="mt-1 max-w-sm text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-4">
          <RefreshCw className="h-3.5 w-3.5" />
          Réessayer
        </Button>
      )}
    </div>
  );
}

export function SyncIndicator({
  status,
  pendingCount = 0,
  onClick,
}: {
  status: 'online' | 'offline' | 'syncing' | 'error';
  pendingCount?: number;
  onClick?: () => void;
}) {
  const dotColor = {
    online: 'bg-[var(--accent)]',
    syncing: 'bg-sky-500 animate-ping',
    error: 'bg-red-500',
    offline: 'bg-amber-500',
  }[status];

  const label = {
    online: pendingCount > 0 ? `${pendingCount} en attente` : 'En ligne',
    offline: `Hors ligne${pendingCount > 0 ? ` (${pendingCount})` : ''}`,
    syncing: 'Synchronisation…',
    error: `Conflit (${pendingCount})`,
  }[status];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-live="polite"
      className="inline-flex h-8 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 text-[11px] font-medium text-[var(--text)] shadow-xs transition-subtle hover:bg-[var(--bg-subtle)]"
    >
      <span className={`h-2 w-2 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </button>
  );
}
