'use client';

import { ChangeEvent, DragEvent, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Film, ImagePlus, UploadCloud, X } from 'lucide-react';
import { siteRequest } from '@/lib/api/client';
import { mediaSchema, type Media } from '@/lib/api/schemas';
import { compressImageBeforeUpload } from '@/lib/image-compression';
import { useAppRuntime } from '@/components/providers/AppProviders';
import { Button, Field, Input, Select, SheetDialog } from '@/components/ui';
import { z } from 'zod';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_FALLBACK_PROXY_BYTES = 4 * 1024 * 1024;

export type UploadQueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  title: string;
  altText: string;
  album: string;
  playerId: string;
  progress: number;
  status: 'ready' | 'uploading' | 'done' | 'error';
  errorMessage?: string;
  result?: Media;
};

type SignResponse = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  folder: string;
  resourceType: 'image' | 'video';
  allowedFormats: string;
  uploadUrl: string;
};

/**
 * Téléverse un fichier en privilégiant l'envoi direct signé vers Cloudinary (`POST /api/uploads/sign`
 * puis `https://api.cloudinary.com/...` avec progression XHR, puis `POST /api/galerie`),
 * et bascule sur `POST /api/uploads` (multipart ≤ 4 Mo) si l'endpoint de signature répond 404.
 */
export async function uploadSingleMedia(
  item: {
    file: File;
    title: string;
    altText: string;
    album: string;
    playerId?: string | null;
  },
  onProgress: (pct: number) => void,
): Promise<Media> {
  const isVideo = item.file.type.startsWith('video/');
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (!item.file.type.startsWith('image/') && !isVideo) {
    throw new Error('Seuls les fichiers image et vidéo sont acceptés.');
  }
  if (item.file.size > maxBytes) {
    throw new Error(`Fichier trop volumineux (maximum ${isVideo ? '50 Mio' : '10 Mio'}).`);
  }

  const compressed = isVideo
    ? { file: item.file, wasCompressed: false, width: undefined, height: undefined }
    : await compressImageBeforeUpload(item.file);
  const targetFile = compressed.file;

  // 1. Tenter la signature d'envoi direct vers Cloudinary
  const signRes = await fetch('/api/site/uploads/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      mimeType: targetFile.type || 'image/jpeg',
      size: targetFile.size,
      resourceType: isVideo ? 'video' : 'image',
      filename: targetFile.name,
    }),
  });

  if (signRes.ok) {
    const signEnvelope = (await signRes.json()) as { data?: SignResponse };
    const signed = signEnvelope.data;
    if (!signed?.signature || !signed.uploadUrl) {
      throw new Error('Réponse de signature Cloudinary incomplète.');
    }

    const cloudinaryResult = await new Promise<{
      public_id: string;
      secure_url: string;
      width?: number;
      height?: number;
      bytes?: number;
      format?: string;
    }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append('file', targetFile);
      form.append('api_key', signed.apiKey);
      form.append('timestamp', String(signed.timestamp));
      form.append('signature', signed.signature);
      form.append('folder', signed.folder);
      if (signed.allowedFormats) form.append('allowed_formats', signed.allowedFormats);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          onProgress(Math.min(95, Math.round((ev.loaded / ev.total) * 95)));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Réponse Cloudinary invalide.'));
          }
        } else {
          reject(new Error(`Échec de l’envoi vers Cloudinary (${xhr.status}).`));
        }
      };
      xhr.onerror = () => reject(new Error('Connexion interrompue pendant l’envoi vers Cloudinary.'));
      xhr.open('POST', signed.uploadUrl);
      xhr.send(form);
    });

    const registered = await siteRequest('galerie', {
      method: 'POST',
      schema: mediaSchema,
      body: {
        provider: 'cloudinary',
        publicId: cloudinaryResult.public_id,
        url: cloudinaryResult.secure_url,
        mimeType: targetFile.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        width: cloudinaryResult.width ?? compressed.width ?? null,
        height: cloudinaryResult.height ?? compressed.height ?? null,
        size: cloudinaryResult.bytes ?? targetFile.size,
        title: item.title || targetFile.name,
        altText: item.altText || item.title || targetFile.name,
        album: item.album || 'Général',
        mediaType: isVideo ? 'VIDEO' : 'IMAGE',
        playerId: item.playerId || null,
      },
    });
    onProgress(100);
    return registered.data;
  }

  // 2. Voie de secours multipart via /api/uploads (uniquement si ≤ 4 Mo)
  if (targetFile.size > MAX_FALLBACK_PROXY_BYTES) {
    throw new Error('Fichier trop volumineux pour l’instant (limite 4 Mo tant que la signature directe est indisponible).');
  }

  const form = new FormData();
  form.append('file', targetFile);
  form.append('title', item.title || targetFile.name);
  form.append('altText', item.altText || item.title || '');
  form.append('album', item.album || 'Général');
  if (item.playerId) form.append('playerId', item.playerId);

  onProgress(35);
  const fallbackRes = await fetch('/api/site/uploads', {
    method: 'POST',
    body: form,
  });
  const fallbackJson = (await fallbackRes.json().catch(() => ({}))) as {
    message?: string;
    data?: Media;
  };
  if (!fallbackRes.ok || !fallbackJson.data) {
    throw new Error(fallbackJson.message || 'Échec du téléversement.');
  }
  onProgress(100);
  return fallbackJson.data;
}

