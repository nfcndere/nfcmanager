import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const proxyPath = new URL('../app/api/site/[...path]/route.ts', import.meta.url);

test('the API proxy targets the configured site and forwards existing endpoint methods only', async () => {
  const source = await readFile(proxyPath, 'utf8');
  assert.match(source, /getSiteApiUrl\(\)/);
  assert.match(source, /Authorization/);
  assert.match(source, /routeMethods\.find/);
  assert.match(source, /Cette route n’est pas disponible dans le proxy/);
  assert.match(source, /Méthode \$\{request\.method\} non disponible/);
  assert.match(source, /matches.*\[\^\/\]\+/);
  assert.match(source, /players.*\[\^\/\]\+/);
  assert.match(source, /articles.*\[\^\/\]\+/);
  assert.doesNotMatch(source, /@prisma\/client|PrismaClient/);
});

test('the official apex domain is normalized to the canonical website host', async () => {
  const source = await readFile(new URL('../lib/auth.ts', import.meta.url), 'utf8');
  assert.match(source, /DEFAULT_SITE_API_URL = 'https:\/\/www\.ngaounderefc\.cm'/);
  assert.match(source, /process\.env\.NFCWEBSITE_API_URL\?\.trim\(\) \|\| DEFAULT_SITE_API_URL/);
  assert.match(source, /url\.hostname === 'ngaounderefc\.cm'/);
  assert.match(source, /url\.hostname = 'www\.ngaounderefc\.cm'/);
});

test('admin data pages call nfcwebsite endpoints through the shared client', async () => {
  const pages = [
    '../app/dashboard/page.tsx',
    '../app/matchs/page.tsx',
    '../app/effectif/page.tsx',
    '../app/actualites/page.tsx',
    '../app/classement/page.tsx',
  ];
  for (const path of pages) {
    const source = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /getSiteData</, `${path} should fetch the site API`);
    assert.doesNotMatch(source, /@prisma\/client|@\/lib\/prisma/, `${path} should not access Prisma directly`);
  }
});
