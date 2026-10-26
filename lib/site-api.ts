import 'server-only';
import { getAccessToken, getSiteApiUrl } from '@/lib/auth';

export async function getSiteData<T>(path: string): Promise<{ data: T; updatedAt?: string | null }> {
  const token = await getAccessToken();
  const response = await fetch(`${getSiteApiUrl()}/api/${path.replace(/^\/+/, '')}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`L’API nfcwebsite (${path}) a répondu ${response.status}.`);
  }
  return (await response.json()) as { data: T; updatedAt?: string | null };
}
