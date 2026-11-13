import type { MetadataRoute } from 'next';

// Colors mirror --canvas and --espresso in packages/ui/src/tokens.css.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Foyer',
    short_name: 'Foyer',
    start_url: '/projects',
    display: 'standalone',
    background_color: '#f5f1e9',
    theme_color: '#f5f1e9',
    icons: [{ src: '/apple-icon', sizes: '180x180', type: 'image/png' }, { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
