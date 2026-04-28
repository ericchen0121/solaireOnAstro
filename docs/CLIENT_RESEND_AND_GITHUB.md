# Client setup — accounts to own code, deploy, and email

Use this note to see **which services to sign up for** so you **fully own** the repository, the **live website (hosting)**, and **contact-form email**. Your developer will connect the pieces; you keep the logins and billing.

A longer technical runbook (scripts, Wrangler, secrets wiring) is in [`CLIENT_HANDOFF.md`](./CLIENT_HANDOFF.md).

---

## At a glance — what each account is for

| Account | You use it to… |
|--------|------------------|
| **GitHub** | Own the **source code** (repository), review changes, connect automated **deploys** from git. |
| **Cloudflare** | **Host** the site (this project uses **Workers**), set **production secrets**, attach a **custom domain**, HTTPS, and often **DNS** if the domain uses Cloudflare nameservers. |
| **Resend** | Send **contact form** email from the server (API); **verify your domain** so “from” addresses work in production. |

**Domain name:** Often purchased at a **registrar** (e.g. Infomaniak, Gandi, Cloudflare Registrar). DNS can stay there *or* be moved to **Cloudflare** so one place manages DNS + the Worker + TLS. You don’t need a separate “hosting” provider beyond **Cloudflare** for this stack.

**Billing:** Each service may have a free tier to start; confirm limits in their current pricing. You will receive invoices as **account owner** where applicable.

---

## 1. GitHub — own the code

### Before the transfer

