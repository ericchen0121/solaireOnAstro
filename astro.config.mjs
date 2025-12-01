import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  integrations: [
    tailwind(),
    react({
      // Only process React components through React's JSX runtime
      include: ['**/*.tsx', '**/*.jsx'],
    }),
  ],
});

