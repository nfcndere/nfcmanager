import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { isTrustedOrigin, proxy as middlewareProxy } from '@/proxy';
import { classifyHttpError, siteRequest, ApiClientError } from '@/lib/api/client';
import { matchProxyRoute } from '@/lib/proxy-routes';
import { POST as proxyPost, GET as proxyGet } from '@/app/api/site/[...path]/route';
import { hasTimestampConflict } from '@/lib/offline-queue';
import { calculateStandingStats, slugify } from '@/lib/format';
import { checkRateLimit, clearRateLimit } from '@/lib/rate-limit';
import { getSiteApiUrl, SITE_TOKEN_COOKIE } from '@/lib/auth';

describe('1. Normalisation URL nfcwebsite & Sécurité CSRF (proxy.ts)', () => {
  it('normalise ngaounderefc.cm vers https://www.ngaounderefc.cm', () => {
    const prev = process.env.NFCWEBSITE_API_URL;
    process.env.NFCWEBSITE_API_URL = 'https://ngaounderefc.cm/';
    expect(getSiteApiUrl()).toBe('https://www.ngaounderefc.cm');
    if (prev === undefined) {
      delete process.env.NFCWEBSITE_API_URL;
    } else {
      process.env.NFCWEBSITE_API_URL = prev;
    }
  });

  it('autorise une requête de même origine directe', () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    });
    expect(isTrustedOrigin(req)).toBe(true);
  });

  it('autorise une requête derrière un reverse proxy (X-Forwarded-Host / X-Forwarded-Proto)', () => {
    const req = new NextRequest('http://127.0.0.1:3000/api/auth/login', {
      method: 'POST',
      headers: {
        origin: 'https://manager.ngaounderefc.cm',
        'x-forwarded-host': 'manager.ngaounderefc.cm',
        'x-forwarded-proto': 'https',
      },
    });
    expect(isTrustedOrigin(req)).toBe(true);
  });

  it('autorise une requête PWA sans en-tête Origin mais avec Sec-Fetch-Site: same-origin', () => {
    const req = new NextRequest('http://192.168.1.25:3000/api/site/matches', {
      method: 'PATCH',
      headers: {
        'sec-fetch-site': 'same-origin',
      },
    });
    expect(isTrustedOrigin(req)).toBe(true);
  });

  it('refuse une origine étrangère (CSRF)', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example.com',
      },
    });
    expect(isTrustedOrigin(req)).toBe(false);
    const res = await middlewareProxy(req);
    expect(res.status).toBe(403);
  });

  it('redirige une page protégée vers /connexion?next=... si aucun cookie de session n’est présent', async () => {
    const req = new NextRequest('http://localhost:3000/matchs');
    const res = await middlewareProxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('/connexion?next=%2Fmatchs');
  });

  it('laisse passer une page protégée si le cookie de jeton est présent', async () => {
    const req = new NextRequest('http://localhost:3000/matchs', {
      headers: {
        cookie: `${SITE_TOKEN_COOKIE}=valid-jwt-token`,
      },
    });
    const res = await middlewareProxy(req);
    expect(res.status).toBe(200);
  });
});

describe('2. Client API typé (lib/api/client.ts)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('classifie correctement les codes HTTP (401, 403, 404, 429, 500)', () => {
    expect(classifyHttpError(401)).toBe('unauthorized');
    expect(classifyHttpError(403)).toBe('forbidden');
    expect(classifyHttpError(404)).toBe('unavailable_feature');
    expect(classifyHttpError(405)).toBe('unavailable_feature');
    expect(classifyHttpError(429)).toBe('rate_limited');
    expect(classifyHttpError(502)).toBe('server');
  });

  it('déclenche un refresh automatique sur 401 puis rejoue la requête initiale', async () => {
    const fetchMock = vi.mocked(global.fetch);
    // 1er appel : 401 sur /api/site/matches
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'error', message: 'Jeton expiré' }), { status: 401 }),
    );
    // 2e appel : 200 sur /api/auth/refresh
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'ok', expiresIn: 900 }), { status: 200 }),
    );
    // 3e appel : 200 sur /api/site/matches rejoué
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({ status: 'ok', data: [{ id: 'm1' }], updatedAt: '2026-10-26T10:00:00Z' }),
        { status: 200 },
      ),
    );

    const result = await siteRequest<{ id: string }[]>('matches');
    expect(result.data).toEqual([{ id: 'm1' }]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('remonte Retry-After sur un 429', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'error', message: 'Trop de requêtes' }), {
        status: 429,
        headers: { 'Retry-After': '45' },
      }),
    );

    await expect(siteRequest('matches')).rejects.toMatchObject({
      kind: 'rate_limited',
      status: 429,
      retryAfter: 45,
    });
  });

  it('remonte unavailable_feature sur 404/405', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'error', message: 'Not found' }), { status: 404 }),
    );

    try {
      await siteRequest('unknown-feature');
      expect.fail('Aurait dû lever une erreur');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiClientError);
      expect((error as ApiClientError).kind).toBe('unavailable_feature');
    }
  });
});

