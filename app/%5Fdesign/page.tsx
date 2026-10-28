'use client';

import { useState } from 'react';
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  NumberStepper,
  SegmentedControl,
  Select,
  SheetDialog,
  StatusBadge,
  Switch,
} from '@/components/ui';
import { DataState, type DataStateKind } from '@/components/DataState';

export default function DesignSystemPage() {
  const [stepperVal, setStepperVal] = useState(2);
  const [switchVal, setSwitchVal] = useState(true);
  const [segment, setSegment] = useState<'A' | 'B' | 'C'>('A');
  const [dataStateKind, setDataStateKind] = useState<DataStateKind>('ready');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <main className="mx-auto max-w-5xl space-y-10 px-4 py-10">
      <header className="border-b border-[var(--nfc-divider)] pb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--nfc-green)]">
          Charte Graphique Ngaoundéré FC
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold uppercase tracking-wide">
          Système de Design — NFC Manager (`/_design`)
        </h1>
        <p className="mt-2 text-sm text-[var(--nfc-muted)]">
          Catalogue interactif des jetons de couleurs, typographies (Oswald + Source Sans 3), composants tactiles (cibles ≥ 48 px) et états de données.
        </p>
      </header>

      {/* Palette de couleurs */}
      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase">1. Jetons de couleur</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            ['--nfc-green', '#1f5f3d', 'bg-[#1f5f3d] text-white'],
            ['--nfc-green-dark', '#173f2d', 'bg-[#173f2d] text-white'],
            ['--nfc-yellow', '#8cea5a', 'bg-[#8cea5a] text-[#0c130e]'],
            ['--nfc-dark', '#0c130e', 'bg-[#0c130e] text-white'],
            ['--nfc-surface', '#141f17', 'bg-[#141f17] text-white'],
          ].map(([token, hex, cls]) => (
            <div key={token} className={`rounded-2xl p-4 ${cls}`}>
              <p className="font-mono text-xs font-bold">{token}</p>
              <p className="mt-1 text-sm opacity-85">{hex}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Boutons & Badges */}
      <section className="space-y-4 nfc-card p-5">
        <h2 className="font-display text-xl font-bold uppercase">2. Boutons & Badges</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primaire</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="accent">Accent Jaune</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Fantôme</Button>
          <Button variant="primary" loading>
            Chargement
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <StatusBadge tone="brand">NFC Officiel</StatusBadge>
          <StatusBadge tone="success">Publié / Terminé</StatusBadge>
          <StatusBadge tone="warning">Brouillon / En attente</StatusBadge>
          <StatusBadge tone="danger">En direct / Erreur</StatusBadge>
          <StatusBadge tone="info">Programmé</StatusBadge>
          <StatusBadge tone="neutral">Archivé</StatusBadge>
        </div>
      </section>

      {/* Contrôles de formulaire & Steppers */}
      <section className="space-y-4 nfc-card p-5">
        <h2 className="font-display text-xl font-bold uppercase">
          3. Contrôles tactiles (Mobile-first)
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Champ texte standard" hint="Hauteur minimale 48 px">
            <Input placeholder="Ngaoundéré FC" />
          </Field>
          <Field label="Liste déroulante">
            <Select>
              <option>Elite Two</option>
              <option>Coupe du Cameroun</option>
            </Select>
          </Field>
        </div>

        <div className="grid items-center gap-4 sm:grid-cols-2">
          <NumberStepper label="Stepper de score en direct" value={stepperVal} onChange={setStepperVal} />
          <Switch
            checked={switchVal}
            onChange={setSwitchVal}
            label="Interrupteur tactile"
            description="Remplace les cases à cocher trop petites sur téléphone."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <SegmentedControl
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'A', label: 'Tous', count: 12 },
              { value: 'B', label: 'En direct', count: 1 },
              { value: 'C', label: 'Terminés', count: 11 },
            ]}
          />
          <Button variant="secondary" onClick={() => setSheetOpen(true)}>
            Ouvrir un tiroir (SheetDialog)
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Tester ConfirmDialog
          </Button>
        </div>
      </section>

      {/* États de données DataState */}
      <section className="space-y-4 nfc-card p-5">
        <h2 className="font-display text-xl font-bold uppercase">
          4. États de données (`DataState`)
        </h2>
        <div className="flex flex-wrap gap-2">
          {(
            [
              'ready',
              'loading',
              'empty',
              'stale',
              'partial',
              'offline',
              'error',
              'forbidden',
              'conflict',
              'unavailable_feature',
            ] as DataStateKind[]
          ).map((st) => (
            <Button
              key={st}
              size="sm"
              variant={dataStateKind === st ? 'primary' : 'secondary'}
              onClick={() => setDataStateKind(st)}
            >
              {st}
            </Button>
          ))}
        </div>

        <DataState
          state={dataStateKind}
          updatedAt={new Date().toISOString()}
          partialSources={['Classement', 'Actualités']}
          onRetry={() => setDataStateKind('ready')}
          onResolveKeepLocal={() => setDataStateKind('ready')}
          onResolveUseServer={() => setDataStateKind('ready')}
        >
          <div className="rounded-xl bg-[var(--nfc-input-bg)] p-4 text-sm">
            Contenu affiché lorsque l’état est <strong>ready</strong>, <strong>stale</strong> ou <strong>partial</strong>.
          </div>
        </DataState>
      </section>

      <SheetDialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Exemple de tiroir mobile / modale"
        description="S’affiche en bottom-sheet sur mobile et en modale centrée sur grand écran."
      >
        <p className="text-sm text-[var(--nfc-muted)]">
          Contenu du tiroir avec prise en charge de la touche Échap et du focus clavier.
        </p>
      </SheetDialog>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => setConfirmOpen(false)}
        title="Confirmer la suppression ?"
        description="Remplace tous les appels natifs window.confirm."
      />
    </main>
  );
}
