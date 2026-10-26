import { ReactNode } from 'react';

export type DataStateKind = 'loading' | 'empty' | 'error' | 'offline' | 'stale' | 'forbidden' | 'conflict' | 'ready';

export function DataState({
  kind,
  children,
  onRetry,
  lastSyncedAt,
}: {
  kind: DataStateKind;
  children?: ReactNode;
  onRetry?: () => void;
  lastSyncedAt?: Date | null;
}) {
  if (kind === 'ready') return children;
  if (kind === 'loading') return <p className="animate-pulse rounded-lg bg-gray-200 p-5 text-transparent" aria-label="Chargement">Chargement des données</p>;
  const message = {
    empty: 'Aucune donnée enregistrée pour le moment.',
    error: 'Une erreur est survenue lors du chargement.',
    offline: 'Vous êtes hors connexion. Les données affichées peuvent être périmées.',
    stale: 'Ces données peuvent être périmées.',
    forbidden: 'Vous ne disposez pas des droits nécessaires (403).',
    conflict: 'Cette donnée a été modifiée ailleurs. Rechargez-la avant de continuer.',
    ready: '',
    loading: '',
  }[kind];
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-5" role={kind === 'error' ? 'alert' : 'status'}>
      <p>{message}</p>
      {lastSyncedAt && <p className="mt-2 text-sm text-gray-500">Dernière synchronisation : {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Douala' }).format(lastSyncedAt)}</p>}
      {onRetry && (kind === 'error' || kind === 'offline' || kind === 'stale' || kind === 'conflict') && (
        <button className="mt-3 rounded border border-nfc-green px-3 py-2 font-semibold text-nfc-green" onClick={onRetry}>Réessayer</button>
      )}
    </section>
  );
}