export function MediaUploader({
  players = [],
  defaultAlbum = 'Général',
  onUploaded,
}: {
  players?: { id: string; firstName: string; lastName: string }[];
  defaultAlbum?: string;
  onUploaded?: (medias: Media[]) => void;
}) {
  const { online, notify } = useAppRuntime();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const [busy, setBusy] = useState(false);

  const addFiles = (files: FileList | File[]) => {
    const next: UploadQueueItem[] = [];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      if (!isImage && !isVideo) {
        notify({ tone: 'error', message: `Format non accepté : ${file.name}` });
        continue;
      }
      const max = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
      if (file.size > max) {
        notify({
          tone: 'error',
          message: `${file.name} dépasse la taille maximale (${isVideo ? '50 Mio' : '10 Mio'}).`,
        });
        continue;
      }
      const cleanTitle = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      next.push({
        id: `up_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        title: cleanTitle,
        altText: cleanTitle,
        album: defaultAlbum,
        playerId: '',
        progress: 0,
        status: 'ready',
      });
    }
    setItems((prev) => [...prev, ...next]);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  };

  const startUploadAll = async () => {
    if (!online) {
      notify({ tone: 'warning', message: 'Connexion requise pour téléverser des médias.' });
      return;
    }
    setBusy(true);
    const uploaded: Media[] = [];
    for (const item of items) {
      if (item.status === 'done') continue;
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, status: 'uploading', errorMessage: undefined } : it)));
      try {
        const media = await uploadSingleMedia(
          {
            file: item.file,
            title: item.title,
            altText: item.altText,
            album: item.album,
            playerId: item.playerId || null,
          },
          (progress) => {
            setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, progress } : it)));
          },
        );
        uploaded.push(media);
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'done', progress: 100, result: media } : it)),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Échec de l’envoi';
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'error', errorMessage: msg } : it)),
        );
      }
    }
    setBusy(false);
    if (uploaded.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['galerie'] });
      notify({ tone: 'success', message: `${uploaded.length} média(s) téléversé(s) avec succès.` });
      onUploaded?.(uploaded);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--nfc-divider)] bg-[var(--nfc-bg)] p-6 text-center"
      >
        <UploadCloud className="h-9 w-9 text-[var(--nfc-green)]" />
        <p className="mt-2 font-display text-sm font-bold uppercase">
          Glissez vos photos ou vidéos ici, ou utilisez votre appareil
        </p>
        <p className="mt-1 text-xs text-[var(--nfc-muted)]">
          Images ≤ 10 Mio (compressées automatiquement ≤ 2000 px) · Vidéos ≤ 50 Mio
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileChange}
          className="sr-only"
        />
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button type="button" variant="primary" onClick={() => inputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            Sélectionner des fichiers
          </Button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 nfc-card p-3 sm:grid-cols-[96px_1fr_auto]"
            >
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden bg-black/10">
                {item.file.type.startsWith('video/') ? (
                  <Film className="h-8 w-8 text-[var(--nfc-green)]" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.previewUrl} alt={item.title} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Titre">
                  <Input
                    value={item.title}
                    onChange={(e) =>
                      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, title: e.target.value } : it)))
                    }
                  />
                </Field>
                <Field label="Album">
                  <Input
                    value={item.album}
                    onChange={(e) =>
                      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, album: e.target.value } : it)))
                    }
                  />
                </Field>
                <Field label="Texte alternatif (accessibilité)">
                  <Input
                    value={item.altText}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((it) => (it.id === item.id ? { ...it, altText: e.target.value } : it)),
                      )
                    }
                  />
                </Field>
                {players.length > 0 && (
                  <Field label="Associer à un joueur (optionnel)">
                    <Select
                      value={item.playerId}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((it) => (it.id === item.id ? { ...it, playerId: e.target.value } : it)),
                        )
                      }
                    >
                      <option value="">Aucun joueur</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}
                <div className="sm:col-span-2">
                  <div className="h-2 w-full bg-gray-200 dark:bg-gray-800">
                    <div
                      className="h-full bg-[var(--nfc-green)] transition-all"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.errorMessage && (
                    <p className="mt-1 text-xs font-medium text-red-600">{item.errorMessage}</p>
                  )}
                  {item.status === 'done' && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <Check className="h-3.5 w-3.5" /> Enregistré dans la galerie
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start justify-end">
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((it) => it.id !== item.id))}
                  aria-label="Retirer ce fichier"
                  className="min-h-11 min-w-11 text-xs text-[var(--nfc-muted)] hover:text-red-600"
                >
                  <X className="mx-auto h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setItems([])}
              disabled={busy}
            >
              Vider la liste
            </Button>
            <Button
              type="button"
              variant="accent"
              onClick={startUploadAll}
              disabled={busy || !online || items.every((i) => i.status === 'done')}
            >
              {!online
                ? 'Connexion requise'
                : busy
                  ? 'Téléversement en cours…'
                  : `Téléverser (${items.filter((i) => i.status !== 'done').length})`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================================
// MediaPicker : sélecteur visuel d'image de galerie + upload direct intégré
// Remplace toute saisie manuelle d'« ID photo » ou de `coverId`.
// ===================================
export function MediaPicker({
  label,
  value,
  selectedId,
  mode = 'id',
  filterType,
  onChange,
  onSelect,
}: {
  label?: string;
  value?: string | null | undefined;
  selectedId?: string | null | undefined;
  /** 'id' pour Article.coverId / Sponsor.logoId ; 'url_or_id' pour Player.photoId */
  mode?: 'id' | 'url_or_id';
  filterType?: 'PHOTO' | 'VIDEO';
  onChange?: (nextValue: string | null, media?: Media | null) => void;
  onSelect?: (media: Media) => void;
}) {
  const [open, setOpen] = useState(Boolean(onSelect && !label));
  const [tab, setTab] = useState<'gallery' | 'upload'>('gallery');
  const effectiveValue = value ?? selectedId;

  const galleryQuery = useQuery({
    queryKey: ['galerie', 'picker', filterType ?? 'IMAGE'],
    queryFn: () => siteRequest('galerie?type=IMAGE&pageSize=60', { schema: z.array(mediaSchema) }),
    enabled: open || Boolean(onSelect),
  });

  const medias = galleryQuery.data?.data ?? [];
  const selectedMedia = medias.find(
    (m) => m.id === effectiveValue || m.url === effectiveValue || m.publicId === effectiveValue,
  );

  // Mode embarqué direct dans une SheetDialog parente (quand `onSelect` est fourni sans `label`)
  if (onSelect && !label) {
    return (
      <div>
        <div className="mb-4 flex gap-2 border-b border-[var(--nfc-divider)] pb-3">
          <Button
            type="button"
            variant={tab === 'gallery' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTab('gallery')}
          >
            Galerie ({medias.length})
          </Button>
          <Button
            type="button"
            variant={tab === 'upload' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTab('upload')}
          >
            Téléverser une image
          </Button>
        </div>

        {tab === 'upload' ? (
          <MediaUploader
            onUploaded={(uploaded) => {
              const first = uploaded[0];
              if (first) onSelect(first);
            }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {medias.map((media) => {
              const isSelected = media.id === effectiveValue || media.url === effectiveValue;
              return (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => onSelect(media)}
                  className={`group relative overflow-hidden rounded-xl border-2 text-left ${
                    isSelected ? 'border-[var(--nfc-green)]' : 'border-transparent'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.url}
                    alt={media.altText || media.title || 'Média'}
                    className="h-28 w-full object-cover"
                  />
                  <div className="bg-[var(--nfc-card)] p-2">
                    <p className="truncate text-xs font-semibold">{media.title || 'Sans titre'}</p>
                    <p className="truncate text-[11px] text-[var(--nfc-muted)]">
                      {media.album || 'Général'}
                    </p>
                  </div>
                </button>
              );
            })}
            {medias.length === 0 && !galleryQuery.isLoading && (
              <p className="col-span-full py-6 text-center text-sm text-[var(--nfc-muted)]">
                Aucune image dans la galerie. Utilisez l’onglet « Téléverser une image ».
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-semibold text-[var(--nfc-text)]">{label}</span>
      <div className="flex flex-wrap items-center gap-3 border border-[var(--nfc-divider)] bg-[var(--nfc-bg)] p-3">
        {selectedMedia || (value && value.startsWith('http')) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selectedMedia?.url || value || ''}
            alt={selectedMedia?.altText || 'Aperçu média'}
            className="h-14 w-14 object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center bg-black/10 text-xs text-[var(--nfc-muted)]">
            Aucun
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">
            {selectedMedia?.title || (value ? `Média sélectionné (${value.slice(0, 24)})` : 'Aucun média sélectionné')}
          </p>
          <p className="text-xs text-[var(--nfc-muted)]">
            Choisissez une image dans la galerie ou téléversez-en une nouvelle.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            Choisir
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange?.(null, null)}>
              Retirer
            </Button>
          )}
        </div>
      </div>

      <SheetDialog
        open={open}
        onClose={() => setOpen(false)}
        title={label || 'Choisir un média'}
        subtitle="Sélectionnez un visuel existant ou téléversez une nouvelle image"
        wide
      >
        <div className="mb-4 flex gap-2 border-b border-[var(--nfc-divider)] pb-3">
          <Button
            type="button"
            variant={tab === 'gallery' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTab('gallery')}
          >
            Galerie ({medias.length})
          </Button>
          <Button
            type="button"
            variant={tab === 'upload' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTab('upload')}
          >
            Téléverser une image
          </Button>
        </div>

        {tab === 'upload' ? (
          <MediaUploader
            onUploaded={(uploaded) => {
              const first = uploaded[0];
              if (first) {
                onChange?.(mode === 'url_or_id' ? first.url : first.id, first);
                onSelect?.(first);
                setOpen(false);
              }
            }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {medias.map((media) => {
              const isSelected = media.id === effectiveValue || media.url === effectiveValue;
              return (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => {
                    onChange?.(mode === 'url_or_id' ? media.url : media.id, media);
                    onSelect?.(media);
                    setOpen(false);
                  }}
                  className={`group relative overflow-hidden border-2 text-left ${
                    isSelected ? 'border-[var(--nfc-green)]' : 'border-transparent'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.url}
                    alt={media.altText || media.title || 'Média'}
                    className="h-28 w-full object-cover"
                  />
                  <div className="bg-[var(--nfc-card)] p-2">
                    <p className="truncate text-xs font-semibold">{media.title || 'Sans titre'}</p>
                    <p className="truncate text-[11px] text-[var(--nfc-muted)]">{media.album || 'Général'}</p>
                  </div>
                </button>
              );
            })}
            {medias.length === 0 && !galleryQuery.isLoading && (
              <p className="col-span-full py-6 text-center text-sm text-[var(--nfc-muted)]">
                Aucune image dans la galerie. Utilisez l’onglet « Téléverser une image ».
              </p>
            )}
          </div>
        )}
      </SheetDialog>
    </div>
  );
}
