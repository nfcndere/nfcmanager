import { ReactNode } from 'react';
import {
  AlertTriangle,
  Clock,
  Inbox,
  Lock,
  RefreshCw,
  ServerCrash,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { formatDoualaDateTime } from '@/lib/format';

export type DataStateKind =
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'stale'
  | 'partial'
  | 'forbidden'
  | 'conflict'
  | 'unavailable_feature'
  | 'ready';

export function DataState({
  kind,
  state,
  title,
  description,
  errorMessage,
  emptyTitle,
  emptyDescription,
  emptyAction,
  partialSources,
  actionLabel,
  onAction,
  onRetry,
  onResolveKeepLocal,
  onResolveUseServer,
  lastSyncedAt,
  updatedAt,
  skeletonCount = 3,
  children,
}: {
  kind?: DataStateKind;
  state?: DataStateKind;
  title?: string;
  description?: string;
  errorMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  partialSources?: string[];
  actionLabel?: string;
  onAction?: () => void;
  onRetry?: () => void;
  onResolveKeepLocal?: () => void;
  onResolveUseServer?: () => void;
  lastSyncedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  skeletonCount?: number;
  children?: ReactNode;
}) {
  const effectiveKind: DataStateKind = state ?? kind ?? 'ready';
  const effectiveSyncedAt = updatedAt ?? lastSyncedAt;
  const effectiveDesc = errorMessage ?? description;

  if (effectiveKind === 'ready') return <>{children}</>;

  if (effectiveKind === 'loading') {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Chargement des données">
        {Array.from({ length: skeletonCount }).map((_, idx) => (
          <div
            key={idx}
            className="h-24 animate-pulse rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-4"
          >
            <div className="h-4 w-2/5 rounded bg-gray-200 dark:bg-emerald-950" />
            <div className="mt-3 h-3 w-4/5 rounded bg-gray-100 dark:bg-emerald-950/60" />
          </div>
        ))}
      </div>
    );
  }

  // Bandeaux non bloquants (offline / stale / partial) qui laissent les données en cache affichées en dessous
  if (
    (effectiveKind === 'offline' || effectiveKind === 'stale' || effectiveKind === 'partial') &&
    children
  ) {
    const bannerText =
      effectiveKind === 'offline'
        ? 'Mode hors ligne — affichage de la dernière copie synchronisée.'
        : effectiveKind === 'partial'
          ? partialSources?.length
            ? `Données partielles (${partialSources.join(', ')} temporairement indisponibles).`
            : 'Données partielles ou incohérentes signalées par le site.'
          : 'Ces données n’ont pas été mises à jour récemment.';
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
        >
          <span className="flex items-center gap-2">
            {effectiveKind === 'offline' ? (
              <WifiOff className="h-4 w-4 shrink-0" />
            ) : (
              <Clock className="h-4 w-4 shrink-0" />
            )}
            {effectiveDesc || bannerText}
            {effectiveSyncedAt && (
              <span className="opacity-80">
                · Dernière synchro : {formatDoualaDateTime(effectiveSyncedAt)}
              </span>
            )}
          </span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Actualiser
            </button>
          )}
        </div>
        {children}
      </div>
    );
  }

  const config: Record<
    Exclude<DataStateKind, 'ready' | 'loading'>,
    { icon: ReactNode; defaultTitle: string; defaultDesc: string }
  > = {
    empty: {
      icon: <Inbox className="h-7 w-7 text-[var(--nfc-green)]" />,
      defaultTitle: emptyTitle || 'Aucun élément pour le moment',
      defaultDesc: emptyDescription || 'Aucune donnée enregistrée dans cette section.',
    },
    error: {
      icon: <ServerCrash className="h-7 w-7 text-red-600" />,
      defaultTitle: 'Service du site indisponible',
      defaultDesc:
        'Impossible de charger les données depuis nfcwebsite. Vérifiez la connexion ou réessayez.',
    },
    offline: {
      icon: <WifiOff className="h-7 w-7 text-amber-600" />,
      defaultTitle: 'Vous êtes hors connexion',
      defaultDesc:
        'Aucune copie locale disponible pour cet écran. Reconnectez-vous pour synchroniser.',
    },
    stale: {
      icon: <Clock className="h-7 w-7 text-amber-600" />,
      defaultTitle: 'Données périmées',
      defaultDesc: 'Ces données dépassent le seuil de fraîcheur attendu.',
    },
    partial: {
      icon: <AlertTriangle className="h-7 w-7 text-amber-600" />,
      defaultTitle: 'Données incomplètes',
      defaultDesc: 'Certaines valeurs retournées par le site nécessitent une vérification.',
    },
    forbidden: {
      icon: <Lock className="h-7 w-7 text-red-600" />,
      defaultTitle: 'Droits insuffisants (403)',
      defaultDesc: 'Cette section est réservée aux comptes Administrateur (ADMIN).',
    },
    conflict: {
      icon: <AlertTriangle className="h-7 w-7 text-amber-600" />,
      defaultTitle: 'Conflit de modification détecté',
      defaultDesc:
        'Cette donnée a été modifiée plus récemment sur le serveur. Choisissez la version à conserver.',
    },
    unavailable_feature: {
      icon: <Wrench className="h-7 w-7 text-[var(--nfc-green)]" />,
      defaultTitle: 'Fonction pas encore disponible côté site',
      defaultDesc:
        'L’endpoint correspondant n’est pas encore actif sur le déploiement actuel de nfcwebsite.',
    },
  };

  const current = config[effectiveKind];

  return (
    <section
      className="rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-6 text-center"
      role={effectiveKind === 'error' || effectiveKind === 'forbidden' ? 'alert' : 'status'}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--nfc-bg)]">
        {current.icon}
      </div>
      <h2 className="mt-3 font-heading text-lg font-bold uppercase tracking-wide">
        {title || current.defaultTitle}
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--nfc-muted)]">
        {effectiveDesc || current.defaultDesc}
      </p>
      {effectiveSyncedAt && (
        <p className="mt-2 text-xs text-[var(--nfc-muted)]">
          Dernière synchronisation : {formatDoualaDateTime(effectiveSyncedAt)}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--nfc-green)] px-4 py-2.5 font-heading text-xs font-bold uppercase tracking-wider text-white hover:bg-[var(--nfc-green-dark)]"
          >
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </button>
        )}
        {effectiveKind === 'conflict' && onResolveKeepLocal && (
          <button
            type="button"
            onClick={onResolveKeepLocal}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--nfc-green)] px-4 py-2.5 font-heading text-xs font-bold uppercase tracking-wider text-white"
          >
            Conserver ma version
          </button>
        )}
        {effectiveKind === 'conflict' && onResolveUseServer && (
          <button
            type="button"
            onClick={onResolveUseServer}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--nfc-border)] px-4 py-2.5 font-heading text-xs font-bold uppercase tracking-wider"
          >
            Utiliser la version serveur
          </button>
        )}
        {emptyAction}
        {onAction && actionLabel && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--nfc-yellow)] px-4 py-2.5 font-heading text-xs font-bold uppercase tracking-wider text-[#0c130e]"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </section>
  );
}
