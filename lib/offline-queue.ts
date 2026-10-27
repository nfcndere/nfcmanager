import { del, get, set } from 'idb-keyval';

/**
 * Types de mutations autorisées hors ligne (conformément au cahier des charges) :
 * 1. `live_score` : saisie du score / statut en direct sur un match ;
 * 2. `article_draft` : création ou mise à jour d'un brouillon d'actualité ;
 * 3. `form_note` : notes internes / statut de suivi sur une inscription académie ou un formulaire.
 */
export type OfflineMutationKind = 'live_score' | 'article_draft' | 'form_note';

export type QueuedMutation = {
  id: string;
  kind: OfflineMutationKind;
  label: string;
  path: string;
  method: 'POST' | 'PATCH';
  entityCheckPath?: string;
  baseUpdatedAt: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  status: 'pending' | 'conflict' | 'failed';
  conflictServerData?: Record<string, unknown>;
  conflictServerUpdatedAt?: string | null;
  errorMessage?: string;
};

const QUEUE_KEY = 'nfcmanager_offline_mutation_queue_v1';
const DRAFT_PREFIX = 'nfcmanager_form_draft_v1:';

const memoryFallback = new Map<string, unknown>();

async function readStore<T>(key: string, fallback: T): Promise<T> {
  if (typeof indexedDB === 'undefined') {
    return (memoryFallback.get(key) as T | undefined) ?? fallback;
  }
  try {
    const val = await get<T>(key);
    return val ?? fallback;
  } catch {
    return (memoryFallback.get(key) as T | undefined) ?? fallback;
  }
}

async function writeStore<T>(key: string, value: T): Promise<void> {
  memoryFallback.set(key, value);
  if (typeof indexedDB === 'undefined') return;
  try {
    await set(key, value);
  } catch {
    // Stockage privé ou quota atteint : la copie mémoire reste disponible pour la session.
  }
}

export async function getOfflineQueue(): Promise<QueuedMutation[]> {
  return readStore<QueuedMutation[]>(QUEUE_KEY, []);
}

