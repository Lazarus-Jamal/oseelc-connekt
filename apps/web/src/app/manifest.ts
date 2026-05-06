import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return ({
    name: 'Oseelc-connekt',
    short_name: 'Oseelc',
    description: "Plateforme de gestion financière et statistique de l'Oeuvre de Santé",
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    display_override: ['window-controls-overlay', 'standalone', 'browser'],
    orientation: 'any',
    background_color: '#ffffff',
    theme_color: '#0f766e',
    categories: ['health', 'finance', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [],
  }) as MetadataRoute.Manifest
}
