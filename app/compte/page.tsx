import { AppShell } from '@/components/AppShell';
import { AccountView } from '@/components/AccountView';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const { user, apiUnavailable } = await requirePageSession('/compte');
  return (
    <AppShell
      user={user}
      title="Mon compte & Sécurité"
      subtitle="Gérez votre mot de passe et vérifiez la connexion au site officiel."
      apiUnavailable={apiUnavailable}
    >
      <AccountView user={user} />
    </AppShell>
  );
}
