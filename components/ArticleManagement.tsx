'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

type ArticleRecord = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  category: string | null;
  published: boolean;
  publishedAt: string | null;
};

export function ArticleManagement({ articles, canWrite }: { articles: ArticleRecord[]; canWrite: boolean }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setMessage('');
    try {
      const response = await fetch('/api/site/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'),
          slug: form.get('slug') || String(form.get('title')).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
          summary: form.get('summary') || null,
          content: form.get('content'),
          category: form.get('category') || null,
          coverId: null,
          videoUrl: null,
          published: form.get('published') === 'on',
        }),
      });
      const result = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? 'Création impossible.');
      formElement.reset();
      setMessage('Actualité créée.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Création impossible.');
    } finally {
      setPending(false);
    }
  }

  async function setPublished(article: ArticleRecord) {
    const response = await fetch(`/api/site/articles/${article.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: !article.published }),
    });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) {
      setMessage(result.message ?? 'Modification impossible.');
      return;
    }
    router.refresh();
  }

  async function archive(article: ArticleRecord) {
    if (!window.confirm(`Supprimer définitivement « ${article.title} » ?`)) return;
    const response = await fetch(`/api/site/articles/${article.id}`, { method: 'DELETE' });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) {
      setMessage(result.message ?? 'Archivage impossible.');
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {canWrite && <form className="grid gap-3 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2" onSubmit={create}>
        <label className="text-sm font-semibold">Titre<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="title" maxLength={180} required /></label>
        <label className="text-sm font-semibold">Slug (facultatif, généré depuis le titre)<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="slug" maxLength={180} /></label>
        <label className="text-sm font-semibold">Catégorie<input className="mt-1 min-h-12 w-full rounded border px-3 font-normal" name="category" maxLength={80} /></label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm font-semibold"><input type="checkbox" name="published" /> Publier immédiatement</label>
        <label className="text-sm font-semibold sm:col-span-2">Résumé<textarea className="mt-1 min-h-20 w-full rounded border p-3 font-normal" name="summary" maxLength={1000} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Contenu (texte brut, format actuellement rendu par le site)
          <textarea className="mt-1 min-h-48 w-full rounded border p-3 font-normal" name="content" required />
        </label>
        <button className="min-h-12 rounded-lg bg-nfc-green px-4 font-bold text-white disabled:opacity-60 sm:col-span-2" disabled={pending}>{pending ? 'Création…' : 'Créer l’actualité'}</button>
        {message && <p className="text-sm text-gray-700 sm:col-span-2" role="status">{message}</p>}
      </form>}
      <section className="space-y-3">
        {articles.map((article) => (
          <article className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-sm" key={article.id}>
            <div><h2 className="font-bold">{article.title}</h2><p className="text-sm text-gray-600">/{article.slug} · {article.published ? 'Publié' : 'Brouillon'}{article.category ? ` · ${article.category}` : ''}</p></div>
            {canWrite && <div className="flex gap-2"><button className="rounded border px-3 py-2 text-sm font-semibold" onClick={() => setPublished(article)}>{article.published ? 'Retirer de la publication' : 'Publier'}</button><button className="rounded border border-red-300 px-3 py-2 text-sm text-red-800" onClick={() => archive(article)}>Supprimer</button></div>}
          </article>
        ))}
        {!articles.length && <p className="rounded-xl bg-white p-5 text-gray-600">Aucune actualité ni brouillon enregistré.</p>}
      </section>
    </div>
  );
}
