import { defineConfig, sessionDrivers } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
  // `output: "hybrid"` was removed in Astro 6; `static` + adapter + per-route `prerender` is the replacement.
  // Pages using Astro Actions must set `export const prerender = false` (e.g. contact).
  output: 'static',
  // Default Cloudflare adapter session is KV; we don't use Astro.session — LRU avoids a KV namespace + dashboard binding.
  session: { driver: sessionDrivers.lruCache() },
  // Compile-time images avoid the Cloudflare Images (IMAGES) binding in Workers.
  adapter: cloudflare({
    configPath: './wrangler.jsonc',
    imageService: 'compile',
  }),
  vite: {
    resolve: {
      // Avoid duplicate React in SSR/worker bundles (invalid hook call / missing optimized chunks in dev).
      dedupe: ['react', 'react-dom'],
    },
    // Pre-warm common client deps so dev doesn’t chain multiple dep-optimizer passes (stale
    // node_modules/.vite/deps/*-HASH.js warnings when the browser requests a chunk mid-invalidation).
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-dev-runtime',
        '@astrojs/react/client.js',
        'gsap',
        'gsap/ScrollTrigger',
        'gsap/SplitText',
        'gsap/ScrollToPlugin',
        'gsap/MotionPathPlugin',
      ],
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

