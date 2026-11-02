'use client';

import { useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  Newspaper,
  Plus,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import {
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Field,
  IconButton,
  Input,
  Kbd,
  LetterAvatar,
  ListRow,
  NumberStepper,
  Pill,
  SegmentedControl,
  Select,
  SheetDialog,
  StatCard,
  StatusBadge,
  Switch,
  SyncIndicator,
  Tabs,
  Textarea,
  getDeterministicPalette,
} from '@/components/ui';
import { DataState, type DataStateKind } from '@/components/DataState';

export default function DesignSystemPage() {
  const [stepperVal, setStepperVal] = useState(2);
  const [switchVal, setSwitchVal] = useState(true);
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [segment, setSegment] = useState<'A' | 'B'>('A');
  const [activeTab, setActiveTab] = useState<'matchs' | 'buteurs' | 'discipline'>('matchs');
  const [dataStateKind, setDataStateKind] = useState<DataStateKind>('ready');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const samplePlayers = [
    { id: '1', name: 'Aboubakar Vincent', position: 'Attaquant', number: 9, status: 'Titulaire', minutes: 820 },
    { id: '2', name: 'Bessala Marc', position: 'Milieu', number: 8, status: 'Titulaire', minutes: 750 },
    { id: '3', name: 'Danwe Moussa', position: 'Défenseur', number: 4, status: 'Remplaçant', minutes: 340 },
    { id: '4', name: 'Ewodo Patrice', position: 'Gardien', number: 1, status: 'Titulaire', minutes: 900 },
  ];

  return (
    <main className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
      {/* En-tête de la page de référence */}
      <header className="border-b border-[var(--border)] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-[6px] bg-[var(--accent)] text-white text-xs font-semibold">
                N
              </span>
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Ngaoundéré Football Club · Administration
              </p>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)] sm:text-3xl">
              Système de design épuré
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
              Référence visuelle : fond blanc/neutre, bordures 1 px, pastilles douces, typographie sans-serif sobre (Inter), couleur club discrète (<code className="font-mono text-xs">#1f5f3d</code>).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SyncIndicator status="online" />
            <Kbd>⌘K</Kbd>
            <Kbd>/</Kbd>
          </div>
        </div>
      </header>

      {/* 1. Jetons de couleur & Typographie */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text)]">1. Couleurs & Fondations</h2>
          <span className="text-xs text-[var(--text-soft)]">Jetons CSS variables</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {[
            ['--bg', 'Fond principal', 'bg-[var(--bg)] border border-[var(--border)] text-[var(--text)]'],
            ['--bg-subtle', 'Sidebar #F6F6F6', 'bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text)]'],
            ['--card', 'Carte blanche', 'bg-[var(--card)] border border-[var(--border)] text-[var(--text)]'],
            ['--accent', 'Vert club #1F5F3D', 'bg-[var(--accent)] text-white'],
            ['--accent-soft', 'Fond vert pastel', 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/20'],
            ['--text', 'Noir doux #111111', 'bg-[var(--text)] text-white'],
          ].map(([token, label, cls]) => (
            <div key={token} className={`rounded-[12px] p-3 text-xs ${cls}`}>
              <p className="font-mono font-semibold">{token}</p>
              <p className="mt-1 text-[11px] opacity-80">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Avatars déterministes pastel */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">2. Avatars pastel avec lettre</h2>
          <p className="text-xs text-[var(--text-muted)]">
            6 palettes déterministes (violet, rose, vert, jaune, bleu, orange) pour les joueurs, modules et listes.
          </p>
        </div>
        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-4">
            {['Matchs', 'Effectif', 'Classement', 'Actualités', 'Partenaires', 'Utilisateurs'].map((name) => {
              const pal = getDeterministicPalette(name);
              return (
                <div key={name} className="flex items-center gap-2.5">
                  <LetterAvatar name={name} size="md" />
                  <div>
                    <p className="text-xs font-medium text-[var(--text)]">{name}</p>
                    <p className="text-[10px] text-[var(--text-soft)] capitalize">{pal}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {/* 3. Boutons & Raccourcis */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--text)]">3. Boutons & Raccourcis</h2>
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button variant="primary">
              <Plus className="h-3.5 w-3.5" />
              Nouveau match
            </Button>
            <Button variant="secondary">Modifier</Button>
            <Button variant="outline">Exporter</Button>
            <Button variant="ghost">Annuler</Button>
            <Button variant="danger">
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </Button>
            <Button variant="primary" loading>
              Enregistrement...
            </Button>
            <IconButton label="Rechercher">
              <Clock className="h-4 w-4" />
            </IconButton>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
            <span>Raccourcis clavier :</span>
            <Kbd>⌘K</Kbd>
            <span>palette de commande</span>
            <span className="mx-1">·</span>
            <Kbd>/</Kbd>
            <span>recherche rapide</span>
            <span className="mx-1">·</span>
            <Kbd>Esc</Kbd>
            <span>fermer</span>
          </div>
        </Card>
      </section>

      {/* 4. Badges & Pilules d'indicateurs */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--text)]">4. Badges pastel & Pilules d’indicateurs</h2>
        <Card className="p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="brand">NFC Officiel</StatusBadge>
            <StatusBadge tone="success">Terminé</StatusBadge>
            <StatusBadge tone="warning">En attente</StatusBadge>
            <StatusBadge tone="danger">En direct</StatusBadge>
            <StatusBadge tone="info">Programmé</StatusBadge>
            <StatusBadge tone="neutral">Brouillon</StatusBadge>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[var(--border)]">
            <Pill icon={<Trophy className="h-3.5 w-3.5 text-[var(--accent)]" />} count="4e" label="au classement" />
            <Pill icon={<Flame className="h-3.5 w-3.5 text-amber-600" />} count="12" label="buts marqués" />
            <Pill icon={<Users className="h-3.5 w-3.5 text-blue-600" />} count="28" label="joueurs actifs" />
            <Pill icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />} count="100%" label="licences validées" />
          </div>
        </Card>
      </section>

      {/* 5. Cartes de chiffres (StatCard) */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">5. Cartes de chiffres clés</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Tuile pastel avec icône, chiffre imposant en tabular-nums, libellé sobre, variation discrète.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Calendar className="h-5 w-5" />}
            value="3"
            label="Matchs à venir"
            change="+1 cette semaine"
            changeTone="positive"
            palette="green"
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            value="26"
            label="Joueurs sous contrat"
            change="Effectif complet"
            changeTone="neutral"
            palette="blue"
          />
          <StatCard
            icon={<Newspaper className="h-5 w-5" />}
            value="14"
            label="Articles publiés"
            change="+2 ce mois"
            changeTone="positive"
            palette="rose"
          />
          <StatCard
            icon={<Trophy className="h-5 w-5" />}
            value="24 pts"
            label="Position Elite Two"
            change="4e rang"
            changeTone="positive"
            palette="yellow"
          />
        </div>
      </section>

      {/* 6. Formulaires & Contrôles */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--text)]">6. Contrôles de formulaires</h2>
        <Card className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nom complet du joueur" hint="Prénom et nom officiel Fecafoot">
              <Input placeholder="Ex. Vincent Aboubakar" />
            </Field>
            <Field label="Poste">
              <Select>
                <option>ATTAQUANT</option>
                <option>MILIEU</option>
                <option>DEFENSEUR</option>
                <option>GARDIEN</option>
              </Select>
            </Field>
          </div>

          <Field label="Biographie / Commentaire interne">
            <Textarea rows={3} placeholder="Notes techniques sur le joueur..." />
          </Field>

          <div className="grid gap-4 pt-2 border-t border-[var(--border)] sm:grid-cols-3">
            <NumberStepper
              label="Score équipe"
              value={stepperVal}
              onChange={setStepperVal}
              min={0}
              max={20}
            />
            <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] p-3">
              <span className="text-xs font-medium text-[var(--text)]">Actif sur le site</span>
              <Switch checked={switchVal} onChange={setSwitchVal} label="Activer" />
            </div>
            <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] p-3">
              <span className="text-xs font-medium text-[var(--text)]">Notification PWA</span>
              <Checkbox checked={checkboxVal} onChange={setCheckboxVal} label="Recevoir" />
            </div>
          </div>
        </Card>
      </section>

      {/* 7. Tableau & Listes épurées */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[var(--text)]">7. Listes & Tableau aéré</h2>
          <SegmentedControl
            options={[
              { value: 'A', label: 'Vue liste' },
              { value: 'B', label: 'Vue tableau' },
            ]}
            value={segment}
            onChange={(v) => setSegment(v)}
          />
        </div>

        {segment === 'A' ? (
          <div className="space-y-2">
            {samplePlayers.map((p) => (
              <ListRow
                key={p.id}
                avatar={<LetterAvatar name={p.name} size="sm" />}
                title={p.name}
                subtitle={`${p.position} · N° ${p.number}`}
                badge={<StatusBadge tone={p.status === 'Titulaire' ? 'success' : 'neutral'}>{p.status}</StatusBadge>}
                action={
                  <span className="font-mono text-xs text-[var(--text-muted)]">{p.minutes} min</span>
                }
              />
            ))}
          </div>
        ) : (
          <DataTable
            columns={[
              {
                key: 'player',
                header: 'Joueur',
                render: (row) => (
                  <div className="flex items-center gap-2.5">
                    <LetterAvatar name={row.name} size="sm" />
                    <div>
                      <p className="font-medium text-[var(--text)]">{row.name}</p>
                      <p className="text-[11px] text-[var(--text-soft)]">N° {row.number}</p>
                    </div>
                  </div>
                ),
              },
              {
                key: 'position',
                header: 'Poste',
                sortable: true,
                render: (row) => row.position,
              },
              {
                key: 'status',
                header: 'Statut',
                render: (row) => (
                  <StatusBadge tone={row.status === 'Titulaire' ? 'success' : 'neutral'}>
                    {row.status}
                  </StatusBadge>
                ),
              },
              {
                key: 'minutes',
                header: 'Temps de jeu',
                sortable: true,
                render: (row) => <span className="font-mono text-xs">{row.minutes} min</span>,
              },
            ]}
            data={samplePlayers}
            selectable
          />
        )}
      </section>

      {/* 8. Onglets & Dialogue */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--text)]">8. Onglets & Boîtes de dialogue</h2>
        <Card className="p-5 space-y-4">
          <Tabs
            tabs={[
              { value: 'matchs', label: 'Matchs récents' },
              { value: 'buteurs', label: 'Classement buteurs' },
              { value: 'discipline', label: 'Cartons & Sanctions' },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v)}
          />
          <div className="flex flex-wrap gap-2.5 pt-2">
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Ouvrir le panneau latéral (Sheet)
            </Button>
            <Button variant="outline" onClick={() => setConfirmOpen(true)}>
              Ouvrir le dialogue de confirmation
            </Button>
          </div>
        </Card>

        <SheetDialog
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Fiche détaillée du joueur"
          description="Informations administratives et licence Fecafoot"
        >
          <div className="space-y-4">
            <Field label="Numéro de licence">
              <Input defaultValue="CMR-2024-88492" readOnly />
            </Field>
            <Field label="Visite médicale">
              <Input defaultValue="Apte jusqu’au 30/06/2027" readOnly />
            </Field>
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)]">
              <Button variant="ghost" onClick={() => setSheetOpen(false)}>
                Fermer
              </Button>
              <Button variant="primary" onClick={() => setSheetOpen(false)}>
                Enregistrer
              </Button>
            </div>
          </div>
        </SheetDialog>

        <ConfirmDialog
          open={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={() => {
            setConfirmOpen(false);
          }}
          title="Supprimer définitivement ce joueur ?"
          description="Cette action est irréversible et supprimera toutes les statistiques associées sur nfcwebsite."
          confirmLabel="Supprimer"
          destructive
        />
      </section>

      {/* 9. États de données (DataState) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-[var(--text)]">9. États de données (DataState)</h2>
          <div className="flex flex-wrap gap-1">
            {(
              [
                'ready',
                'loading',
                'empty',
                'error',
                'offline',
                'stale',
                'forbidden',
                'unavailable_feature',
              ] as DataStateKind[]
            ).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setDataStateKind(k)}
                className={`rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-subtle ${
                  dataStateKind === k
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <DataState
          kind={dataStateKind}
          onRetry={() => setDataStateKind('ready')}
          actionLabel="Créer un élément"
          onAction={() => alert('Action déclenchée')}
        >
          <Card className="p-6 text-center text-xs text-[var(--text-muted)]">
            Les données sont prêtes et affichées normalement.
          </Card>
        </DataState>
      </section>
    </main>
  );
}
