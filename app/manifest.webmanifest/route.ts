import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    name: 'Administration Ngaoundéré FC',
    short_name: 'NFC Admin',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#f3f7f4',
    theme_color: '#008751',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Nouveau match', url: '/matchs/nouveau' },
      { name: 'Nouvelle actualité', url: '/actualites/nouvelle' },
    ],
  });
}
