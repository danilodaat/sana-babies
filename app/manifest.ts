import type { MetadataRoute } from 'next';

/** PWA: permite instalar Sana Babies como app en el celular */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sana Babies',
    short_name: 'Sana Babies',
    description: 'Cuidando al mundo, un pasito a la vez. Juego de doctor para niños.',
    start_url: '/',
    scope: '/',
    display: 'fullscreen',
    orientation: 'any',
    background_color: '#bfe3ff',
    theme_color: '#ff6b9d',
    lang: 'es',
    categories: ['games', 'kids', 'education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
