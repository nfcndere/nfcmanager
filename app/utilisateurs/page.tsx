import { AppShell } from '@/components/AppShell';
import { UsersManagement } from '@/components/UsersManagement';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const { user, apiUnavailable } = await requirePageSession('/utilisateurs');

  return (
    <AppShell
      user={user}
      title="Utilisateurs & Journal d’Audit"
      subtitle="Gérez les accès de l’équipe et consultez l’historique horodaté des actions."
      apiUnavailable={apiUnavailable}
    >
      <UsersManagement isAdmin={user.role === 'ADMIN'} currentUserId={user.id} />
    </AppShell>
  );
}
