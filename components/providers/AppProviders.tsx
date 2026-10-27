'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import { del, get, set } from 'idb-keyval';
import {
  flushOfflineQueue,
  getOfflineQueue,
  subscribeOfflineQueue,
  type QueuedMutation,
} from '@/lib/offline-queue';

const IDB_CACHE_KEY = 'nfcmanager_rq_cache_v1';

function createIdbPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      if (typeof indexedDB === 'undefined') return;
      await set(IDB_CACHE_KEY, client).catch(() => undefined);
    },
    restoreClient: async () => {
      if (typeof indexedDB === 'undefined') return undefined;
      return (await get<PersistedClient>(IDB_CACHE_KEY).catch(() => undefined)) ?? undefined;
    },
    removeClient: async () => {
      if (typeof indexedDB === 'undefined') return;
      await del(IDB_CACHE_KEY).catch(() => undefined);
    },
  };
}

export type ToastInput = {
  tone?: 'success' | 'error' | 'info' | 'warning';
  message?: string;
  title?: string;
  description?: string;
  undoLabel?: string;
  actionLabel?: string;
  onUndo?: () => void | Promise<void>;
  onAction?: () => void | Promise<void>;
};

export type ToastItem = {
  id: string;
  tone: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
  undoLabel?: string;
  onUndo?: () => void | Promise<void>;
};

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error';

type AppRuntimeContextValue = {
  online: boolean;
  nowMs: number;
  syncStatus: SyncStatus;
  pendingMutations: QueuedMutation[];
  lastSyncedAt: Date | null;
  triggerSync: (forceId?: string) => Promise<void>;
  refreshOfflineQueue: () => Promise<void>;
  notify: (toast: ToastInput) => void;
  dismissToast: (id: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
};

const AppRuntimeContext = createContext<AppRuntimeContextValue | null>(null);

export function useAppRuntime() {
  const ctx = useContext(AppRuntimeContext);
  if (!ctx) throw new Error('useAppRuntime must be used within AppProviders.');
  return ctx;
}

export const useAppContext = useAppRuntime;

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 7 * 24 * 60 * 60 * 1_000,
            retry: 1,
            refetchOnWindowFocus: true,
            networkMode: 'offlineFirst',
          },
          mutations: {
            networkMode: 'online',
          },
        },
      }),
  );
  const [persister] = useState(() => createIdbPersister());
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [pendingMutations, setPendingMutations] = useState<QueuedMutation[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    const saved = window.localStorage.getItem('nfcmanager_theme');
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return saved === 'dark' || (!saved && prefersDark) ? 'dark' : 'light';
  });

  const notify = useCallback((toast: ToastInput) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const normalized: ToastItem = {
      id,
      tone: toast.tone ?? 'info',
      message: toast.message ?? toast.title ?? '',
      description: toast.description,
      undoLabel: toast.undoLabel ?? toast.actionLabel,
      onUndo: toast.onUndo ?? toast.onAction,
    };
    setToasts((prev) => [...prev, normalized]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 5_000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('nfcmanager_theme', next);
        document.documentElement.dataset.theme = next;
      }
      return next;
    });
  }, []);

  const reloadQueue = useCallback(async () => {
    const items = await getOfflineQueue();
    setPendingMutations(items);
  }, []);

  const triggerSync = useCallback(
    async (forceId?: string) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      setSyncing(true);
      setSyncError(false);
      try {
        const result = await flushOfflineQueue({ forceId });
        await reloadQueue();
        if (result.synced > 0) {
          setLastSyncedAt(new Date());
          void queryClient.invalidateQueries();
          notify({
            tone: 'success',
            message: `${result.synced} modification(s) hors ligne synchronisée(s).`,
          });
        }
        if (result.conflicts > 0 || result.failed > 0) {
          setSyncError(true);
        }
      } catch {
        setSyncError(true);
      } finally {
        setSyncing(false);
      }
    },
    [notify, queryClient, reloadQueue],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    void getOfflineQueue().then((items) => setPendingMutations(items));
    const unsub = subscribeOfflineQueue(() => {
      void reloadQueue();
    });
    const handleOnline = () => {
      setOnline(true);
      void triggerSync();
    };
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reloadQueue, triggerSync]);

  const syncStatus: SyncStatus = useMemo(() => {
    if (!online) return 'offline';
    if (syncing) return 'syncing';
    if (syncError || pendingMutations.some((m) => m.status !== 'pending')) return 'error';
    return 'online';
  }, [online, pendingMutations, syncError, syncing]);

  const value = useMemo<AppRuntimeContextValue>(
    () => ({
      online,
      nowMs,
      syncStatus,
      pendingMutations,
      lastSyncedAt,
      triggerSync,
      refreshOfflineQueue: reloadQueue,
      notify,
      dismissToast,
      theme,
      toggleTheme,
    }),
    [
      dismissToast,
      lastSyncedAt,
      notify,
      nowMs,
      online,
      pendingMutations,
      reloadQueue,
      syncStatus,
      theme,
      toggleTheme,
      triggerSync,
    ],
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: 7 * 24 * 60 * 60 * 1_000 }}
      onSuccess={() => setLastSyncedAt(new Date())}
    >
      <AppRuntimeContext.Provider value={value}>
        {children}
        {/* Région aria-live des toasts (avec action Annuler pendant 5 s) */}
        <div
          aria-live="polite"
          aria-atomic="true"
          className="pointer-events-none fixed inset-x-3 bottom-20 z-50 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-xl border-l-4 px-4 py-3 text-sm font-medium shadow-lg ${
                toast.tone === 'success'
                  ? 'border-[#8cea5a] bg-[#141f17] text-white'
                  : toast.tone === 'error'
                    ? 'border-red-500 bg-red-950 text-red-50'
                    : toast.tone === 'warning'
                      ? 'border-amber-400 bg-amber-950 text-amber-50'
                      : 'border-[#1f5f3d] bg-[#141f17] text-white'
              }`}
            >
              <div>
                <p>{toast.message}</p>
                {toast.description && (
                  <p className="mt-0.5 text-xs opacity-80">{toast.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {toast.onUndo && (
                  <button
                    type="button"
                    onClick={async () => {
                      dismissToast(toast.id);
                      await toast.onUndo?.();
                    }}
                    className="min-h-10 rounded-lg bg-[#8cea5a] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#0c130e]"
                  >
                    {toast.undoLabel || 'Annuler'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Fermer la notification"
                  className="min-h-10 min-w-10 px-2 text-xs opacity-75 hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </AppRuntimeContext.Provider>
    </PersistQueryClientProvider>
  );
}
