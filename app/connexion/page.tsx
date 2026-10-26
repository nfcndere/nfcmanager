import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/LoginForm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ api?: string | string[] }> }) {
  const params = await searchParams;
  let user = null;
  let apiUnavailable = false;
  try {
    user = await getSession();
  } catch (error) {
    console.error('API nfcwebsite indisponible pendant la vérification de session:', error);
    apiUnavailable = true;
  }
  if (user) redirect('/dashboard');

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-sm sm:p-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-nfc-green">Ngaoundéré FC</p>
          <h1 className="mt-3 text-3xl font-bold">Administration</h1>
          <p className="mt-2 text-gray-600">Connectez-vous avec votre compte interne.</p>
          {(apiUnavailable || params.api === 'unavailable') && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="status">L’API nfcwebsite est indisponible. La connexion sera possible lorsque le service répondra.</p>}
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
