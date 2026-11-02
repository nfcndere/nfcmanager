'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  FileText,
  Home,
  Image as ImageIcon,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Trophy,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { Kbd } from '@/components/ui';
import { useAppRuntime } from '@/components/providers/AppProviders';

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Actions rapides' | 'Système';
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

export function CommandPalette({
  open,
  onClose,
  userRole,
}: {
  open: boolean;
  onClose: () => void;
  userRole?: string;
}) {
  const router = useRouter();
  const searchInputId = useId();
  const { theme, toggleTheme } = useAppRuntime();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = [
      {
        id: 'nav-home',
        title: 'Vue d’ensemble',
        subtitle: 'Tableau de bord et indicateurs clés',
        category: 'Navigation',
        icon: <Home className="h-4 w-4" />,
        onSelect: () => router.push('/dashboard'),
      },
      {
        id: 'nav-matches',
        title: 'Matchs & Direct',
        subtitle: 'Scores, calendrier et pilotage en direct',
        category: 'Navigation',
        icon: <Calendar className="h-4 w-4" />,
        shortcut: 'G M',
        onSelect: () => router.push('/matchs'),
      },
      {
        id: 'nav-players',
        title: 'Effectif des joueurs',
        subtitle: 'Fiches joueurs, numéros et licences',
        category: 'Navigation',
        icon: <Users className="h-4 w-4" />,
        shortcut: 'G E',
        onSelect: () => router.push('/effectif'),
      },
      {
        id: 'nav-standings',
        title: 'Classement & Saisons',
        subtitle: 'Elite Two et classement du championnat',
        category: 'Navigation',
        icon: <Trophy className="h-4 w-4" />,
        onSelect: () => router.push('/classement'),
      },
      {
        id: 'nav-articles',
        title: 'Actualités & Communiqués',
        subtitle: 'Articles publiés et brouillons',
        category: 'Navigation',
        icon: <FileText className="h-4 w-4" />,
        onSelect: () => router.push('/actualites'),
      },
      {
        id: 'nav-medias',
        title: 'Médiathèque',
        subtitle: 'Photos et logos officiels',
        category: 'Navigation',
        icon: <ImageIcon className="h-4 w-4" />,
        onSelect: () => router.push('/medias'),
      },
      {
        id: 'act-new-match',
        title: 'Programmer un match',
        subtitle: 'Créer une nouvelle rencontre',
        category: 'Actions rapides',
        icon: <Plus className="h-4 w-4 text-[var(--accent)]" />,
        onSelect: () => router.push('/matchs?action=new'),
      },
      {
        id: 'act-new-article',
        title: 'Rédiger une actualité',
        subtitle: 'Nouvel article pour le site officiel',
        category: 'Actions rapides',
        icon: <Plus className="h-4 w-4 text-[var(--accent)]" />,
        onSelect: () => router.push('/actualites?action=new'),
      },
      {
        id: 'act-theme',
        title: theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre',
        subtitle: 'Apparence de l’interface',
        category: 'Système',
        icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        onSelect: () => toggleTheme(),
      },
      {
        id: 'nav-account',
        title: 'Mon compte',
        subtitle: 'Profil, mot de passe et préférences',
        category: 'Système',
        icon: <UserCircle className="h-4 w-4" />,
        onSelect: () => router.push('/compte'),
      },
    ];

    if (userRole === 'ADMIN') {
      list.push(
        {
          id: 'nav-settings',
          title: 'Paramètres du club',
          subtitle: 'Configuration générale et réseaux',
          category: 'Navigation',
          icon: <Settings className="h-4 w-4" />,
          onSelect: () => router.push('/parametres'),
        },
        {
          id: 'nav-users',
          title: 'Gestion des utilisateurs',
          subtitle: 'Comptes d’administration et journal d’audit',
          category: 'Navigation',
          icon: <ShieldCheck className="h-4 w-4" />,
          onSelect: () => router.push('/utilisateurs'),
        },
      );
    }

    return list;
  }, [router, theme, toggleTheme, userRole]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q),
    );
  }, [items, query]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSelectedIndex(0);
  };

  // Écoute clavier dans le dialogue
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          selected.onSelect();
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredItems, onClose, open, selectedIndex]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cmd-heading"
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24"
    >
      {/* Fond sombre transparent */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Boîte de dialogue */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--card)] shadow-lg animate-in fade-in zoom-in-95 duration-150">
        <h2 id="cmd-heading" className="sr-only">
          Recherche et commandes rapides
        </h2>

        {/* Barre de saisie */}
        <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
          <label htmlFor={searchInputId} className="sr-only">
            Rechercher une section ou une action
          </label>
          <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
          <input
            id={searchInputId}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Rechercher une page ou une action..."
            className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-soft)] focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => handleQueryChange('')}
              className="text-[var(--text-muted)] hover:text-[var(--text)]"
              aria-label="Effacer le texte saisi"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <Kbd>Esc</Kbd>
          )}
        </div>

        {/* Résultats */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              Aucun résultat pour « {query} ».
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredItems.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      item.onSelect();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex w-full items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-left text-xs transition-subtle select-none ${
                      isSelected
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.title}</p>
                        {item.subtitle && (
                          <p
                            className={`truncate text-[11px] ${
                              isSelected ? 'text-white/80' : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] ${
                          isSelected ? 'text-white/70' : 'text-[var(--text-soft)]'
                        }`}
                      >
                        {item.category}
                      </span>
                      {item.shortcut && (
                        <Kbd
                          className={isSelected ? 'bg-white/20 border-white/30 text-white' : ''}
                        >
                          {item.shortcut}
                        </Kbd>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Pied de palette */}
        <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-subtle)] px-4 py-2 text-[11px] text-[var(--text-soft)]">
          <div className="flex items-center gap-3">
            <span>
              <Kbd>↑</Kbd> <Kbd>↓</Kbd> pour naviguer
            </span>
            <span>
              <Kbd>↵</Kbd> pour ouvrir
            </span>
          </div>
          <span>NFC Manager</span>
        </div>
      </div>
    </div>
  );
}
