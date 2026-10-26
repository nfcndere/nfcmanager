import 'server-only';
import { cookies } from 'next/headers';

export const SITE_TOKEN_COOKIE = 'nfcwebsite_access_token';
const DEFAULT_SITE_API_URL = 'https://www.ngaounderefc.cm';

export type SiteUser = {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'EDITOR';
};

export function getSiteApiUrl() {
  const value = process.env.NFCWEBSITE_API_URL?.trim() || DEFAULT_SITE_API_URL;
  const url = new URL(value);
  if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password || url.search || url.hash) {
    throw new Error('NFCWEBSITE_API_URL doit être une URL HTTP(S) sans identifiants ni paramètres.');
  }
  if (url.hostname === 'ngaounderefc.cm') {
    url.hostname = 'www.ngaounderefc.cm';
  }
  if (url.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('NFCWEBSITE_API_URL doit utiliser HTTPS en production.');
  }
  return url.toString().replace(/\/$/, '');
}

export async function getAccessToken() {
  return (await cookies()).get(SITE_TOKEN_COOKIE)?.value ?? null;
}

export async function getSession(): Promise<SiteUser | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const response = await fetch(`${getSiteApiUrl()}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`Vérification de session impossible (${response.status}).`);
  const result = (await response.json()) as { data?: SiteUser };
  const user = result.data;
  if (!user || (user.role !== 'ADMIN' && user.role !== 'EDITOR')) return null;
  return user;
}
