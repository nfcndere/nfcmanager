import { AppShell } from '@/components/AppShell';
import { GalleryManagement } from '@/components/GalleryManagement';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function MediaPage() {
  const { user, apiUnavailable } = await requirePageSession('/medias');
  const canWrite = user.role === 'ADMIN' || user.role === 'EDITOR';

  return (
    <AppShell
      user={user}
      title="Médiathèque & Galerie"
      subtitle="Téléversez et organisez les photos et vidéos officielles du club."
      apiUnavailable={apiUnavailable}
    >
      <GalleryManagement canWrite={canWrite} />
    </AppShell>
  );
}
