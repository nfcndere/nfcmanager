import Link from 'next/link';
import { SiteUser } from '@/lib/auth';
import { SignOutButton } from '@/components/SignOutButton';

export function AppShell({ user, children }: { user: SiteUser; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-nfc-dark text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link className="font-bold tracking-wide" href="/dashboard">NFC <span className="font-normal text-emerald-200">ADMIN</span></Link>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            <Link href="/dashboard">Tableau de bord</Link>
            <Link href="/matchs">Matchs</Link>
            <Link href="/classement">Classement</Link>
            <Link href="/effectif">Effectif</Link>
            <Link href="/actualites">Actualités</Link>
            <span className="hidden text-emerald-100 sm:inline">{user.name} · {user.role}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
