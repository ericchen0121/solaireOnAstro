import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // Astro Actions require server output (see ActionsWithoutServerOutputError with output: static + adapter in v6).
  output: 'server',
  adapter: cloudflare(),
  integrations: [
    tailwind(),
    react({
      // Only process React components through React's JSX runtime
      include: ['**/*.tsx', '**/*.jsx'],
    }),
  ],
});

