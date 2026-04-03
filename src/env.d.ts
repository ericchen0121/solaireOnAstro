/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** Full URL to projets background MP4 when the file is too large for Cloudflare Pages (25 MiB/file limit). */
  readonly PUBLIC_PROJETS_VIDEO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}