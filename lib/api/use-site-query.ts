'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { ApiClientError, siteRequest, type ResourceResult } from '@/lib/api/client';
import { useAppContext } from '@/components/providers/AppProviders';
import type { DataStateKind } from '@/components/DataState';
import type { z } from 'zod';

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

export function useSiteQuery<T>(
  queryKey: readonly unknown[],
  path: string,
  options?: {
    schema?: z.ZodType<T>;
    enabled?: boolean;
    isEmpty?: (data: T) => boolean;
    staleMs?: number;
  } & Omit<UseQueryOptions<ResourceResult<T>, Error>, 'queryKey' | 'queryFn'>,
) {
  const { online, nowMs } = useAppContext();

  const query = useQuery<ResourceResult<T>, Error>({
    queryKey,
    queryFn: () => siteRequest<T>(path, { schema: options?.schema }),
    enabled: options?.enabled ?? true,
    ...options,
  });

  const data: T | undefined = query.data?.data;
  const updatedAt: string | null =
    query.data?.updatedAt ||
    (query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toISOString() : null);

  const err = query.error instanceof ApiClientError ? query.error : null;
  let state: DataStateKind = 'ready';
  let errorMessage: string | undefined;

  if (query.isPending && !data) {
    state = online ? 'loading' : 'offline';
  } else if (err?.kind === 'forbidden' || err?.kind === 'FORBIDDEN') {
    state = 'forbidden';
    errorMessage = err.message;
  } else if (err?.kind === 'unavailable_feature' || err?.kind === 'FEATURE_UNAVAILABLE') {
    state = 'unavailable_feature';
    errorMessage = err.message;
  } else if (query.isError && !data) {
    state =
      !online || err?.kind === 'offline' || err?.kind === 'OFFLINE' ? 'offline' : 'error';
    errorMessage = query.error?.message;
  } else if (data !== undefined) {
    const emptyCheck = options?.isEmpty
      ? options.isEmpty(data)
      : Array.isArray(data)
        ? data.length === 0
        : !data;
    if (emptyCheck) {
      state = 'empty';
    } else if (!online || query.isError) {
      state = 'stale';
      errorMessage = query.error?.message;
    } else if (
      query.dataUpdatedAt &&
      nowMs - query.dataUpdatedAt > (options?.staleMs ?? STALE_THRESHOLD_MS)
    ) {
      state = 'stale';
    } else {
      state = 'ready';
    }
  }

  return {
    ...query,
    data,
    updatedAt,
    state,
    errorMessage,
  };
}
