'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Award,
  Calendar,
  Download,
  FileText,
  Home,
  Image as ImageIcon,
  Inbox,
  LogOut,
  Mail,
  Menu,
  Moon,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sun,
  Trophy,
  UserCircle,
  Users,
} from 'lucide-react';
import { SiteUser } from '@/lib/auth';
import { useAppRuntime } from '@/components/providers/AppProviders';
import { removeOfflineMutation } from '@/lib/offline-queue';
import { Button, SheetDialog } from '@/components/ui';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const PRIMARY_TABS = [
  { href: '/dashboard', label: 'Vue d’ensemble', shortLabel: 'Accueil', icon: Home },
  { href: '/matchs', label: 'Matchs & Direct', shortLabel: 'Matchs', icon: Calendar },
  { href: '/actualites', label: 'Actualités', shortLabel: 'Articles', icon: FileText },
  { href: '/medias', label: 'Médiathèque', shortLabel: 'Médias', icon: ImageIcon },
] as const;

const CLUB_LINKS = [
  { href: '/effectif', label: 'Effectif des joueurs', icon: Users, adminOnly: false },
  { href: '/classement', label: 'Classement & Saisons', icon: Trophy, adminOnly: false },
  { href: '/partenaires', label: 'Sponsors & Partenaires', icon: Award, adminOnly: false },
  { href: '/inscriptions', label: 'Académie & Formulaires', icon: Inbox, adminOnly: false },
  { href: '/newsletter', label: 'Newsletter & E-mails', icon: Mail, adminOnly: false },
] as const;

const SYSTEM_LINKS = [
  { href: '/parametres', label: 'Paramètres du club', icon: Settings, adminOnly: true },
  { href: '/utilisateurs', label: 'Utilisateurs & Audit', icon: ShieldCheck, adminOnly: true },
  { href: '/compte', label: 'Mon compte', icon: UserCircle, adminOnly: false },
] as const;

