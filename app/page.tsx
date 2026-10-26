import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  let session;
  try {
    session = await getSession();
  } catch (error) {
    console.error('Impossible de vérifier la session nfcwebsite:', error);
    redirect('/connexion?api=unavailable');
  }
  redirect(session ? '/dashboard' : '/connexion');
}