export async function enqueueOfflineMutation(
  item: Omit<QueuedMutation, 'id' | 'createdAt' | 'status'>,
): Promise<QueuedMutation> {
  const queue = await getOfflineQueue();
  // Fusionne deux mutations en attente sur la même ressource pour ne rejouer que l'état voulu.
  const existingIdx = queue.findIndex((q) => q.status === 'pending' && q.path === item.path && q.kind === item.kind);
  const created: QueuedMutation = {
    ...item,
    id: existingIdx >= 0 ? queue[existingIdx].id : `mut_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
  };
  if (existingIdx >= 0) {
    queue[existingIdx] = created;
  } else {
    queue.push(created);
  }
  await writeStore(QUEUE_KEY, queue);
  notifyQueueListeners();
  return created;
}

export async function enqueueMutation(input: {
  type?: OfflineMutationKind;
  kind?: OfflineMutationKind;
  label: string;
  endpoint?: string;
  path?: string;
  method: 'POST' | 'PATCH';
  payload: Record<string, unknown>;
  entityEndpoint?: string;
  entityCheckPath?: string;
  expectedUpdatedAt?: string | null;
  baseUpdatedAt?: string | null;
}): Promise<QueuedMutation> {
  return enqueueOfflineMutation({
    kind: input.kind ?? input.type ?? 'live_score',
    label: input.label,
    path: input.path ?? input.endpoint ?? '',
    method: input.method,
    payload: input.payload,
    entityCheckPath: input.entityCheckPath ?? input.entityEndpoint,
    baseUpdatedAt: input.baseUpdatedAt ?? input.expectedUpdatedAt ?? null,
  });
}

export async function removeOfflineMutation(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  await writeStore(
    QUEUE_KEY,
    queue.filter((item) => item.id !== id),
  );
  notifyQueueListeners();
}

export async function clearOfflineQueue(): Promise<void> {
  memoryFallback.delete(QUEUE_KEY);
  if (typeof indexedDB !== 'undefined') {
    await del(QUEUE_KEY).catch(() => undefined);
  }
  notifyQueueListeners();
}

/**
 * Compare l'horodatage de base connu par l'éditeur à celui actuellement sur le serveur.
 * Vrai si le serveur possède une version plus récente (`serverUpdatedAt > baseUpdatedAt`).
 */
export function hasTimestampConflict(
  baseUpdatedAt: string | null | undefined,
  serverUpdatedAt: string | null | undefined,
): boolean {
  if (!baseUpdatedAt || !serverUpdatedAt) return false;
  const baseMs = Date.parse(baseUpdatedAt);
  const serverMs = Date.parse(serverUpdatedAt);
  if (!Number.isFinite(baseMs) || !Number.isFinite(serverMs)) return false;
  return serverMs > baseMs + 500;
}

/**
 * Rejoue les mutations en attente dans l'ordre.
 * Si `entityCheckPath` est fourni et que le serveur a une version plus récente (`updatedAt`),
 * la mutation passe en `status: 'conflict'` avec la copie serveur pour que l'utilisateur choisisse.
 */
export async function flushOfflineQueue(options?: { forceId?: string }): Promise<{
  synced: number;
  conflicts: number;
  failed: number;
}> {
  const queue = await getOfflineQueue();
  if (!queue.length) return { synced: 0, conflicts: 0, failed: 0 };

  let synced = 0;
  let conflicts = 0;
  let failed = 0;
  const remaining: QueuedMutation[] = [];

  for (const item of queue) {
    const isForced = options?.forceId === item.id;
    if (item.status === 'conflict' && !isForced) {
      remaining.push(item);
      conflicts += 1;
      continue;
    }

    try {
      if (item.entityCheckPath && item.baseUpdatedAt && !isForced) {
        const checkRes = await fetch(`/api/site/${item.entityCheckPath.replace(/^\/+/, '')}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        });
        if (checkRes.ok) {
          const checkJson = (await checkRes.json()) as {
            data?: Record<string, unknown>;
            updatedAt?: string | null;
          };
          const serverUpdatedAt =
            (checkJson.data?.updatedAt as string | undefined) ?? checkJson.updatedAt ?? null;
          if (hasTimestampConflict(item.baseUpdatedAt, serverUpdatedAt)) {
            remaining.push({
              ...item,
              status: 'conflict',
              conflictServerData: checkJson.data ?? {},
              conflictServerUpdatedAt: serverUpdatedAt,
            });
            conflicts += 1;
            continue;
          }
        }
      }

      const res = await fetch(`/api/site/${item.path.replace(/^\/+/, '')}`, {
        method: item.method,
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(item.payload),
      });

      if (res.ok) {
        synced += 1;
      } else {
        const errBody = (await res.json().catch(() => ({}))) as { message?: string };
        remaining.push({
          ...item,
          status: 'failed',
          errorMessage: errBody.message || `Erreur ${res.status}`,
        });
        failed += 1;
      }
    } catch {
      remaining.push(item);
      failed += 1;
    }
  }

  await writeStore(QUEUE_KEY, remaining);
  notifyQueueListeners();
  return { synced, conflicts, failed };
}

// ===================================
// Brouillons locaux de formulaires (sauvegarde automatique en cours de saisie)
// ===================================
export async function saveFormDraft<T>(formKey: string, values: T): Promise<void> {
  await writeStore(`${DRAFT_PREFIX}${formKey}`, {
    values,
    savedAt: new Date().toISOString(),
  });
}

export async function loadFormDraft<T>(formKey: string): Promise<{ values: T; savedAt: string } | null> {
  return readStore<{ values: T; savedAt: string } | null>(`${DRAFT_PREFIX}${formKey}`, null);
}

export async function clearFormDraft(formKey: string): Promise<void> {
  const key = `${DRAFT_PREFIX}${formKey}`;
  memoryFallback.delete(key);
  if (typeof indexedDB !== 'undefined') {
    await del(key).catch(() => undefined);
  }
}

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeOfflineQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyQueueListeners() {
  for (const listener of listeners) listener();
}
