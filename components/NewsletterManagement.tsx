'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Download, Mail, RefreshCw, Send, Users } from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import { siteRequest } from '@/lib/api/client';
import type { EmailLogRecord, NewsletterSubscriberRecord } from '@/lib/api/schemas';
import { DataState } from '@/components/DataState';
import {
  Button,
  Field,
  Input,
  SegmentedControl,
  SheetDialog,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { useAppContext } from '@/components/providers/AppProviders';
import { formatDoualaDate } from '@/lib/format';

export function NewsletterManagement({ canWrite }: { canWrite: boolean }) {
  const queryClient = useQueryClient();
  const { notify } = useAppContext();

  const subscribersQuery = useSiteQuery<NewsletterSubscriberRecord[]>(
    ['newsletter'],
    'newsletter',
  );
  const emailsQuery = useSiteQuery<EmailLogRecord[]>(['emails'], 'emails');

  const [tab, setTab] = useState<'SUBSCRIBERS' | 'LOGS'>('SUBSCRIBERS');
  const [search, setSearch] = useState('');

  const [sendSheetOpen, setSendSheetOpen] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const subscribers = useMemo(
    () => subscribersQuery.data ?? [],
    [subscribersQuery.data],
  );
  const emailLogs = useMemo(() => emailsQuery.data ?? [], [emailsQuery.data]);

  const filteredSubscribers = useMemo(() => {
    if (!search.trim()) return subscribers;
    const q = search.toLowerCase();
    return subscribers.filter((s) => s.email.toLowerCase().includes(q));
  }, [subscribers, search]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return emailLogs;
    const q = search.toLowerCase();
    return emailLogs.filter(
      (l) =>
        l.recipient.toLowerCase().includes(q) || l.subject.toLowerCase().includes(q),
    );
  }, [emailLogs, search]);

  async function handleSendEmail(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    setSending(true);
    try {
      await siteRequest('emails', {
        method: 'POST',
        body: {
          recipient: recipient.trim(),
          subject: subject.trim(),
          message: message.trim(),
        },
      });
      setSendSheetOpen(false);
      setRecipient('');
      setSubject('');
      setMessage('');
      await queryClient.invalidateQueries({ queryKey: ['emails'] });
      notify({ title: 'E-mail envoyé avec succès.', tone: 'success' });
    } catch (error) {
      notify({
        title:
          error instanceof Error
            ? error.message
            : 'Envoi impossible (vérifiez la configuration Resend sur nfcwebsite).',
        tone: 'error',
      });
    } finally {
      setSending(false);
    }
  }

  function openResend(log: EmailLogRecord) {
    setRecipient(log.recipient);
    setSubject(log.subject);
    setMessage('');
    setSendSheetOpen(true);
  }

  function exportSubscribersCsv() {
    if (subscribers.length === 0) return;
    const csv = `\uFEFFEmail,Actif,Date inscription\n${subscribers
      .map((s) => `"${s.email}","${s.active ? 'OUI' : 'NON'}","${s.createdAt}"`)
      .join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nfc-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'SUBSCRIBERS', label: 'Abonnés Newsletter', count: subscribers.length },
            { value: 'LOGS', label: 'Journal d’e-mails', count: emailLogs.length },
          ]}
        />

        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Rechercher un e-mail, sujet…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-56"
          />
          {tab === 'SUBSCRIBERS' && (
            <Button
              type="button"
              variant="secondary"
              onClick={exportSubscribersCsv}
              disabled={subscribers.length === 0}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          )}
          {canWrite && (
            <Button type="button" onClick={() => setSendSheetOpen(true)}>
              <Send className="h-4 w-4" />
              Envoyer un e-mail
            </Button>
          )}
        </div>
      </div>

      {tab === 'SUBSCRIBERS' ? (
        <DataState
          state={subscribersQuery.state}
          errorMessage={subscribersQuery.errorMessage}
          updatedAt={subscribersQuery.updatedAt}
          onRetry={() => void subscribersQuery.refetch()}
          emptyTitle="Aucun abonné à la newsletter"
          emptyDescription="Les supporters inscrits depuis le pied de page du site officiel apparaîtront ici."
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSubscribers.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between gap-3 nfc-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-semibold">{sub.email}</p>
                  <p className="mt-0.5 text-xs text-[var(--nfc-muted)]">
                    Inscrit le {formatDoualaDate(sub.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={sub.active ? 'success' : 'neutral'}>
                    {sub.active ? 'Actif' : 'Inactif'}
                  </StatusBadge>
                  {canWrite && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRecipient(sub.email);
                        setSubject('Information Ngaoundéré FC');
                        setMessage('');
                        setSendSheetOpen(true);
                      }}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DataState>
      ) : (
        <DataState
          state={emailsQuery.state}
          errorMessage={emailsQuery.errorMessage}
          updatedAt={emailsQuery.updatedAt}
          onRetry={() => void emailsQuery.refetch()}
          emptyTitle="Aucun e-mail dans le journal"
          emptyDescription="L’historique des e-mails transactionnels envoyés via Resend s’affiche ici."
        >
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <article
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-3 nfc-card p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge
                      tone={
                        log.status === 'SENT'
                          ? 'success'
                          : log.status === 'FAILED'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {log.status}
                    </StatusBadge>
                    <span className="font-mono text-xs font-semibold">{log.recipient}</span>
                    <span className="text-xs text-[var(--nfc-muted)]">
                      · {formatDoualaDate(log.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 font-semibold">{log.subject}</p>
                  {log.error && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Erreur : {log.error}
                    </p>
                  )}
                </div>

                {canWrite && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => openResend(log)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Renvoyer
                  </Button>
                )}
              </article>
            ))}
          </div>
        </DataState>
      )}

      <SheetDialog
        open={sendSheetOpen}
        onClose={() => setSendSheetOpen(false)}
        title="Envoyer un e-mail transactionnel"
        description="L’e-mail est expédié par nfcwebsite via Resend et consigné dans le journal."
      >
        <form onSubmit={handleSendEmail} className="space-y-4">
          <Field label="Destinataire" required>
            <Input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="candidat@example.com"
              required
            />
          </Field>
          <Field label="Objet de l’e-mail" required>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Convocation détection Académie Ngaoundéré FC"
              required
            />
          </Field>
          <Field label="Message" required>
            <Textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Bonjour, suite à votre candidature..."
              required
            />
          </Field>

          <div className="flex justify-end gap-2 border-t border-[var(--nfc-divider)] pt-4">
            <Button type="button" variant="ghost" onClick={() => setSendSheetOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={sending}>
              <Users className="h-4 w-4" />
              <Send className="h-4 w-4" />
              Envoyer
            </Button>
          </div>
        </form>
      </SheetDialog>
    </div>
  );
}
