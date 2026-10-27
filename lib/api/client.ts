import { z } from 'zod';
import { resourceEnvelopeSchema, type ResourceStatus } from '@/lib/api/schemas';

export type ApiErrorKind =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'FEATURE_UNAVAILABLE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'VALIDATION'
  | 'SITE_UNAVAILABLE'
  | 'OFFLINE'
  | 'unauthorized'
  | 'forbidden'
  | 'unavailable_feature'
  | 'rate_limited'
  | 'server'
  | 'offline';

export class ApiClientError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly retryAfterSeconds?: number;
  readonly retryAfter?: number;
  readonly issues?: { path: string; message: string }[];

  constructor(
    message: string,
    kind: ApiErrorKind,
    status: number,
    options?: { retryAfterSeconds?: number; issues?: { path: string; message: string }[] },
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.kind = kind;
    this.status = status;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.retryAfter = options?.retryAfterSeconds;
    this.issues = options?.issues;
  }
}

export type ResourceResult<T> = {
  status: ResourceStatus;
  data: T;
  updatedAt: string | null;
};

const REQUEST_TIMEOUT_MS = 10_000;

export function classifyHttpError(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404 || status === 405) return 'unavailable_feature';
  if (status === 429) return 'rate_limited';
  if (status === 0) return 'offline';
  return 'server';
}

export function createHttpError(
  status: number,
  bodyMessage?: string,
  options?: {
    treat404AsFeatureUnavailable?: boolean;
    retryAfterHeader?: string | null;
    issues?: { path: string; message: string }[];
  },
): ApiClientError {
  if (status === 401) {
    return new ApiClientError(
      bodyMessage || 'Session expirée, veuillez vous reconnecter.',
      'unauthorized',
      401,
    );
  }
  if (status === 403) {
    return new ApiClientError(
      bodyMessage || 'Vous ne disposez pas des droits nécessaires pour cette action.',
      'forbidden',
      403,
    );
  }
  if (status === 404 || status === 405) {
    return new ApiClientError(
      bodyMessage || 'Fonction pas encore disponible côté site.',
      'unavailable_feature',
      status,
    );
  }
  if (status === 409) {
    return new ApiClientError(
      bodyMessage || 'Conflit : cette ressource existe déjà ou a été modifiée.',
      'CONFLICT',
      409,
    );
  }
  if (status === 429) {
    const retryAfter = options?.retryAfterHeader ? Number(options.retryAfterHeader) : undefined;
    return new ApiClientError(
      bodyMessage || 'Trop de requêtes. Veuillez patienter avant de réessayer.',
      'rate_limited',
      429,
      { retryAfterSeconds: Number.isFinite(retryAfter) ? retryAfter : undefined },
    );
  }
  if (status === 400 || status === 413 || status === 415 || status === 422) {
    return new ApiClientError(bodyMessage || 'Données invalides.', 'VALIDATION', status, {
      issues: options?.issues,
    });
  }
  return new ApiClientError(
    bodyMessage || 'Le service du site est momentanément indisponible.',
    'server',
    status,
  );
}

export type RequestOptions<T = unknown> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  schema?: z.ZodType<T>;
  featureEndpoint?: boolean;
  retries?: number;
  signal?: AbortSignal;
};

let refreshPromise: Promise<boolean> | null = null;

async function tryClientTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function siteRequest<T = unknown>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<ResourceResult<T>> {
  const method = options.method ?? 'GET';
  const maxRetries = options.retries ?? (method === 'GET' ? 1 : 0);
  const cleanPath = path.replace(/^\/+/, '');
  const url = `/api/site/${cleanPath}`;

  let attempt = 0;
  let retriedAfterRefresh = false;

  while (true) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      throw new ApiClientError('Vous êtes hors ligne.', 'offline', 0);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const signal = options.signal ?? controller.signal;

    try {
      const response = await fetch(url, {
        method,
        headers:
          options.body !== undefined
            ? { 'Content-Type': 'application/json', Accept: 'application/json' }
            : { Accept: 'application/json' },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        cache: 'no-store',
        signal,
      });
      clearTimeout(timer);

      if (response.status === 401 && !retriedAfterRefresh) {
        retriedAfterRefresh = true;
        const refreshed = await tryClientTokenRefresh();
        if (refreshed) continue;
      }

      const rawJson = (await response.json().catch(() => null)) as {
        status?: ResourceStatus;
        data?: unknown;
        updatedAt?: string | null;
        message?: string;
        issues?: { path: string; message: string }[];
      } | null;

      if (!response.ok) {
        if (
          (response.status === 502 || response.status === 503 || response.status === 504) &&
          attempt < maxRetries
        ) {
          attempt += 1;
          await new Promise((r) => setTimeout(r, 400 * attempt));
          continue;
        }
        throw createHttpError(response.status, rawJson?.message, {
          treat404AsFeatureUnavailable: options.featureEndpoint,
          retryAfterHeader: response.headers.get('retry-after'),
          issues: rawJson?.issues,
        });
      }

      if (options.schema) {
        const envelope = resourceEnvelopeSchema(options.schema).safeParse(rawJson);
        if (envelope.success) {
          return {
            status: envelope.data.status,
            data: envelope.data.data as T,
            updatedAt: envelope.data.updatedAt ?? null,
          };
        }
        const direct = options.schema.safeParse(rawJson?.data ?? rawJson);
        if (direct.success) {
          return {
            status: rawJson?.status ?? 'ok',
            data: direct.data,
            updatedAt: rawJson?.updatedAt ?? null,
          };
        }
      }

      return {
        status: rawJson?.status ?? 'ok',
        data: (rawJson && 'data' in rawJson ? rawJson.data : rawJson) as T,
        updatedAt: rawJson?.updatedAt ?? null,
      };
    } catch (error) {
      clearTimeout(timer);
      if (error instanceof ApiClientError) throw error;
      if (attempt < maxRetries) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, 400 * attempt));
        continue;
      }
      const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
      throw new ApiClientError(
        isOffline ? 'Vous êtes hors ligne.' : 'Réseau indisponible ou délai dépassé.',
        'offline',
        0,
      );
    }
  }
}
