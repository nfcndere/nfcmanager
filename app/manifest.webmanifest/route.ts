import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json(
    {
      id: '/?app=nfcmanager',
      name: 'Administration Ngaoundéré FC',
      short_name: 'NFC Admin',
      description: 'Application mobile d’administration du site officiel du Ngaoundéré FC (L’Étoile de l’Adamaoua).',
      lang: 'fr',
      dir: 'ltr',
      start_url: '/dashboard?source=pwa',
      scope: '/',
      display: 'standalone',
      display_override: ['standalone', 'minimal-ui'],
      orientation: 'portrait',
      background_color: '#f8f9fa',
      theme_color: '#111827',
      categories: ['sports', 'productivity', 'business'],
      icons: [
        { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      screenshots: [
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'Tableau de bord mobile NFC Admin',
        },
        {
          src: '/icons/icon-512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          form_factor: 'narrow',
          label: 'Saisie de score en direct sur mobile',
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          form_factor: 'wide',
          label: 'Gestion complète du club sur ordinateur',
        },
        {
          src: '/icons/icon-512-maskable.png',
          sizes: '512x512',
          type: 'image/png',
          form_factor: 'wide',
          label: 'Médiathèque et classement du Ngaoundéré FC',
        },
      ],
      shortcuts: [
        {
          name: 'Nouveau match',
          short_name: 'Match',
          description: 'Programmer ou saisir un match du NFC',
          url: '/matchs?nouveau=1',
          icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
        },
        {
          name: 'Nouvelle actualité',
          short_name: 'Actualité',
          description: 'Rédiger ou publier un article',
          url: '/actualites?nouveau=1',
          icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
        },
        {
          name: 'Médiathèque',
          short_name: 'Médias',
          description: 'Téléverser des photos ou vidéos',
          url: '/medias',
          icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
        },
      ],
    },
    {
      headers: {
        'Content-Type': 'application/manifest+json; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
}
