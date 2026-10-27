'use client';

import { FormEvent, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Edit3,
  Eye,
  FileText,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
  Video,
} from 'lucide-react';
import { useSiteQuery } from '@/lib/api/use-site-query';
import { ApiClientError, siteRequest } from '@/lib/api/client';
import type { ArticleRecord, MediaRecord } from '@/lib/api/schemas';
import { DataState } from '@/components/DataState';
import {
  Button,
  ConfirmDialog,
  Field,
  Input,
  SegmentedControl,
  SheetDialog,
  StatusBadge,
  Switch,
  Textarea,
} from '@/components/ui';
import { MediaPicker } from '@/components/MediaUploader';
import { useAppContext } from '@/components/providers/AppProviders';
import { enqueueMutation } from '@/lib/offline-queue';
import { formatDoualaDate, slugify } from '@/lib/format';

function ArticleManagementInner({ canWrite }: { canWrite: boolean }) {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { online, notify, refreshOfflineQueue } = useAppContext();

  const articlesQuery = useSiteQuery<ArticleRecord[]>(
    ['articles', 'all'],
    'articles?status=all&limit=100',
  );

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');
  const [search, setSearch] = useState('');

  // Modale création / édition
  const [sheetOpen, setSheetOpen] = useState(() =>
    Boolean(searchParams.get('nouveau') === '1' && canWrite),
  );
  const [editingArticle, setEditingArticle] = useState<ArticleRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [editorTab, setEditorTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [pickerOpen, setPickerOpen] = useState(false);

  // Champs contrôlés
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [category, setCategory] = useState('Club');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [coverId, setCoverId] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [published, setPublished] = useState(false);

  // Suppression
  const [deletingArticle, setDeletingArticle] = useState<ArticleRecord | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const openCreate = () => {
    setEditingArticle(null);
    setTitle('');
    setSlug('');
    setSlugManuallyEdited(false);
    setCategory('Club');
    setSummary('');
    setContent('');
    setVideoUrl('');
    setCoverId(null);
    setCoverPreviewUrl(null);
    setPublished(false);
    setEditorTab('EDIT');
    setSheetOpen(true);
  };

  const openEdit = (article: ArticleRecord) => {
    setEditingArticle(article);
    setTitle(article.title);
    setSlug(article.slug);
    setSlugManuallyEdited(true);
    setCategory(article.category ?? 'Club');
    setSummary(article.summary ?? '');
    setContent(article.content);
    setVideoUrl(article.videoUrl ?? '');
    setCoverId(article.coverId ?? null);
    setCoverPreviewUrl(article.cover?.url ?? null);
    setPublished(Boolean(article.published));
    setEditorTab('EDIT');
    setSheetOpen(true);
  };

  const articles = useMemo(() => articlesQuery.data ?? [], [articlesQuery.data]);

  const filteredArticles = useMemo(() => {
    return articles
      .filter((a) => {
        if (statusFilter === 'PUBLISHED') return a.published;
        if (statusFilter === 'DRAFT') return !a.published;
        return true;
      })
      .filter((a) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.slug.toLowerCase().includes(q) ||
          (a.category ?? '').toLowerCase().includes(q)
        );
      });
  }, [articles, statusFilter, search]);

  const slugConflict = useMemo(() => {
    if (!slug.trim()) return false;
    return articles.some(
      (a) => a.slug.toLowerCase() === slug.trim().toLowerCase() && a.id !== editingArticle?.id,
    );
  }, [articles, slug, editingArticle]);

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);
    if (!slugManuallyEdited) {
      setSlug(slugify(nextTitle));
    }
  };

  async function handleSaveArticle(event: FormEvent) {
    event.preventDefault();
    if (!canWrite) return;
    if (slugConflict) {
      notify({
        title: 'Ce slug est déjà utilisé par un autre article.',
        description: 'Modifiez le slug pour le rendre unique.',
        tone: 'error',
      });
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      slug: slug.trim() || slugify(title),
      category: category.trim() || null,
      summary: summary.trim() || null,
      content: content.trim(),
      videoUrl: videoUrl.trim() || null,
      coverId: coverId || null,
      published,
    };

    const queueDraftOffline = async () => {
      await enqueueMutation({
        type: 'article_draft',
        label: `Brouillon actualité « ${payload.title} »`,
        endpoint: editingArticle ? `articles/${editingArticle.id}` : 'articles',
        method: editingArticle ? 'PATCH' : 'POST',
        payload: { ...payload, published: false },
        entityEndpoint: editingArticle ? `articles/${editingArticle.id}` : undefined,
        expectedUpdatedAt: editingArticle?.updatedAt,
      });
      await refreshOfflineQueue();
      setSheetOpen(false);
      notify({
        title: 'Brouillon enregistré hors ligne',
        description: 'Il sera envoyé au site officiel dès le retour de la connexion.',
        tone: 'warning',
      });
    };

    if (!online) {
      await queueDraftOffline();
      setSaving(false);
      return;
    }

    try {
      if (editingArticle) {
        await siteRequest(`articles/${editingArticle.id}`, {
          method: 'PATCH',
          body: payload,
        });
        notify({ title: 'Actualité mise à jour.', tone: 'success' });
      } else {
        await siteRequest('articles', {
          method: 'POST',
          body: payload,
        });
        notify({
          title: published ? 'Actualité publiée sur le site !' : 'Brouillon enregistré.',
          tone: 'success',
        });
      }
      setSheetOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['articles'] });
    } catch (error) {
      if (error instanceof ApiClientError && error.kind === 'offline') {
        await queueDraftOffline();
      } else {
        notify({
          title: error instanceof Error ? error.message : 'Impossible d’enregistrer l’actualité.',
          tone: 'error',
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deletingArticle) return;
    const target = deletingArticle;
    setDeletePending(true);
    try {
      await siteRequest(`articles/${target.id}`, { method: 'DELETE' });
      setDeletingArticle(null);
      await queryClient.invalidateQueries({ queryKey: ['articles'] });
      notify({
        title: `Article « ${target.title} » supprimé.`,
        tone: 'info',
        actionLabel: 'Annuler (5s)',
        onAction: async () => {
          await siteRequest(`articles/${target.id}`, {
            method: 'PATCH',
            body: { restore: true },
          });
          await queryClient.invalidateQueries({ queryKey: ['articles'] });
          notify({ title: 'Article restauré.', tone: 'success' });
        },
      });
    } catch (error) {
      notify({
        title: error instanceof Error ? error.message : 'Suppression impossible.',
        tone: 'error',
      });
    } finally {
      setDeletePending(false);
    }
  }

  const handleSelectCover = (media: MediaRecord) => {
    setCoverId(media.id);
    setCoverPreviewUrl(media.url);
    setPickerOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: 'ALL', label: 'Tous', count: articles.length },
            {
              value: 'PUBLISHED',
              label: 'Publiés',
              count: articles.filter((a) => a.published).length,
            },
            {
              value: 'DRAFT',
              label: 'Brouillons',
              count: articles.filter((a) => !a.published).length,
            },
          ]}
        />

        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Rechercher un titre, catégorie…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:w-64"
          />
          {canWrite && (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Nouvelle actualité
            </Button>
          )}
        </div>
      </div>

      <DataState
        state={articlesQuery.state}
        errorMessage={articlesQuery.errorMessage}
        updatedAt={articlesQuery.updatedAt}
        onRetry={() => void articlesQuery.refetch()}
        emptyTitle="Aucune actualité"
        emptyDescription="Rédigez des articles, communiqués et comptes-rendus de matchs pour informer les supporters."
        emptyAction={
          canWrite ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Rédiger un article
            </Button>
          ) : undefined
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {filteredArticles.map((article) => (
            <article
              key={article.id}
              className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-card)] shadow-2xs"
            >
              <div>
                {article.cover?.url && (
                  <div className="relative aspect-video w-full overflow-hidden bg-[var(--nfc-input-bg)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={article.cover.url}
                      alt={article.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--nfc-green)] dark:text-[var(--nfc-yellow)]">
                      {article.category || 'Actualité'}
                    </span>
                    <StatusBadge tone={article.published ? 'success' : 'warning'}>
                      {article.published ? 'Publié' : 'Brouillon'}
                    </StatusBadge>
                  </div>

                  <h3 className="mt-2 font-heading text-lg font-bold leading-snug">
                    {article.title}
                  </h3>
                  <p className="mt-1 font-mono text-xs text-[var(--nfc-muted)]">/{article.slug}</p>

                  {article.summary && (
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--nfc-muted)]">
                      {article.summary}
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-[var(--nfc-border)] px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-[var(--nfc-muted)]">
                    {article.publishedAt
                      ? `Publié le ${formatDoualaDate(article.publishedAt)}`
                      : `Modifié le ${formatDoualaDate(article.updatedAt)}`}
                  </span>

                  {canWrite && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => openEdit(article)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingArticle(article)}
                        className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </DataState>

      <SheetDialog
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editingArticle ? 'Modifier l’actualité' : 'Rédiger une nouvelle actualité'}
        description="Basculez sur « Aperçu public » pour vérifier le rendu tel qu’il apparaît sur nfcwebsite."
      >
        <div className="mb-4 flex items-center justify-between">
          <SegmentedControl
            value={editorTab}
            onChange={setEditorTab}
            options={[
              { value: 'EDIT', label: 'Édition' },
              { value: 'PREVIEW', label: 'Aperçu public' },
            ]}
          />
          <StatusBadge tone={published ? 'success' : 'warning'}>
            {published ? 'Sera publié' : 'Brouillon'}
          </StatusBadge>
        </div>

        {editorTab === 'PREVIEW' ? (
          <div className="space-y-4 rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-input-bg)] p-5">
            {coverPreviewUrl && (
              <div className="aspect-video overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreviewUrl} alt={title} className="h-full w-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--nfc-green)]">
              <span>{category || 'Actualité'}</span>
              <span>·</span>
              <span>{formatDoualaDate(new Date().toISOString())}</span>
            </div>
            <h2 className="font-heading text-2xl font-bold">{title || 'Titre de l’article'}</h2>
            {summary && (
              <p className="border-l-4 border-[var(--nfc-green)] pl-3 text-sm font-semibold text-[var(--nfc-muted)]">
                {summary}
              </p>
            )}
            <div className="space-y-3 text-sm leading-relaxed whitespace-pre-line">
              {content || 'Le contenu de l’article s’affichera ici…'}
            </div>
            <div className="pt-3">
              <Button type="button" size="sm" variant="secondary" onClick={() => setEditorTab('EDIT')}>
                Retour à l’édition
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSaveArticle} className="space-y-4">
            {/* Image de couverture */}
            <div className="flex items-center gap-4 rounded-2xl border border-[var(--nfc-border)] bg-[var(--nfc-input-bg)] p-3.5">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--nfc-card)]">
                {coverPreviewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreviewUrl} alt="Couverture" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--nfc-muted)]">
                    <FileText className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold">Image de couverture</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setPickerOpen(true)}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    {coverId ? 'Changer d’image' : 'Choisir / Téléverser'}
                  </Button>
                  {coverId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCoverId(null);
                        setCoverPreviewUrl(null);
                      }}
                    >
                      Retirer
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Field label="Titre de l’actualité" required>
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Ex: Victoire précieuse du NFC à domicile (2-0)"
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Slug URL"
                required
                error={slugConflict ? 'Ce slug existe déjà.' : undefined}
                hint="Généré automatiquement, modifiable"
              >
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setSlug(slugify(e.target.value));
                  }}
                  required
                />
              </Field>
              <Field label="Catégorie">
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Club, Matchs, Académie, Communiqué…"
                />
              </Field>
            </div>

            <Field label="Chapeau / Résumé court">
              <Textarea
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Résumé affiché sur les cartes de la page d’accueil..."
              />
            </Field>

            <Field label="Contenu complet de l’article" required>
              <Textarea
                rows={7}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Rédigez le texte complet de l’actualité (les sauts de ligne sont préservés sur le site public)..."
                required
              />
            </Field>

            <Field label="Lien vidéo (YouTube / Facebook / Cloudinary)" hint="Optionnel">
              <div className="relative">
                <Input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                />
                <Video className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--nfc-muted)]" />
              </div>
            </Field>

            <Switch
              checked={published}
              onChange={setPublished}
              label="Publier immédiatement sur le site officiel"
              description="Désactivez pour conserver cet article en brouillon privé."
            />

            <div className="flex flex-wrap justify-between gap-2 border-t border-[var(--nfc-border)] pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditorTab('PREVIEW')}
              >
                <Eye className="h-4 w-4" />
                Aperçu
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" loading={saving}>
                  {published ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                  {editingArticle
                    ? 'Enregistrer'
                    : published
                      ? 'Publier l’article'
                      : 'Enregistrer le brouillon'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </SheetDialog>

      <SheetDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choisir l’image de couverture"
      >
        <MediaPicker selectedId={coverId} onSelect={handleSelectCover} filterType="PHOTO" />
      </SheetDialog>

      <ConfirmDialog
        open={Boolean(deletingArticle)}
        onClose={() => setDeletingArticle(null)}
        onConfirm={() => void handleDeleteConfirmed()}
        loading={deletePending}
        title="Supprimer cette actualité ?"
        description={
          deletingArticle
            ? `L’article « ${deletingArticle.title} » sera retiré du site public.`
            : ''
        }
        confirmLabel="Supprimer l’actualité"
      />
    </div>
  );
}

export function ArticleManagement({ canWrite }: { canWrite: boolean }) {
  return (
    <Suspense fallback={<DataState state="loading" />}>
      <ArticleManagementInner canWrite={canWrite} />
    </Suspense>
  );
}
