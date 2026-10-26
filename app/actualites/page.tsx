import { redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ArticleManagement } from '@/components/ArticleManagement';
import { getSession } from '@/lib/auth';
import { getSiteData } from '@/lib/site-api';

type ArticleRecord = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  category: string | null;
  published: boolean;
  publishedAt: string | null;
};

export default async function NewsPage() {
  const user = await getSession();
  if (!user) redirect('/connexion');
  let articles: ArticleRecord[] = [];
  let loadError: string | null = null;
  try {
    articles = (await getSiteData<ArticleRecord[]>('articles?limit=100')).data;
  } catch (error) {
    loadError = error instanceof Error ? error.message : 'Impossible de charger les actualités.';
  }

  return (
    <AppShell user={user}>
      <h1 className="mb-2 text-3xl font-bold">Actualités</h1>
      <p className="mb-6 text-gray-600">Le contenu est enregistré en texte brut, comme le rend actuellement le site public.</p>
      <p className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-950">La route GET du site ne retourne que les articles publiés : les brouillons ne peuvent pas être listés dans cette interface.</p>
      {loadError && <p className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-900" role="alert">{loadError}</p>}
      <ArticleManagement articles={articles} canWrite={user.role === 'ADMIN' || user.role === 'EDITOR'} />
    </AppShell>
  );
}
