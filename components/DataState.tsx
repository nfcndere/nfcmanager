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
import { Button, Skeleton } from '@/components/ui';

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
            className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-4 space-y-3"
          >
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-1/2" />
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
          className="flex flex-wrap items-center justify-between gap-2.5 rounded-[12px] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-4 py-3 text-xs font-medium text-[var(--status-warning-text)]"
        >
          <span className="flex items-center gap-2">
            {effectiveKind === 'offline' ? (
              <WifiOff className="h-4 w-4 shrink-0" />
            ) : (
              <Clock className="h-4 w-4 shrink-0" />
            )}
            <span>
              {effectiveDesc || bannerText}
              {effectiveSyncedAt && (
                <span className="ml-1 opacity-75">
                  · Synchro : {formatDoualaDateTime(effectiveSyncedAt)}
                </span>
              )}
            </span>
          </span>
          {onRetry && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="bg-white/80 dark:bg-black/30 border-[var(--status-warning-border)] text-[var(--status-warning-text)]"
            >
              <RefreshCw className="h-3 w-3" />
              Actualiser
            </Button>
          )}
        </div>
        {children}
      </div>
    );
  }

  const config: Record<
    Exclude<DataStateKind, 'ready' | 'loading'>,
    { icon: ReactNode; defaultTitle: string; defaultDesc: string; iconBg: string }
  > = {
    empty: {
      icon: <Inbox className="h-5 w-5 text-[var(--accent)]" />,
      defaultTitle: emptyTitle || 'Aucun élément pour le moment',
      defaultDesc: emptyDescription || 'Aucune donnée enregistrée dans cette section.',
      iconBg: 'bg-[var(--accent-soft)]',
    },
    error: {
      icon: <ServerCrash className="h-5 w-5 text-[var(--status-danger-text)]" />,
      defaultTitle: 'Service du site indisponible',
      defaultDesc:
        'Impossible de charger les données depuis le site. Vérifiez votre connexion ou réessayez.',
      iconBg: 'bg-[var(--status-danger-bg)]',
    },
    offline: {
      icon: <WifiOff className="h-5 w-5 text-[var(--status-warning-text)]" />,
      defaultTitle: 'Vous êtes hors connexion',
      defaultDesc:
        'Aucune copie locale disponible pour cet écran. Reconnectez-vous pour synchroniser.',
      iconBg: 'bg-[var(--status-warning-bg)]',
    },
    stale: {
      icon: <Clock className="h-5 w-5 text-[var(--status-warning-text)]" />,
      defaultTitle: 'Données périmées',
      defaultDesc: 'Ces données dépassent le seuil de fraîcheur attendu.',
      iconBg: 'bg-[var(--status-warning-bg)]',
    },
    partial: {
      icon: <AlertTriangle className="h-5 w-5 text-[var(--status-warning-text)]" />,
      defaultTitle: 'Données incomplètes',
      defaultDesc: 'Certaines valeurs retournées par le site nécessitent une vérification.',
      iconBg: 'bg-[var(--status-warning-bg)]',
    },
    forbidden: {
      icon: <Lock className="h-5 w-5 text-[var(--status-danger-text)]" />,
      defaultTitle: 'Droits insuffisants (403)',
      defaultDesc: 'Cette section est réservée aux comptes Administrateur.',
      iconBg: 'bg-[var(--status-danger-bg)]',
    },
    conflict: {
      icon: <AlertTriangle className="h-5 w-5 text-[var(--status-warning-text)]" />,
      defaultTitle: 'Conflit de modification détecté',
      defaultDesc:
        'Cette donnée a été modifiée plus récemment sur le serveur. Choisissez la version à conserver.',
      iconBg: 'bg-[var(--status-warning-bg)]',
    },
    unavailable_feature: {
      icon: <Wrench className="h-5 w-5 text-[var(--accent)]" />,
      defaultTitle: 'Module bientôt disponible',
      defaultDesc:
        'Cette fonctionnalité est en cours d’intégration et sera activée lors d’une prochaine mise à jour.',
      iconBg: 'bg-[var(--accent-soft)]',
    },
  };

  const current = config[effectiveKind];

  return (
    <section
      className="rounded-[16px] border border-[var(--border)] bg-[var(--card)] p-8 text-center"
      role={effectiveKind === 'error' || effectiveKind === 'forbidden' ? 'alert' : 'status'}
    >
      <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] ${current.iconBg}`}>
        {current.icon}
      </div>
      <h2 className="mt-3 text-base font-semibold text-[var(--text)]">
        {title || current.defaultTitle}
      </h2>
      <p className="mx-auto mt-1.5 max-w-md text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
        {effectiveDesc || current.defaultDesc}
      </p>
      {effectiveSyncedAt && (
        <p className="mt-2 text-[11px] text-[var(--text-soft)]">
          Dernière synchronisation : {formatDoualaDateTime(effectiveSyncedAt)}
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        {onRetry && (
          <Button type="button" variant="primary" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3.5 w-3.5" />
            Réessayer
          </Button>
        )}
        {effectiveKind === 'conflict' && onResolveKeepLocal && (
          <Button type="button" variant="primary" size="sm" onClick={onResolveKeepLocal}>
            Conserver ma version
          </Button>
        )}
        {effectiveKind === 'conflict' && onResolveUseServer && (
          <Button type="button" variant="secondary" size="sm" onClick={onResolveUseServer}>
            Utiliser la version serveur
          </Button>
        )}
        {emptyAction}
        {onAction && actionLabel && (
          <Button type="button" variant="secondary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </div>
    </section>
  );
}
