'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Award,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  Home,
  Image as ImageIcon,
  Inbox,
  LogOut,
  Mail,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  RefreshCw,
  Search,
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
import {
  Button,
  Kbd,
  LetterAvatar,
  SheetDialog,
  StatusBadge,
  SyncIndicator,
} from '@/components/ui';
import { CommandPalette } from '@/components/CommandPalette';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const PRIMARY_MENU = [
  { href: '/dashboard', label: 'Vue d’ensemble', icon: Home, shortLabel: 'Accueil' },
  { href: '/matchs', label: 'Matchs & Direct', icon: Calendar, shortLabel: 'Matchs' },
  { href: '/effectif', label: 'Effectif des joueurs', icon: Users, shortLabel: 'Effectif' },
  { href: '/classement', label: 'Classement & Saisons', icon: Trophy, shortLabel: 'Classement' },
  { href: '/actualites', label: 'Actualités & Médias', icon: FileText, shortLabel: 'Articles' },
  { href: '/medias', label: 'Médiathèque officielle', icon: ImageIcon, shortLabel: 'Médias' },
] as const;

const PINNED_ITEMS = [
  {
    href: '/matchs',
    label: 'Match en direct',
    initial: 'M',
    palette: 'green' as const,
  },
  {
    href: '/effectif',
    label: 'Effectif pro',
    initial: 'E',
    palette: 'blue' as const,
  },
  {
    href: '/classement',
    label: 'Elite Two 2024/2025',
    initial: 'C',
    palette: 'yellow' as const,
  },
];