describe('3. Proxy API (app/api/site/[...path]/route.ts & lib/proxy-routes.ts)', () => {
  it('valide l’allowlist stricte des routes et méthodes', () => {
    expect(matchProxyRoute('/matches', 'GET')).toEqual({ status: 'ok' });
    expect(matchProxyRoute('/matches/123', 'PATCH')).toEqual({ status: 'ok' });
    expect(matchProxyRoute('/standings', 'PUT')).toEqual({ status: 'ok' });
    expect(matchProxyRoute('/uploads/sign', 'POST')).toEqual({ status: 'ok' });
    expect(matchProxyRoute('/route-inconnue', 'GET')).toEqual({ status: 'not_found' });
    expect(matchProxyRoute('/health', 'DELETE')).toEqual({ status: 'method_not_allowed' });
  });

  it('renvoie 404 pour une route hors allowlist et 405 pour une méthode non autorisée', async () => {
    const req404 = new NextRequest('http://localhost:3000/api/site/non-autorise', {
      method: 'GET',
    });
    const res404 = await proxyGet(req404, { params: Promise.resolve({ path: ['non-autorise'] }) });
    expect(res404.status).toBe(404);

    const req405 = new NextRequest('http://localhost:3000/api/site/health', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res405 = await proxyPost(req405, { params: Promise.resolve({ path: ['health'] }) });
    expect(res405.status).toBe(405);
  });

  it('refuse un corps JSON supérieur à la limite de 1 Mio (413)', async () => {
    const largeString = 'a'.repeat(1_050_000);
    const req = new NextRequest('http://localhost:3000/api/site/articles', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: largeString }),
    });
    const res = await proxyPost(req, { params: Promise.resolve({ path: ['articles'] }) });
    expect(res.status).toBe(413);
  });
});

describe('4. File hors ligne & détection de conflit updatedAt', () => {
  it('détecte un conflit si updatedAt serveur est plus récent que expectedUpdatedAt', () => {
    expect(
      hasTimestampConflict('2026-10-26T12:00:00.000Z', '2026-10-26T12:05:00.000Z'),
    ).toBe(true);
    expect(
      hasTimestampConflict('2026-10-26T12:00:00.000Z', '2026-10-26T12:00:00.000Z'),
    ).toBe(false);
    expect(hasTimestampConflict(undefined, '2026-10-26T12:05:00.000Z')).toBe(false);
  });
});

describe('5. Calculs métier (Classement NFC, Slug, Rate Limit)', () => {
  it('calcule automatiquement played = V+N+D, points = 3V+N et goalDifference = BP-BC', () => {
    const stats = calculateStandingStats({
      won: 8,
      drawn: 4,
      lost: 2,
      goalsFor: 21,
      goalsAgainst: 9,
    });
    expect(stats.played).toBe(14);
    expect(stats.points).toBe(28);
    expect(stats.goalDifference).toBe(12);
    expect(stats.played).toBe(8 + 4 + 2);
  });

  it('génère un slug URL propre sans accents', () => {
    expect(slugify('Victoire précieuse du Ngaoundéré FC à domicile (2-0) !')).toBe(
      'victoire-precieuse-du-ngaoundere-fc-a-domicile-2-0',
    );
  });

  it('applique la limitation de tentatives avec Retry-After', () => {
    const key = 'test-login-bucket';
    clearRateLimit(key);
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60_000).allowed).toBe(true);
    }
    const blocked = checkRateLimit(key, 5, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    clearRateLimit(key);
  });
});