1. Create a **[GitHub](https://github.com) account** *or* a **[GitHub organization](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/about-organizations)** (good for a company that will own the repo and access policy).
2. Decide who is **admin** (who can add collaborators, approve integrations, transfer the repo).
3. **Send the developer** the **username** or **org name** the repository should be transferred to.

### Accepting the transfer

1. The developer starts a **repository transfer** to your user or org (*Settings → General → Transfer ownership* on their side).
2. **Accept the email from GitHub** before it expires; complete the **accept** flow in the link.
3. Confirm you can open the repo, open **Settings**, and invite collaborators if needed.

### After the transfer

- **Deploy from Git:** If Cloudflare (or another host) is tied to the old owner’s **GitHub connection**, you or the developer must reconnect using **your** Cloudflare account + **your** GitHub **app** / OAuth so deploys use your org’s permissions — not the agency’s user.
- Access for the **developer** should follow your contract (remove when done).

**Official help:** [Transferring a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository).

---

## 2. Cloudflare — own the deploy and hosting

This site is built with **Astro** and runs on **Cloudflare Workers** (see `package.json` / adapter). The **live URL** and **custom domain** are managed here.

### Why you need an account

- You **deploy** the site to Cloudflare’s network (fast, global, HTTPS).
- You set **secrets** the Worker uses at runtime (e.g. Resend API key, contact emails) in the **dashboard** or via **Wrangler** — these are not stored in the public GitHub repo.
- You attach your **custom domain** and, if you use Cloudflare for DNS, control **DNS records** in one place.

### What to do

1. Create a **Cloudflare** account: [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) (a shared or role-based company email is often best).
2. You do **not** have to be on a paid plan to start; check current **Workers** / **Free** limits in Cloudflare’s docs as traffic grows.
3. The developer will either:
   - create the **Worker** (or project) in **your** account, or
   - walk you through connecting **GitHub** so pushes to a branch run **build + deploy** automatically.

### What to prepare / send the developer

- Which **email** is the **owner** of the Cloudflare account (for invites and recovery).
- If the site will use a **custom domain** you already own: which **domain** and whether **DNS** is (or will be) at Cloudflare. If the domain is elsewhere, you may add **CNAME/TXT** records the developer specifies for Resend, SSL, or routing — your registrar’s DNS panel is enough until you move nameservers to Cloudflare.

### After go-live (your ownership)

- You can see the **Worker** (or **Workers + Pages** style project) in the **Cloudflare dashboard**.
- You (or the developer) set **Environment variables** / **Secrets** for production — at minimum the same Resend and contact values listed in [section 3](#3-resend--contact-form-email) below.
- You add the **custom domain** and wait for **TLS** to become active; test the site on **https://**.

**Official help:** [Cloudflare Workers](https://developers.cloudflare.com/workers/), [Account setup](https://developers.cloudflare.com/workers/development-testing/).

---

## 3. Resend — contact form email

The **contact form** does not use your personal Gmail IMAP. It sends through **Resend** from the **server (Worker)**. You need a Resend account, a **verified domain** for production, and three values your developer will store as **server-only secrets** (not in Git).

### Account and domain (production)

1. Sign up at **[resend.com](https://resend.com)**.
2. In Resend, open **Domains** and add your **sending** domain (e.g. the site’s domain).
3. Add the **DNS records** Resend provides at your **DNS host** (often the same as Cloudflare for your zone). Wait until the domain is **verified**.
4. Without a verified domain, you may be stuck in a **test/sandbox** mode — not ideal for go-live.

### API key

1. Create an **API key** in Resend (e.g. `website-production`). Treat it as a **password**; do not post in Slack, email, or GitHub issues.
2. The developer will place it in **Cloudflare** as a secret: `RESEND_API_KEY` (and rotate it if it’s ever exposed).

### What to decide

| Item | Role | Example |
|------|------|--------|
| **Inbox** | Where *you* receive form submissions | `contact@yourdomain.ch` |
| **From** | Allowed **sender** on a verified domain (what appears on notification emails) | `noreply@yourdomain.ch` |

**Env names** this codebase expects in production (see `src/actions/index.ts`):

- `RESEND_API_KEY`
- `CONTACT_TO_EMAIL` — your team inbox
- `CONTACT_FROM_EMAIL` — verified “from” (reply-to the visitor is handled in code where applicable)

**Official help:** [Resend — Domains](https://resend.com/docs/dashboard/domains/introduction), [API keys](https://resend.com/docs/dashboard/api-keys/introduction).

---

## 4. Domain and DNS (you already own the name)

### If nameservers today are something like `ns1.malera.net` / `ns2.malera.net`

That usually means **Malera** (or a partner) is hosting **DNS** for the domain (e.g. `rochatsolaire.ch`). **Pointing the site at Cloudflare is straightforward** and is a common migration:

1. **Add the domain** in the Cloudflare dashboard (**Add a site** / **Add an existing domain**).
2. Cloudflare will show **two nameservers** (e.g. `xxxx.ns.cloudflare.com` and `yyyy.ns.cloudflare.com`).
3. At the **registrar** — the company where the domain is **registered** (sometimes the same login as Malera, sometimes a separate “.ch” registrar) — replace the current nameservers (`ns1.malera.net`, `ns2.malera.net`) with **only** Cloudflare’s two. Save and wait for **propagation** (often a few hours; allow up to ~48h in edge cases).
4. **Recreate DNS records** in Cloudflare that you still need: website (A/CNAME to the Worker), **MX** if you use email on that domain, **SPF/DKIM** for Resend, etc. The developer should give you a list before you cut over so nothing is lost.

**Not hard, but not “one click”:** the sensitive part is **exporting the old zone** (or writing down every record) so **email, subdomains, and third-party services** do not break when Malera is no longer answering DNS. If the domain is only used for the marketing site and email is on Microsoft/Google with known MX, those MX records are copied into Cloudflare the same as before.

### If you do *not* want to move nameservers yet

- You can sometimes keep `ns1.malera.net` / `ns2.malera.net` and add only the records Malera’s panel allows (CNAME/TXT) for the Worker and Resend. That works but splits **DNS in Malera** and **hosting/TLS in Cloudflare**; many teams still prefer **one** DNS panel (Cloudflare) for clarity.

---

## 5. Checklist before you “fully own” everything

- [ ] **GitHub** — transfer accepted; you are **admin**; deploy integration points at **your** org/user.
- [ ] **Cloudflare** — you are **account owner** (or have admin); Worker/project name known; you can open **Settings / Variables** (or **Secrets**).
- [ ] **Resend** — domain **verified**; you control API keys and can rotate them.
- [ ] **Secrets in Cloudflare** — `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` set for **production** (and optional `PUBLIC_PROJETS_VIDEO_URL` if your build uses a hosted video — ask the developer).
- [ ] **Custom domain** — resolves and serves **HTTPS**; contact form test sends and receives as expected.
- [ ] **Access cleanup** — agency GitHub/Cloudflare access removed or reduced per your agreement.

---

*Detailed deploy commands, `npm run build` / `deploy`, and developer-side checklist: [`CLIENT_HANDOFF.md`](./CLIENT_HANDOFF.md).*
