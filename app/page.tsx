import { redirect } from 'next/navigation';
import { getSessionState } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSessionState();
  if (session.status === 'authenticated') {
    redirect('/dashboard');
  }
  if (session.status === 'api_unavailable') {
    redirect('/connexion?api=unavailable');
  }
  redirect('/connexion');
}
