import { AppShell } from '@/components/AppShell';
import { SettingsManagement } from '@/components/SettingsManagement';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { user, apiUnavailable } = await requirePageSession('/parametres');

  return (
    <AppShell
      user={user}
      title="Paramètres du club"
      subtitle="Configurez les contacts WhatsApp, les statistiques de l’Académie et les notifications Push."
      apiUnavailable={apiUnavailable}
    >
      <SettingsManagement isAdmin={user.role === 'ADMIN'} />
    </AppShell>
  );
}
