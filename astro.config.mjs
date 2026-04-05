import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // `output: "hybrid"` was removed in Astro 6; `static` + adapter + per-route `prerender` is the replacement.
  // Pages using Astro Actions must set `export const prerender = false` (e.g. contact).
  output: 'static',
  adapter: cloudflare({ configPath: './wrangler.jsonc' }),
  vite: {
    resolve: {
      // Avoid duplicate React in SSR/worker bundles (invalid hook call / missing optimized chunks in dev).
      dedupe: ['react', 'react-dom'],
    },
  },
  integrations: [
    tailwind(),
    react({
      // Only process React components through React's JSX runtime
      include: ['**/*.tsx', '**/*.jsx'],
    }),
  ],
});

