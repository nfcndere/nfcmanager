import { AppShell } from '@/components/AppShell';
import { NewsletterManagement } from '@/components/NewsletterManagement';
import { requirePageSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function NewsletterPage() {
  const { user, apiUnavailable } = await requirePageSession('/newsletter');
  const canWrite = user.role === 'ADMIN' || user.role === 'EDITOR';

  return (
    <AppShell
      user={user}
      title="Newsletter & E-mails"
      subtitle="Consultez la liste des abonnés et le journal des e-mails transactionnels."
      apiUnavailable={apiUnavailable}
    >
      <NewsletterManagement canWrite={canWrite} />
    </AppShell>
  );
}
