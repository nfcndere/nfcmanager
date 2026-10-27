export const DOUALA_TIMEZONE = 'Africa/Douala';

export function formatDoualaDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Non renseignée';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!Number.isFinite(date.getTime())) return 'Date invalide';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: DOUALA_TIMEZONE,
  }).format(date);
}

export function formatDoualaDate(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!dateInput) return 'Non renseignée';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!Number.isFinite(date.getTime())) return 'Date invalide';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: options?.dateStyle ?? 'medium',
    ...(options?.timeStyle ? { timeStyle: options.timeStyle } : {}),
    timeZone: DOUALA_TIMEZONE,
  }).format(date);
}

/** Convertit une date ISO UTC vers la valeur attendue par `<input type="datetime-local">` en fuseau Africa/Douala (+01:00). */
export function toDoualaDateTimeLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  // Africa/Douala est UTC+1 toute l'année (sans changement d'heure).
  const doualaMs = date.getTime() + 60 * 60 * 1_000;
  return new Date(doualaMs).toISOString().slice(0, 16);
}

export const toDoualaDateTimeLocalValue = toDoualaDateTimeLocalInput;

export function toDoualaDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  const doualaMs = date.getTime() + 60 * 60 * 1_000;
  return new Date(doualaMs).toISOString().slice(0, 10);
}

/** Convertit une valeur `<input type="datetime-local">` saisie en heure de Douala (+01:00) vers une chaîne ISO avec offset. */
export function fromDoualaDateTimeLocalInput(localValue: string): string {
  if (!localValue) return '';
  if (/[+-]\d{2}:\d{2}$|Z$/i.test(localValue)) return localValue;
  const normalized = localValue.length === 16 ? `${localValue}:00` : localValue;
  return `${normalized}+01:00`;
}

export function slugifyTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

export const slugify = slugifyTitle;

export function computeStandingStats(input: {
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}) {
  return {
    played: input.won + input.drawn + input.lost,
    points: input.won * 3 + input.drawn,
    goalDifference: input.goalsFor - input.goalsAgainst,
  };
}

export const calculateStandingStats = computeStandingStats;