const SECONDARY_LINKS = [
  { href: '/partenaires', label: 'Sponsors & Partenaires', icon: Award, adminOnly: false },
  { href: '/inscriptions', label: 'Académie & Inscriptions', icon: Inbox, adminOnly: false },
  { href: '/newsletter', label: 'Newsletter & Abonnés', icon: Mail, adminOnly: false },
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

function getDoualaGreeting(): string {
  try {
    const formatter = new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'Africa/Douala',
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(formatter.format(new Date()), 10);
    if (hour >= 5 && hour < 12) return 'Bonjour';
    if (hour >= 12 && hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  } catch {
    return 'Bonjour';
  }
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

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('nfc_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [paletteOpen, setPaletteOpen] = useState(false);
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

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nfc_sidebar_collapsed', String(next));
      } catch {
        // Ignorer
      }
      return next;
    });
  };

  // Écoute des raccourcis globaux ⌘K / Ctrl+K et /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      } else if (e.key === '/' && !isInput) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  // Décompte de session
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
          // Garder visible
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
  const firstName = (user.name || user.email || 'Admin').split(' ')[0];
  const greeting = getDoualaGreeting();

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--text)] lg:flex pb-16 lg:pb-0 font-sans antialiased">
      {/* Palette de commande ⌘K */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        userRole={user.role}
      />

      {/* ====================================================================
          BARRE LATÉRALE BUREAU (264px déployée / 72px repliée)
          ==================================================================== */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:shrink-0 bg-[var(--bg-subtle)] border-r border-[var(--border)] transition-[width] duration-200 select-none ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[264px]'
        }`}
      >
        {/* En-tête de barre latérale : Sélecteur d'espace + Bouton replier */}
        <div className="flex h-16 items-center justify-between px-3.5 border-b border-[var(--border)]">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 min-w-0 group"
            title="Espace Ngaoundéré FC"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--accent)] text-white shadow-xs">
              <span className="font-semibold text-sm tracking-wide">NFC</span>
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-semibold text-[var(--text)]">
                    Ngaoundéré FC
                  </p>
                  <ChevronDown className="h-3 w-3 text-[var(--text-soft)]" />
                </div>
                <p className="truncate text-[11px] text-[var(--text-muted)]">
                  Administration
                </p>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Déployer la barre latérale' : 'Replier la barre latérale'}
            aria-label={sidebarCollapsed ? 'Déployer la barre latérale' : 'Replier la barre latérale'}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-subtle"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Champ de recherche rapide avec raccourcis */}
        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className={`flex w-full items-center rounded-full border border-[var(--border)] bg-[var(--card)] text-xs text-[var(--text-muted)] hover:border-[var(--text-soft)] transition-subtle shadow-2xs ${
              sidebarCollapsed ? 'h-10 justify-center px-0' : 'h-10 justify-between px-3'
            }`}
            title="Rechercher une section (⌘K ou /)"
          >
            <span className="flex items-center gap-2 min-w-0">
              <Search className="h-3.5 w-3.5 shrink-0 text-[var(--text-soft)]" />
              {!sidebarCollapsed && <span className="truncate">Rechercher...</span>}
            </span>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-1">
                <Kbd>⌘K</Kbd>
                <Kbd>/</Kbd>
              </div>
            )}
          </button>
        </div>

        {/* Navigation principale */}
        <nav
          aria-label="Navigation principale"
          className="flex-1 space-y-5 overflow-y-auto px-3 py-4"
        >
          {/* Section : Menu principal */}
          <div>
            {!sidebarCollapsed && (
              <p className="px-3 pb-2 text-[11px] font-medium text-[var(--text-soft)]">
                Menu principal
              </p>
            )}
            <div className="space-y-1">
              {PRIMARY_MENU.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`flex items-center gap-3 h-11 px-3 text-xs font-medium rounded-full transition-subtle select-none ${
                      active
                        ? 'nav-pill-active'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <Icon className="h-4 w-4 shrink-0 stroke-[1.6]" />
                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Séparateur discret */}
          <div className="border-t border-[var(--border)]" />

          {/* Section : Épinglés */}
          <div>
            {!sidebarCollapsed && (
              <p className="px-3 pb-2 text-[11px] font-medium text-[var(--text-soft)]">
                Épinglés
              </p>
            )}
            <div className="space-y-1">
              {PINNED_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`flex items-center gap-2.5 h-10 px-3 text-xs font-medium rounded-full transition-subtle select-none ${
                      active
                        ? 'nav-pill-active'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]'
                    } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                  >
                    <LetterAvatar
                      name={item.initial}
                      palette={item.palette}
                      size="xs"
                      shape="square"
                    />
                    {!sidebarCollapsed && (
                      <div className="flex flex-1 items-center justify-between min-w-0">
                        <span className="truncate text-xs">{item.label}</span>
                        <Pin className="h-3 w-3 text-[var(--text-soft)] shrink-0 opacity-60" />
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Section : Administration (ADMIN) */}
          {user.role === 'ADMIN' && (
            <>
              <div className="border-t border-[var(--border)]" />
              <div>
                {!sidebarCollapsed && (
                  <p className="px-3 pb-2 text-[11px] font-medium text-[var(--text-soft)]">
                    Administration
                  </p>
                )}
                <div className="space-y-1">
                  {SYSTEM_LINKS.filter((l) => l.adminOnly).map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={sidebarCollapsed ? item.label : undefined}
                        className={`flex items-center gap-3 h-10 px-3 text-xs font-medium rounded-full transition-subtle select-none ${
                          active
                            ? 'nav-pill-active'
                            : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]'
                        } ${sidebarCollapsed ? 'justify-center px-0' : ''}`}
                      >
                        <Icon className="h-4 w-4 shrink-0 stroke-[1.6]" />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* Pied de barre latérale : Utilisateur + Thème + Déconnexion */}
        <div className="p-3 border-t border-[var(--border)]">
          <div
            className={`flex items-center gap-2.5 rounded-[12px] p-1.5 ${
              sidebarCollapsed ? 'flex-col justify-center' : 'justify-between'
            }`}
          >
            <Link
              href="/compte"
              className="flex items-center gap-2.5 min-w-0 group"
              title="Gérer mon compte"
            >
              <LetterAvatar name={user.name || user.email} size="sm" />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-subtle">
                    {user.name || user.email}
                  </p>
                  <p className="truncate text-[10px] text-[var(--text-soft)]">
                    {user.role === 'ADMIN' ? 'Administrateur' : 'Éditeur'}
                  </p>
                </div>
              )}
            </Link>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
                title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)] transition-subtle"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-subtle"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ====================================================================
          ZONE CENTRALE DE L'APPLICATION
          ==================================================================== */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre supérieure mobile & barre d'état */}
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            {/* Logo sur mobile */}
            <div className="flex items-center gap-2.5 lg:hidden min-w-0">
              <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--accent)] text-white text-xs font-semibold">
                  N
                </div>
                <span className="truncate text-xs font-semibold text-[var(--text)]">
                  NFC Manager
                </span>
              </Link>
            </div>

            {/* Titre / Chemin discret sur grand écran */}
            <div className="hidden lg:flex items-center gap-2 min-w-0 text-xs text-[var(--text-muted)]">
              <span>Ngaoundéré FC</span>
              <span className="text-[var(--text-soft)]">/</span>
              <span className="font-medium text-[var(--text)] truncate">
                {title || 'Tableau de bord'}
              </span>
            </div>

            {/* Outils en-tête droit : Synchro, Installer, Profil */}
            <div className="flex items-center gap-2">
              <SyncIndicator
                status={syncStatus}
                pendingCount={pendingMutations.length}
                onClick={() =>
                  pendingMutations.length > 0 ? setQueueOpen(true) : void triggerSync()
                }
              />

              {(installPrompt || (isIos && !isStandalone)) && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleInstallClick}
                  className="hidden sm:inline-flex"
                >
                  <Download className="h-3.5 w-3.5" />
                  Installer
                </Button>
              )}

              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                title="Recherche et commandes (⌘K)"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-subtle lg:hidden"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Bandeau d'alerte expiration de session */}
          {showExpiryWarning && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-4 py-2 text-xs font-medium text-[var(--status-warning-text)]"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Votre session expire dans {secondsLeft} s. Les saisies locales sont protégées.
              </span>
              <Button
                type="button"
                size="sm"
                variant="primary"
                onClick={async () => {
                  const res = await fetch('/api/auth/refresh', { method: 'POST' });
                  if (res.ok) {
                    notify({ tone: 'success', message: 'Session prolongée de 15 minutes.' });
                  } else {
                    router.push(`/connexion?expired=1&next=${encodeURIComponent(pathname)}`);
                  }
                }}
              >
                Prolonger
              </Button>
            </div>
          )}
        </header>

        {/* Contenu principal */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {apiUnavailable && (
            <div
              role="status"
              className="mb-6 rounded-[12px] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-3.5 text-xs text-[var(--status-warning-text)]"
            >
              L’API du site n’a pas répondu lors du chargement : affichage des données en cache local.
            </div>
          )}

          {/* En-tête de page avec salutation épurée et actions */}
          {(title || actions || subtitle) && (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border)] pb-5">
              <div>
                {pathname === '/dashboard' ? (
                  <div>
                    <h1 className="text-xl font-normal text-[var(--text)] sm:text-2xl">
                      {greeting},{' '}
                      <strong className="font-semibold text-[var(--text)]">{firstName}</strong>
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
                      {subtitle || 'Voici ce qui se passe au club aujourd’hui.'}
                    </p>
                  </div>
                ) : (
                  <div>
                    {subtitle && (
                      <p className="text-xs text-[var(--text-muted)] mb-0.5">{subtitle}</p>
                    )}
                    {title && (
                      <h1 className="text-xl font-semibold tracking-tight text-[var(--text)] sm:text-2xl">
                        {title}
                      </h1>
                    )}
                  </div>
                )}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}

          {children}
        </main>
      </div>

      {/* ====================================================================
          BARRE DE NAVIGATION MOBILE (Bottom Nav 5 onglets)
          ==================================================================== */}
      <nav
        aria-label="Navigation mobile"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--border)] bg-[var(--card)]/95 backdrop-blur-md lg:hidden shadow-sm"
      >
        {PRIMARY_MENU.slice(0, 4).map((tab) => {
          const Icon = tab.icon;
          const active =
            pathname === tab.href ||
            (tab.href !== '/dashboard' && pathname.startsWith(`${tab.href}/`));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-13 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-subtle select-none ${
                active
                  ? 'text-[var(--accent)] font-semibold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              <div
                className={`flex h-7 w-12 items-center justify-center rounded-full transition-subtle ${
                  active ? 'bg-[var(--accent-soft)]' : ''
                }`}
              >
                <Icon className="h-4 w-4 stroke-[1.6]" />
              </div>
              <span>{tab.shortLabel}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={`flex min-h-13 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-subtle select-none ${
            moreOpen
              ? 'text-[var(--accent)] font-semibold'
              : 'text-[var(--text-muted)] hover:text-[var(--text)]'
          }`}
        >
          <div
            className={`flex h-7 w-12 items-center justify-center rounded-full transition-subtle ${
              moreOpen ? 'bg-[var(--accent-soft)]' : ''
            }`}
          >
            <Menu className="h-4 w-4 stroke-[1.6]" />
          </div>
          <span>Plus</span>
        </button>
      </nav>

      {/* ====================================================================
          TIROIR MOBILE « PLUS »
          ==================================================================== */}
      <SheetDialog
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title="Navigation & Compte"
        description={`${user.name || user.email} · ${user.role === 'ADMIN' ? 'Administrateur' : 'Éditeur'}`}
      >
        <div className="space-y-4 pt-1">
          {/* Liens secondaires */}
          <div>
            <p className="px-1 pb-1.5 text-[11px] font-medium text-[var(--text-soft)]">
              Gestion du club
            </p>
            <div className="space-y-1">
              {[...PRIMARY_MENU.slice(4), ...SECONDARY_LINKS].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-[10px] p-2.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-subtle"
                  >
                    <Icon className="h-4 w-4 text-[var(--accent)] shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Liens système */}
          <div className="border-t border-[var(--border)] pt-3">
            <p className="px-1 pb-1.5 text-[11px] font-medium text-[var(--text-soft)]">
              Administration & Paramètres
            </p>
            <div className="space-y-1">
              {SYSTEM_LINKS.map((item) => {
                if (item.adminOnly && user.role !== 'ADMIN') return null;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 rounded-[10px] p-2.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--bg-subtle)] transition-subtle"
                  >
                    <Icon className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Actions : PWA & Déconnexion */}
          <div className="border-t border-[var(--border)] pt-3 space-y-2">
            {(installPrompt || (isIos && !isStandalone)) && (
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start"
                onClick={() => {
                  setMoreOpen(false);
                  void handleInstallClick();
                }}
              >
                <Download className="h-4 w-4" />
                Installer l’application
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              className="w-full justify-start"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
            </Button>

            <Button
              type="button"
              variant="danger"
              className="w-full justify-start"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </SheetDialog>

      {/* ====================================================================
          TIROIR DE SYNCHRONISATION HORS LIGNE
          ==================================================================== */}
      <SheetDialog
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        title="Synchronisation hors ligne"
        description={`${pendingMutations.length} modification(s) en attente`}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setQueueOpen(false)}>
              Fermer
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void triggerSync()}
              disabled={!online}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Synchroniser
            </Button>
          </div>
        }
      >
        <div className="space-y-2.5 pt-1">
          {pendingMutations.map((item) => (
            <div
              key={item.id}
              className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-subtle)] p-3 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-[var(--text)]">{item.label}</span>
                <StatusBadge
                  tone={
                    item.status === 'pending'
                      ? 'warning'
                      : item.status === 'conflict'
                        ? 'danger'
                        : 'neutral'
                  }
                >
                  {item.status}
                </StatusBadge>
              </div>
              {item.status === 'conflict' && (
                <div className="mt-2.5 space-y-2 border-t border-[var(--border)] pt-2 text-[11px]">
                  <p className="text-[var(--status-danger-text)] font-medium">
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
                      variant="secondary"
                      onClick={() => void removeOfflineMutation(item.id)}
                    >
                      Garder serveur
                    </Button>
                  </div>
                </div>
              )}
              {item.errorMessage && (
                <p className="mt-1.5 text-[11px] text-[var(--status-danger-text)]">
                  {item.errorMessage}
                </p>
              )}
            </div>
          ))}
        </div>
      </SheetDialog>

      {/* Modal d'aide iOS */}
      <SheetDialog
        open={iosHelpOpen}
        onClose={() => setIosHelpOpen(false)}
        title="Installer sur iPhone / iPad"
      >
        <ol className="list-decimal space-y-2 pl-4 text-xs text-[var(--text-muted)] pt-2 leading-relaxed">
          <li>
            Appuyez sur le bouton <strong>Partager</strong> dans Safari (icône avec la flèche vers le haut).
          </li>
          <li>
            Faites défiler le menu et appuyez sur <strong>Sur l’écran d’accueil</strong>.
          </li>
          <li>
            Appuyez sur <strong>Ajouter</strong> en haut à droite pour confirmer.
          </li>
        </ol>
      </SheetDialog>
    </div>
  );
}
