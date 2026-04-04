/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /** Full URL to projets background MP4 when the file is too large for Cloudflare Pages (25 MiB/file limit). */
  readonly PUBLIC_PROJETS_VIDEO_URL?: string;
  /** Resend API key (server-only). */
  readonly RESEND_API_KEY?: string;
  /** Inbound address for contact form submissions (server-only). */
  readonly CONTACT_TO_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}