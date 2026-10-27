import { AppShell } from '@/components/AppShell';
import { ArticleManagement } from '@/components/ArticleManagement';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function NewsPage() {
  const { user, apiUnavailable } = await requirePageSession('/actualites');
  const canWrite = user.role === 'ADMIN' || user.role === 'EDITOR';

  return (
    <AppShell
      user={user}
      title="Actualités & Communiqués"
      subtitle="Rédigez des articles, gérez vos brouillons et prévisualisez le rendu public."
      apiUnavailable={apiUnavailable}
    >
      <ArticleManagement canWrite={canWrite} />
    </AppShell>
  );
}
