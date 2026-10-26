'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type AdminMatch = {
  id: string;
  date: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  stadium: string | null;
  competition: string | null;
  status: string;
  summary: string | null;
};

const statuses = ['PROGRAMME', 'EN_COURS', 'TERMINE', 'REPORTE', 'ANNULE'] as const;

export function MatchManagement({ matches, canWrite }: { matches: AdminMatch[]; canWrite: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function save(id: string | null, fields: Record<string, unknown>) {
    const response = await fetch(id ? `/api/site/matches/${id}` : '/api/site/matches', {
      method: id ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) throw new Error(result.message ?? 'Enregistrement impossible.');
    router.refresh();
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const values = Object.fromEntries(new FormData(formElement).entries());
    setPending(true);
    setMessage('');
    try {
      await save(null, {
        ...values,
        date: new Date(String(values.date)).toISOString(),
        homeScore: values.homeScore === '' ? null : Number(values.homeScore),
        awayScore: values.awayScore === '' ? null : Number(values.awayScore),
      });
      formElement.reset();
      setMessage('Match créé.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible de créer le match.');
    } finally {
      setPending(false);
    }
  }

  async function update(match: AdminMatch, fields: Record<string, unknown>) {
    setMessage('');
    try {
      await save(match.id, fields);
      setMessage('Match mis à jour.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Impossible de mettre à jour le match.');
    }
  }

  async function remove(match: AdminMatch) {
    if (!window.confirm(`Supprimer définitivement le match ${match.homeTeam} – ${match.awayTeam} ?`)) return;
    const response = await fetch(`/api/site/matches/${match.id}`, { method: 'DELETE' });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) {
      setMessage(result.message ?? 'Suppression impossible.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {message && <p className="rounded-lg bg-gray-100 p-3 text-sm" role="status">{message}</p>}
      {canWrite && <form className="grid gap-3 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4" onSubmit={create}>
        <label className="text-sm font-semibold">Date et heure<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" type="datetime-local" name="date" required /></label>
        <label className="text-sm font-semibold">Équipe domicile<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="homeTeam" required /></label>
        <label className="text-sm font-semibold">Équipe extérieur<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="awayTeam" required /></label>
        <label className="text-sm font-semibold">Compétition<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="competition" /></label>
        <label className="text-sm font-semibold">Stade<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="stadium" /></label>
        <label className="text-sm font-semibold">Statut<select className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="status">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        <button className="min-h-12 self-end rounded-lg bg-nfc-green px-4 font-bold text-white disabled:opacity-60" disabled={pending}>Créer le match</button>
      </form>}
      <div className="space-y-3">
        {matches.map((match) => (
          <article className="rounded-xl bg-white p-4 shadow-sm sm:p-5" key={match.id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{match.homeTeam} – {match.awayTeam}</h2>
                <p className="text-sm text-gray-600">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Douala' }).format(new Date(match.date))}{match.stadium ? ` · ${match.stadium}` : ''}</p>
              </div>
              {canWrite && <button className="rounded border border-red-300 px-3 py-2 text-sm text-red-800" onClick={() => remove(match)}>Supprimer</button>}
            </div>
            {!canWrite && <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">L’API publique exige un rôle éditeur pour modifier les matchs.</p>}
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_1fr_auto] sm:items-end">
              <label className="text-xs font-semibold text-gray-600">Statut
                <select disabled={!canWrite} aria-label={`Statut ${match.homeTeam} – ${match.awayTeam}`} className="mt-1 min-h-11 w-full rounded border px-2 text-base font-normal" defaultValue={match.status} onChange={(event) => update(match, { status: event.target.value })}>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-600">Score domicile
                <input disabled={!canWrite} aria-label="Score domicile" className="mt-1 min-h-14 w-full rounded border text-center text-2xl font-bold" type="number" min="0" inputMode="numeric" defaultValue={match.homeScore ?? ''} onBlur={(event) => update(match, { homeScore: event.target.value === '' ? null : Number(event.target.value) })} />
              </label>
              <span className="pb-3 text-center text-xl font-bold">:</span>
              <label className="text-xs font-semibold text-gray-600">Score extérieur
                <input disabled={!canWrite} aria-label="Score extérieur" className="mt-1 min-h-14 w-full rounded border text-center text-2xl font-bold" type="number" min="0" inputMode="numeric" defaultValue={match.awayScore ?? ''} onBlur={(event) => update(match, { awayScore: event.target.value === '' ? null : Number(event.target.value) })} />
              </label>
              <span className="pb-3 text-sm text-gray-600">{match.competition ?? ''}</span>
            </div>
            {match.summary && <p className="mt-3 text-sm text-gray-700">{match.summary}</p>}
          </article>
        ))}
        {!matches.length && <p className="rounded-xl bg-white p-5 text-gray-600">Aucun match enregistré. Utilisez le formulaire pour en créer un.</p>}
      </div>
    </div>
  );
}
