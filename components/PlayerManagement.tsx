'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type PlayerRecord = {
  id: string;
  firstName: string;
  lastName: string;
  number: number | null;
  position: string | null;
  isCaptain: boolean;
};

const positions = ['GARDIEN', 'DEFENSEUR', 'MILIEU', 'ATTAQUANT'] as const;

export function PlayerManagement({ players, canWrite }: { players: PlayerRecord[]; canWrite: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const optionalNumber = (name: string) => form.get(name) === '' ? null : Number(form.get(name));
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/site/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.get('firstName'),
          lastName: form.get('lastName'),
          number: optionalNumber('number'),
          position: form.get('position') || null,
          nationality: form.get('nationality') || null,
          photoId: form.get('photoId') || null,
          isCaptain: form.get('isCaptain') === 'on',
          birthDate: null,
          height: null,
          weight: null,
          joinedYear: null,
          bio: null,
          stats: null,
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? 'Création impossible.');
      formElement.reset();
      setMessage('Joueur ajouté.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Création impossible.');
    } finally {
      setPending(false);
    }
  }

  async function editNumber(player: PlayerRecord, number: number | null) {
    const response = await fetch(`/api/site/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number }),
    });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) setMessage(result.message ?? 'Modification impossible.');
    else router.refresh();
  }

  async function toggleCaptain(player: PlayerRecord) {
    const response = await fetch(`/api/site/players/${player.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isCaptain: !player.isCaptain }),
    });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) setMessage(result.message ?? 'Modification impossible.');
    else router.refresh();
  }

  async function archive(player: PlayerRecord) {
    if (!window.confirm(`Supprimer définitivement ${player.firstName} ${player.lastName} ?`)) return;
    const response = await fetch(`/api/site/players/${player.id}`, { method: 'DELETE' });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) setMessage(result.message ?? 'Suppression impossible.');
    else router.refresh();
  }

  return (
    <div className="space-y-6">
      {message && <p className="rounded-lg bg-gray-100 p-3 text-sm" role="status">{message}</p>}
      {canWrite && <form className="grid gap-3 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4" onSubmit={create}>
        <label className="text-sm font-semibold">Prénom<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="firstName" required /></label>
        <label className="text-sm font-semibold">Nom<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="lastName" required /></label>
        <label className="text-sm font-semibold">Numéro<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="number" type="number" min="0" inputMode="numeric" /></label>
        <label className="text-sm font-semibold">Poste<select className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="position"><option value="">Non renseigné</option>{positions.map((position) => <option key={position}>{position}</option>)}</select></label>
        <label className="text-sm font-semibold">Nationalité<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="nationality" /></label>
        <label className="text-sm font-semibold">ID photo (Media)<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="photoId" /></label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" name="isCaptain" /> Capitaine</label>
        <button className="min-h-12 rounded-lg bg-nfc-green px-4 font-bold text-white disabled:opacity-60" disabled={pending}>{pending ? 'Ajout…' : 'Ajouter le joueur'}</button>
      </form>}
      <section className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-gray-50 text-gray-600"><tr><th className="p-4">Joueur</th><th className="p-4">Poste</th><th className="p-4">Numéro</th><th className="p-4">Actions</th></tr></thead>
          <tbody className="divide-y">
            {players.map((player) => (
              <tr key={player.id}>
                <td className="p-4 font-semibold">{player.firstName} {player.lastName}{player.isCaptain ? ' · Capitaine' : ''}</td>
                <td className="p-4">{player.position ?? 'Non renseigné'}</td>
                <td className="p-4"><input disabled={!canWrite} aria-label={`Numéro ${player.firstName} ${player.lastName}`} className="min-h-11 w-20 rounded border px-2 text-center" type="number" min="0" defaultValue={player.number ?? ''} onBlur={(event) => editNumber(player, event.target.value === '' ? null : Number(event.target.value))} /></td>
                <td className="space-x-3 p-4">{canWrite && <><button className="font-semibold text-nfc-green underline" onClick={() => toggleCaptain(player)}>{player.isCaptain ? 'Retirer capitaine' : 'Nommer capitaine'}</button><button className="font-semibold text-red-800 underline" onClick={() => archive(player)}>Retirer</button></>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!players.length && <p className="p-5 text-gray-600">Aucun joueur enregistré.</p>}
      </section>
    </div>
  );
}