function readSessionExpiryCookie(): number | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)nfcwebsite_session_exp=(\d+)/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function AppShell({
  user,
  title,
  subtitle,
  apiUnavailable,
  actions,
  children,
}: {
  user: SiteUser;
  title?: string;
  subtitle?: string;
  apiUnavailable?: boolean;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    online,
    syncStatus,
    pendingMutations,
    triggerSync,
    theme,
    toggleTheme,
    notify,
  } = useAppRuntime();

  const [moreOpen, setMoreOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos] = useState(() =>
    typeof window !== 'undefined'
      ? /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
      : false,
  );
  const [isStandalone] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(display-mode: standalone)').matches
      : false,
  );
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [refreshingSession, setRefreshingSession] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  useEffect(() => {
    const tick = async () => {
      const exp = readSessionExpiryCookie();
      if (!exp) {
        setSecondsLeft(null);
        return;
      }
      const remaining = Math.round((exp - Date.now()) / 1_000);
      setSecondsLeft(remaining);

      if (remaining <= 120 && remaining > 0 && online && !refreshingSession) {
        setRefreshingSession(true);
        try {
          const res = await fetch('/api/auth/refresh', { method: 'POST' });
          if (res.ok) {
            const newExp = readSessionExpiryCookie();
            if (newExp) setSecondsLeft(Math.round((newExp - Date.now()) / 1_000));
          }
        } catch {
          // On garde le bandeau visible
        } finally {
          setRefreshingSession(false);
        }
      }
    };
    void tick();
    const interval = setInterval(() => void tick(), 15_000);
    return () => clearInterval(interval);
  }, [online, refreshingSession]);

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/connexion');
    router.refresh();
  };

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallPrompt(null);
        notify({ tone: 'success', message: 'Application installée sur votre écran d’accueil.' });
      }
      return;
    }
    if (isIos && !isStandalone) {
      setIosHelpOpen(true);
    }
  };

  const showExpiryWarning = secondsLeft !== null && secondsLeft <= 120 && secondsLeft > 0;

  return (
    <div className="min-h-dvh bg-[var(--nfc-bg)] pb-16 text-[var(--nfc-text)] lg:flex lg:pb-0">
      {/* Barre latérale — Style site NFC (fond sombre, vert, typographie Oswald) */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:bg-[var(--nfc-dark)] lg:text-white shadow-xl">
        <div className="flex h-16 items-center gap-3 bg-[var(--nfc-dark)] px-5 border-b-2 border-[var(--nfc-green)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Logo Ngaoundéré FC"
            className="h-10 w-10 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <Link href="/dashboard" className="block truncate font-display text-sm font-bold tracking-wider text-white">
              NGAOUNDÉRÉ FC
            </Link>
            <span className="block truncate font-display text-[10px] uppercase tracking-widest text-[var(--nfc-yellow)]">
              Administration
            </span>
          </div>
        </div>

        <nav aria-label="Navigation principale" className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          <div className="space-y-1">
            <p className="px-3 pb-1 font-display text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Opérations
            </p>
            {PRIMARY_TABS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 font-display text-xs font-semibold uppercase tracking-wider transition ${
                    active
                      ? 'bg-[var(--nfc-green)] text-white shadow-md'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-[var(--nfc-yellow)]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 font-display text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Gestion du club
            </p>
            {CLUB_LINKS.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 font-display text-xs font-semibold uppercase tracking-wider transition ${
                    active
                      ? 'bg-[var(--nfc-green)] text-white shadow-md'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-[var(--nfc-yellow)]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 font-display text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Configuration
            </p>
            {SYSTEM_LINKS.map((item) => {
              if (item.adminOnly && user.role !== 'ADMIN') return null;
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 font-display text-xs font-semibold uppercase tracking-wider transition ${
                    active
                      ? 'bg-[var(--nfc-green)] text-white shadow-md'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 text-[var(--nfc-yellow)]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="bg-[var(--nfc-surface)] p-3">
          <div className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="min-w-0">
              <p className="truncate font-display text-xs font-bold uppercase tracking-wide text-white">
                {user.name || user.email}
              </p>
              <p className="truncate font-display text-[10px] uppercase tracking-wider text-[var(--nfc-yellow)]">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="flex h-8 w-8 items-center justify-center text-gray-400 hover:bg-white/10 hover:text-red-400 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Colonne principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre supérieure style site (fond blanc, sans bordure encombrante, ombre nette) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:bg-[var(--nfc-surface)]/95">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.png"
                  alt="Ngaoundéré FC"
                  className="h-8 w-8 object-contain"
                />
                <span className="font-display font-extrabold uppercase tracking-wider text-[var(--nfc-dark)] dark:text-white">NFC Manager</span>
              </Link>
              {title && (
                <span className="hidden truncate font-display text-xs font-bold uppercase tracking-wider text-[var(--nfc-green)] lg:inline">
                  {title}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Indicateur de synchro style badge club */}
              <button
                type="button"
                onClick={() => (pendingMutations.length > 0 ? setQueueOpen(true) : void triggerSync())}
                aria-live="polite"
                className="inline-flex h-8 items-center gap-1.5 px-3 font-display text-[11px] font-bold uppercase tracking-wider bg-[var(--nfc-surface-subtle)] text-[var(--nfc-text)] hover:bg-[var(--nfc-green)] hover:text-white transition"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    syncStatus === 'online'
                      ? 'bg-[var(--nfc-green)]'
                      : syncStatus === 'syncing'
                        ? 'animate-ping bg-sky-500'
                        : syncStatus === 'error'
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                  }`}
                />
                <span>
                  {syncStatus === 'online' &&
                    (pendingMutations.length > 0
                      ? `${pendingMutations.length} en attente`
                      : 'Connecté')}
                  {syncStatus === 'offline' &&
                    `Hors ligne${pendingMutations.length ? ` (${pendingMutations.length})` : ''}`}
                  {syncStatus === 'syncing' && 'Synchro…'}
                  {syncStatus === 'error' && `Conflit (${pendingMutations.length})`}
                </span>
              </button>

              {(installPrompt || (isIos && !isStandalone)) && (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={handleInstallClick}
                  className="hidden sm:inline-flex"
                >
                  <Download className="h-3.5 w-3.5" />
                  Installer
                </Button>
              )}

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
                className="inline-flex h-8 w-8 items-center justify-center bg-[var(--nfc-surface-subtle)] text-[var(--nfc-muted)] hover:text-[var(--nfc-green)] transition"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              <Link
                href="/compte"
                className="inline-flex h-8 items-center gap-1.5 px-2.5 font-display text-xs font-bold uppercase tracking-wider bg-[var(--nfc-surface-subtle)] text-[var(--nfc-text)] hover:text-[var(--nfc-green)] transition"
              >
                <UserCircle className="h-4 w-4 text-[var(--nfc-green)]" />
                <span className="hidden sm:inline">{user.name || user.email}</span>
              </Link>
            </div>
          </div>

          {showExpiryWarning && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 bg-amber-400 px-4 py-2 font-display text-xs font-bold uppercase tracking-wider text-[var(--nfc-dark)]"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Session bientôt expirée ({secondsLeft} s). Vos saisies locales sont préservées.
              </span>
              <Button
                type="button"
                size="sm"
                variant="dark"
                onClick={async () => {
                  const res = await fetch('/api/auth/refresh', { method: 'POST' });
                  if (res.ok) {
                    notify({ tone: 'success', message: 'Session prolongée de 15 minutes.' });
                  } else {
                    router.push(`/connexion?expired=1&next=${encodeURIComponent(pathname)}`);
                  }
                }}
              >
                Prolonger la session
              </Button>
            </div>
          )}
        </header>

        {/* Contenu principal sans bordures superflues, style cartes et sections site NFC */}
        <main className="mx-auto w-full max-w-7xl flex-1 px-3 py-6 sm:px-6 sm:py-8">
          {apiUnavailable && (
            <div
              role="status"
              className="mb-5 bg-amber-100 p-3 font-display text-xs font-bold uppercase tracking-wider text-amber-900 border-l-4 border-amber-500"
            >
              L’API nfcwebsite n’a pas répondu lors du chargement serveur : affichage des données en cache local.
            </div>
          )}
          {(title || actions) && (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                {subtitle && <span className="section-tag mb-1">{subtitle}</span>}
                {title && (
                  <h1 className="font-display text-2xl font-extrabold uppercase tracking-tight text-[var(--nfc-text)] sm:text-3xl">
                    {title}
                  </h1>
                )}
                <div className="mt-2 h-1 w-12 bg-[var(--nfc-green)]" />
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* Barre de navigation inférieure mobile (style site) */}
      <nav
        aria-label="Navigation mobile"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 bg-white/98 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:bg-[var(--nfc-dark)]/98 backdrop-blur-md lg:hidden"
      >
        {PRIMARY_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 font-display text-[10px] font-bold uppercase tracking-wider transition ${
                active
                  ? 'text-[var(--nfc-green)] border-t-2 border-[var(--nfc-green)] bg-[var(--nfc-green)]/5 dark:text-[var(--nfc-yellow)]'
                  : 'text-gray-500 hover:text-[var(--nfc-text)]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.shortLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={`flex min-h-14 flex-col items-center justify-center gap-1 font-display text-[10px] font-bold uppercase tracking-wider transition ${
            moreOpen
              ? 'text-[var(--nfc-green)] border-t-2 border-[var(--nfc-green)] bg-[var(--nfc-green)]/5 dark:text-[var(--nfc-yellow)]'
              : 'text-gray-500 hover:text-[var(--nfc-text)]'
          }`}
        >
          <Menu className="h-4 w-4" />
          <span>Plus</span>
        </button>
      </nav>

      {/* Tiroir « Plus » mobile */}
      <SheetDialog
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Navigation & Compte"
        subtitle={`${user.name || user.email} · ${user.role}`}
      >
        <div className="grid gap-2">
          {[...CLUB_LINKS, ...SYSTEM_LINKS].map((item) => {
            if (item.adminOnly && user.role !== 'ADMIN') return null;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 bg-[var(--nfc-surface-subtle)] p-3 font-display text-xs font-bold uppercase tracking-wider hover:bg-[var(--nfc-green)] hover:text-white transition"
              >
                <Icon className="h-4 w-4 text-[var(--nfc-yellow)]" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {(installPrompt || (isIos && !isStandalone)) && (
            <Button
              type="button"
              variant="secondary"
              className="mt-2"
              onClick={() => {
                setMoreOpen(false);
                void handleInstallClick();
              }}
            >
              <Download className="h-4 w-4" />
              Installer l’application
            </Button>
          )}

          <Button type="button" variant="danger" className="mt-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </Button>
        </div>
      </SheetDialog>

      {/* Tiroir de synchronisation hors ligne */}
      <SheetDialog
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        title="Synchronisation hors ligne"
        subtitle={`${pendingMutations.length} modification(s) en file d’attente`}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setQueueOpen(false)}>
              Fermer
            </Button>
            <Button type="button" variant="primary" onClick={() => void triggerSync()} disabled={!online}>
              <RefreshCw className="h-3.5 w-3.5" />
              Synchroniser
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {pendingMutations.map((item) => (
            <div
              key={item.id}
              className="nfc-card p-4 text-[13px]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{item.label}</span>
                <span className="font-display text-[10px] font-bold uppercase tracking-wider text-[var(--nfc-muted)]">{item.status}</span>
              </div>
              {item.status === 'conflict' && (
                <div className="mt-3 space-y-2 border-t border-[var(--nfc-divider)] pt-3 text-xs">
                  <p className="font-semibold text-amber-700 dark:text-amber-300">
                    Conflit : le serveur possède une version plus récente ({item.conflictServerUpdatedAt}).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => void triggerSync(item.id)}
                    >
                      Conserver ma version
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void removeOfflineMutation(item.id)}
                    >
                      Garder la version serveur
                    </Button>
                  </div>
                </div>
              )}
              {item.errorMessage && <p className="mt-2 text-xs font-semibold text-red-600">{item.errorMessage}</p>}
            </div>
          ))}
        </div>
      </SheetDialog>

      <SheetDialog
        open={iosHelpOpen}
        onClose={() => setIosHelpOpen(false)}
        title="Installer sur iPhone / iPad"
      >
        <ol className="list-decimal space-y-2 pl-5 text-[13px] text-[var(--nfc-muted)]">
          <li>Appuyez sur le bouton <strong>Partager</strong> dans la barre de Safari.</li>
          <li>Choisissez <strong>Sur l’écran d’accueil</strong>.</li>
          <li>Validez avec <strong>Ajouter</strong> en haut à droite.</li>
        </ol>
      </SheetDialog>
    </div>
  );
}
