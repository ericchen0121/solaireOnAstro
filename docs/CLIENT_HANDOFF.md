# Client handoff — Rochat Solaire (Astro + Cloudflare Workers)

This document has two parts:

1. **For your client** — what accounts to create, why, and what information they should prepare.
2. **For you (developer)** — a practical checklist to transfer GitHub, wire Cloudflare, Resend, and secrets safely.

The site is an **Astro** marketing site deployed as a **Cloudflare Worker** (SSR for some routes, static assets on Workers). The **contact form** sends email via **Resend**.

---

## Part A — Notes for the client

### What you are receiving

- A **website codebase** (HTML/CSS/JS) managed in **GitHub**.
- **Hosting** on **Cloudflare** (Workers), including the public URL and optional custom domain.
- **Transactional email** for the contact form via **Resend** (inbound to your team, confirmation to the visitor).

You do **not** need to run servers yourself. You will own the accounts so you control billing, domains, and access.

---

### 1. GitHub account (or organization)

**Why:** The source code lives in a Git repository. You need a place to host that repo and connect it to Cloudflare for automatic builds and deploys.

**What to do**

1. Create a [GitHub](https://github.com) account, or use an **organization** if this is a company site.
2. Decide who should have **admin** access (who can add/remove collaborators and connect integrations).
3. After handoff, the repository will be **transferred** into your account or org. You will receive an email to **accept the transfer** — accept it within the time limit GitHub sets.

**What to send the developer**

- The **GitHub username** or **organization name** where the repo should live.
- Names/emails of people who should be added as collaborators (if not only you).

---

### 2. Cloudflare account

**Why:** The live site runs on **Cloudflare Workers**. Cloudflare serves the site globally, handles HTTPS, and can manage DNS if you point your domain there.

**What to do**

1. Create a [Cloudflare](https://dash.cloudflare.com/sign-up) account (use a shared company email if appropriate).
2. No paid plan is strictly required to start; confirm current limits in Cloudflare’s docs if traffic grows.

**What to send the developer**

- Confirmation that the account exists and which **email** owns it (for inviting to the Worker/Pages project if needed).
- If you already use Cloudflare for DNS: note which **domain(s)** will point to this site.

**After go-live**

- You will have access to the **Workers & Pages** (or Workers) project in the dashboard.
- You can add **custom domains** and **environment variables / secrets** there with guidance from your developer or IT.

---

### 3. Resend account (email for the contact form)

**Why:** The site’s contact form does not use your personal Gmail SMTP. It uses **Resend**, a service that sends API-driven email reliably from the server.

**What to do**

1. Sign up at [Resend](https://resend.com).
2. **Verify your domain** in Resend (DNS records they provide). This allows sending from addresses like `hello@yourdomain.com`. Until a domain is verified, you may be limited to Resend’s **sandbox** sender (fine for testing, not ideal for production).
3. Create an **API key** with permission to send email (store it like a password — never commit it to Git or post it in public chat).

**What to send the developer**

- The **API key** (securely — password manager or encrypted channel).
- The **team inbox** address where contact submissions should arrive (e.g. `contact@yourcompany.com`).
- The **“from”** address you want on outbound mail (must be allowed by Resend for your domain, e.g. `noreply@yourdomain.com` or `hello@yourdomain.com`).

**What the developer will configure**

- Server-side environment variables so the Worker can send mail (see Part B). These are **not** exposed to visitors’ browsers.

---

### 4. Optional: video / large assets

If the project uses a **public URL** for a large background video (e.g. hosted outside the repo due to size limits), that may be set as `PUBLIC_PROJETS_VIDEO_URL`. Your developer will confirm whether this applies and where to host the file.

---

### 5. What you typically do *not* need to do

- Install Node.js locally — unless you want to preview changes yourself.
- Manually upload “FTP” files — deploys are usually **automatic from Git** after the integration is set up.

---

## Part B — Notes for the developer (handoff checklist)

Use this as a runbook when transferring the repo and production to the client.

### Repository transfer (GitHub)

1. **Clean the repo** — Ensure no committed secrets: `.env` must stay in `.gitignore`; rotate any key that ever leaked into history (Resend API key, etc.).
2. **Add `.env.example`** (recommended) in the repo with placeholder names only, matching:
   - `RESEND_API_KEY`
   - `CONTACT_TO_EMAIL`
   - `CONTACT_FROM_EMAIL`
   - Optionally `PUBLIC_PROJETS_VIDEO_URL`
3. **Transfer** the repository to the client’s user or org: GitHub repo **Settings → General → Transfer ownership**.
4. Client **accepts** the transfer; confirm they have admin access.
5. **Remove** your own deploy keys / personal tokens from their Cloudflare integration if you used yours during setup; have them connect **their** GitHub App / account.

---

### Cloudflare Workers + Git integration

1. **Client** creates Cloudflare account; you get access temporarily or walk them through the UI.
2. **Connect GitHub** to the Workers (or Pages-with-Workers) project per Cloudflare’s current UI.
3. **Build & deploy commands** (this project):

   | Step | Command |
   |------|---------|
   | Install | `npm ci` (or `npm install`) |
   | Build | `npm run build` |
   | Deploy | `npm run deploy` |

   `npm run deploy` runs `wrangler deploy --config dist/server/wrangler.json` — the Astro Cloudflare adapter **generates** `dist/server/wrangler.json` during `npm run build`. Do **not** use bare `npx wrangler deploy` without that config.

4. **Local full pipeline** (for manual deploys): `npm run deploy:cf` (`build` + `deploy`).

5. **Worker name / routes** — Root `wrangler.jsonc` sets `"name"` (e.g. `rochat-solaire`). After handoff, the client may rename the Worker in Cloudflare; align `wrangler.jsonc` / dashboard name if needed to avoid confusion.

6. **`compatibility_date` / `nodejs_compat`** — Already set in `wrangler.jsonc`; keep in sync with adapter docs when upgrading Astro/Cloudflare packages.

---

### Secrets and environment variables (production)

Contact actions read:

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL`
- `CONTACT_FROM_EMAIL`

These are **server-only** (`import.meta.env` in Astro actions). For Cloudflare Workers, set them via **Wrangler secrets** or the dashboard **Variables / Secrets** for the Worker, depending on your workflow — follow current Astro + `@astrojs/cloudflare` docs for binding `import.meta.env` in production.

**Local dev:** `.env` at project root (not committed). For Wrangler dev, the adapter may use `dist/server/.dev.vars` after build — confirm paths in current docs.

**Handoff security**

- Generate a **new Resend API key** for the client; **revoke** old keys tied to your agency.
- Never leave production secrets in README or issues.

---

### Resend

1. Client verifies **domain** and creates **API key**.
2. Set **from** address to a verified domain identity.
3. **CONTACT_TO_EMAIL** = inbox that receives submissions; **reply-to** in code uses the visitor’s email so the client can reply directly (see `src/actions/index.ts`).
4. Test contact form on **staging/production** after deploy.

---

### Custom domain

1. In Cloudflare: attach **custom domain** to the Worker / route per current UI.
2. DNS: **CNAME** or as Cloudflare instructs (often automatic if DNS is on Cloudflare).
3. Wait for TLS provisioning; test HTTPS.

---

### Final verification

- [ ] Home and main routes load over HTTPS.
- [ ] `/contact` loads and submits; team receives email; sender receives confirmation (if enabled in code).
- [ ] No console errors on critical pages; OrbitNav and animations behave as expected.
- [ ] Client has **owner** access to GitHub, Cloudflare, and Resend.
- [ ] Your access removed or downgraded per contract.

---

### Reference — npm scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Local development |
| `npm run build` | Production build (`dist/`) |
| `npm run deploy` | Deploy Worker using `dist/server/wrangler.json` (run **after** build) |
| `npm run deploy:cf` | `build` + `deploy` in one command |
| `npm run preview:cf` | Local preview against built Worker config (see `package.json`) |

---

### Support boundary (optional blurb for the client)

*Document your SLA here: who to email for content changes, who handles DNS, and whether ongoing dev is included.*

---

*Document version: written for Astro + `@astrojs/cloudflare` + Resend contact flow. Update commands if Cloudflare or Astro changes their Git integration UI.*
