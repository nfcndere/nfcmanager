'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Globe, Save, Settings } from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import { siteRequest } from '@/lib/api/client';
import type { ClubSettingsMap } from '@/lib/api/schemas';
import { DataState } from '@/components/DataState';
import { Button, Field, Input, StatusBadge, Textarea } from '@/components/ui';
import { useAppContext } from '@/components/providers/AppProviders';
import { AuthDiagPanel } from '@/components/AuthDiagPanel';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function SettingsManagement({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const { notify } = useAppContext();

  const settingsQuery = useSiteQuery<ClubSettingsMap>(
    ['settings'],
    'settings',
    { isEmpty: () => false },
  );
  const pushConfigQuery = useSiteQuery<{ enabled: boolean; publicKey: string | null }>(
    ['push-config'],
    'push/subscribe',
    { isEmpty: () => false },
  );

  const [prevData, setPrevData] = useState<ClubSettingsMap | undefined>(undefined);
  const [facebookUrl, setFacebookUrl] = useState('');
  const [whatsappPartenaire, setWhatsappPartenaire] = useState('');
  const [whatsappBilletterie, setWhatsappBilletterie] = useState('');
  const [homeIntroText, setHomeIntroText] = useState('');
  const [academyCompletionRate, setAcademyCompletionRate] = useState('');
  const [academyGraduates, setAcademyGraduates] = useState('');
  const [academyLabel, setAcademyLabel] = useState('');
  const [saving, setSaving] = useState(false);

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPending, setPushPending] = useState(false);

  if (settingsQuery.data && settingsQuery.data !== prevData) {
    const data = settingsQuery.data;
    setPrevData(data);
    setFacebookUrl(String(data.facebookUrl ?? ''));
    setWhatsappPartenaire(String(data.whatsappPartenaire ?? ''));
    setWhatsappBilletterie(String(data.whatsappBilletterie ?? ''));
    setHomeIntroText(String(data.homeIntroText ?? ''));
    setAcademyCompletionRate(
      data.academyCompletionRate !== null && data.academyCompletionRate !== undefined
        ? String(data.academyCompletionRate)
        : '',
    );
    setAcademyGraduates(
      data.academyGraduates !== null && data.academyGraduates !== undefined
        ? String(data.academyGraduates)
        : '',
    );
    setAcademyLabel(String(data.academyLabel ?? ''));
  }

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    void navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => setPushSubscribed(Boolean(sub))),
    );
  }, []);

  async function handleSaveSettings(event: FormEvent) {
    event.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    try {
      await siteRequest('settings', {
        method: 'PUT',
        body: {
          facebookUrl: facebookUrl.trim() || null,
          whatsappPartenaire: whatsappPartenaire.trim() || null,
          whatsappBilletterie: whatsappBilletterie.trim() || null,
          homeIntroText: homeIntroText.trim() || null,
          academyCompletionRate:
            academyCompletionRate === '' ? null : Number(academyCompletionRate),
          academyGraduates:
            academyGraduates === '' ? null : Number(academyGraduates),
          academyLabel: academyLabel.trim() || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      notify({ title: 'Paramètres du site enregistrés.', tone: 'success' });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Enregistrement impossible.',
        tone: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      notify({
        title: 'Votre navigateur ne prend pas en charge les notifications Web Push.',
        tone: 'warning',
      });
      return;
    }

    setPushPending(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await siteRequest('push/subscribe', {
          method: 'DELETE',
          body: { endpoint: existing.endpoint },
        });
        await existing.unsubscribe();
        setPushSubscribed(false);
        notify({ title: 'Notifications Push désactivées sur cet appareil.', tone: 'info' });
      } else {
        const publicKey = pushConfigQuery.data?.publicKey;
        if (!publicKey) {
          notify({
            title: 'Clés VAPID non configurées côté nfcwebsite.',
            description: 'Ajoutez VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY sur Vercel pour activer le Push.',
            tone: 'warning',
          });
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          notify({ title: 'Permission de notification refusée.', tone: 'warning' });
          return;
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        const json = sub.toJSON();
        await siteRequest('push/subscribe', {
          method: 'POST',
          body: {
            endpoint: json.endpoint,
            keys: json.keys,
            userAgent: navigator.userAgent,
          },
        });
        setPushSubscribed(true);
        notify({ title: 'Notifications Push activées sur cet appareil !', tone: 'success' });
      }
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Impossible de configurer les notifications.',
        tone: 'error',
      });
    } finally {
      setPushPending(false);
    }
  }

  return (
    <DataState
      state={settingsQuery.state}
      errorMessage={settingsQuery.errorMessage}
      updatedAt={settingsQuery.updatedAt}
      onRetry={() => void settingsQuery.refetch()}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-5 shadow-2xs lg:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <Settings className="h-5 w-5 text-[var(--nfc-green)]" />
              <div>
                <h2 className="font-heading text-lg font-bold uppercase tracking-wide">
                  Réglages publics du site (ClubSetting)
                </h2>
                <p className="text-xs text-[var(--nfc-muted)]">
                  Ces valeurs alimentent la page d’accueil, la billetterie et la page Académie de nfcwebsite.
                </p>
              </div>
            </div>
            {!isAdmin && <StatusBadge tone="warning">Lecture seule (ADMIN requis)</StatusBadge>}
          </div>

          <form onSubmit={handleSaveSettings} className="mt-5 space-y-4">
            <Field label="Texte d’introduction de la page d’accueil (homeIntroText)">
              <Textarea
                rows={3}
                value={homeIntroText}
                onChange={(e) => setHomeIntroText(e.target.value)}
                disabled={!isAdmin}
                placeholder="Fierté de l’Adamaoua, le Ngaoundéré Football Club..."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Page Facebook officielle (URL)">
                <Input
                  type="url"
                  value={facebookUrl}
                  onChange={(e) => setFacebookUrl(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="https://facebook.com/..."
                />
              </Field>
              <Field label="WhatsApp Partenariats" hint="Ex: 237690000000">
                <Input
                  value={whatsappPartenaire}
                  onChange={(e) => setWhatsappPartenaire(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="2376..."
                />
              </Field>
              <Field label="WhatsApp Billetterie" hint="Ex: 237690000000">
                <Input
                  value={whatsappBilletterie}
                  onChange={(e) => setWhatsappBilletterie(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="2376..."
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-input-bg)] p-4">
              <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-bold uppercase tracking-wide">
                <Globe className="h-4 w-4 text-[var(--nfc-green)]" />
                Indicateurs publics de l’Académie
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Label Académie (academyLabel)">
                  <Input
                    value={academyLabel}
                    onChange={(e) => setAcademyLabel(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="Ex: Formation d’Excellence"
                  />
                </Field>
                <Field label="Taux de réussite % (0-100)">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={academyCompletionRate}
                    onChange={(e) => setAcademyCompletionRate(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="92"
                  />
                </Field>
                <Field label="Jeunes formés (academyGraduates)">
                  <Input
                    type="number"
                    min={0}
                    value={academyGraduates}
                    onChange={(e) => setAcademyGraduates(e.target.value)}
                    disabled={!isAdmin}
                    placeholder="45"
                  />
                </Field>
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end border-t border-[var(--nfc-border)] pt-4">
                <Button type="submit" loading={saving}>
                  <Save className="h-4 w-4" />
                  Enregistrer les réglages
                </Button>
              </div>
            )}
          </form>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] p-5 shadow-2xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-[var(--nfc-green)]" />
                <h2 className="font-heading text-lg font-bold uppercase tracking-wide">
                  Notifications Push
                </h2>
              </div>
              <StatusBadge tone={pushSubscribed ? 'success' : 'neutral'}>
                {pushSubscribed ? 'Activées' : 'Inactives'}
              </StatusBadge>
            </div>
            <p className="mt-2 text-xs text-[var(--nfc-muted)]">
              Recevez une alerte immédiate sur votre téléphone à chaque nouvelle candidature Académie ou message reçu.
            </p>

            {pushConfigQuery.data && !pushConfigQuery.data.enabled && (
              <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                Fonction en attente des clés `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` sur l’hébergement de nfcwebsite.
              </p>
            )}

            <div className="mt-4">
              <Button
                type="button"
                variant={pushSubscribed ? 'secondary' : 'primary'}
                loading={pushPending}
                onClick={() => void handleTogglePush()}
                className="w-full"
              >
                {pushSubscribed ? (
                  <>
                    <BellOff className="h-4 w-4" />
                    Désactiver sur cet appareil
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" />
                    Activer les notifications Push
                  </>
                )}
              </Button>
            </div>
          </section>

          <AuthDiagPanel autoRun={false} />
        </div>
      </div>
    </DataState>
  );
}
