# Client News Site

A custom editorial website and private administration panel built with Astro, TypeScript, Cloudflare Workers, D1, and R2. The sample publication name is **Fieldnote**. All seeded stories and authors are illustrative development content, not real breaking news.

## Requirements

- Node.js 22.12 or later and npm.
- No Cloudflare account or credentials are needed for local development.
- Git is initialized on `master`. The existing GitHub repository URL has not yet been provided or verified.

## Local setup

Run these commands from the project folder:

```powershell
npm install
npm run db:local
npm run seed:local
npm run admin:create -- --name "Site Owner" --email owner@example.test
npm run dev
```

The first Super Admin command generates a random one-time password and prints it once to the terminal. Save it in a password manager. The script refuses to add another initial Super Admin once one exists. After setup, use the change-password page to choose a personal password.

Open the public site at <http://localhost:4321/> and admin at <http://localhost:4321/admin/>. Local Wrangler state and uploads stay under the ignored `.wrangler/` directory. `npm run db:local` applies schema and safe initial settings migrations. `npm run seed:local` adds idempotent illustrative categories, articles, and pages to the local database only.

Useful commands:

```powershell
npm run dev       # Astro + the local Workers runtime
npm run check     # Astro and TypeScript diagnostics
npm run lint      # ESLint checks
npm test          # unit tests
npm run build     # production Worker build
npm run preview   # run the built app locally
```

## Application structure

- `src/pages/` contains dynamic public routes, admin screens, and server APIs.
- `src/lib/auth.ts` handles password hashing, sessions, and role gates.
- `src/lib/content.ts` contains public-only published article queries.
- `src/lib/html.ts` sanitizes rich article/page content.
- `migrations/` contains the D1 schema and safe initial settings. Demo content is separate in `seeds/demo.sql`.
- `scripts/create-admin.ts` generates a one-time password and bootstraps the first Super Admin. It uses local D1 by default; add `--remote` only after the production D1 binding is configured and migrated.
- `wrangler.jsonc` declares local D1 and R2 bindings.

Public routes include the home page, `/category/{slug}/`, `/article/{slug}/`, `/search/?q=...`, and editable pages such as `/about/`. Sitemap and robots endpoints are `/sitemap.xml` and `/robots.txt`. Admin screens are under `/admin/` and mutation endpoints under `/api/`.

## Security notes

- Passwords use salted PBKDF2-HMAC-SHA256 hashes (310,000 iterations). Session tokens are random, stored as SHA-256 hashes in D1, expire after seven days, and use HttpOnly/SameSite cookies. Cookies are Secure on HTTPS.
- Mutating form endpoints validate the request Origin; session cookies use SameSite=Lax. Repeated failed logins are rate-limited by account and client address.
- Every admin API checks the current account and required role on the server. Only Super Admins can manage administrators, advertising, and executable public scripts. Admin accounts cannot self-promote. The last active Super Admin is protected from removal, deactivation, or demotion.
- Article and page HTML is sanitized before storage. SQL values use prepared statements. Uploads enforce size, declared MIME type, and file signatures, and use generated R2 keys.
- Advertising and custom script settings are empty/disabled in the seed. These integrations run third-party code on public pages; only add snippets from providers you trust. The admin form shows the code as text and never executes it there.
- Security headers include `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, and a restrictive `Permissions-Policy`. A provider-specific Content Security Policy still needs to be designed if you enable custom scripts.

## Advertising and tracking

AdSense uses a site-wide loader (publisher ID) and a separate ad unit (slot ID and placement markup). The loader is emitted once in the public `<head>` only when article ads are enabled and a publisher value is set. An ad unit appears on article pages at the chosen placement when a slot is configured.

The custom script fields allow a Super Admin to save a GTM head snippet and optional body-start fallback. Both are ignored until the scripts switch is enabled. Disabled code is not emitted. Do not paste credentials or secrets into these settings.

## Initial production deployment (not performed)

No live Cloudflare resources have been created and nothing has been deployed. The app uses Cloudflare Workers with D1 (`DB`), R2 (`MEDIA`), and static assets (`ASSETS`). It currently requires no application environment variables or provider secrets. The Cloudflare account must be authenticated with Wrangler, and the D1 ID and R2 bucket name in `wrangler.jsonc` must be replaced with the production values.

The production migration set does not insert demo stories or sample legal pages. Apply migrations before bootstrapping the first admin. The following commands create remote resources or modify production and must be approved before use:

```powershell
npx wrangler login
npx wrangler d1 create news-site
npx wrangler r2 bucket create client-news-media
# Set the returned D1 database_id and actual bucket name in wrangler.jsonc.
npx wrangler d1 migrations apply news-site --remote
npm run admin:create -- --remote --name "Site Owner" --email owner@example.com
npm run build
npx wrangler deploy
```

The production Admin command prints a generated one-time password once. Capture it directly into a password manager, then change it after the first login. Do not put passwords or Cloudflare tokens in command arguments, source files, or chat. Advertising and custom scripts remain disabled unless explicitly enabled in Admin settings.

The default Worker URL uses the Cloudflare `workers.dev` subdomain when enabled for the account. A custom domain is optional and requires a separate domain/DNS decision. No preview environment is configured.

### GitHub

The intended repository is the private `client-news-site` repository on branch `master`; its owner and clone URL must be verified before configuring `origin`. After confirming it is the correct, empty repository, add the URL and push the initial commit with `git remote add origin https://github.com/<OWNER>/client-news-site.git` and `git push -u origin master`. If it already contains commits, inspect and reconcile history before pushing; never force-push.

### Backup and recovery

D1 production databases support Cloudflare Time Travel point-in-time recovery for up to 30 days. Review the target bookmark/timestamp and recovery impact before running `npx wrangler d1 time-travel restore news-site --timestamp <RFC3339_TIMESTAMP>`. Worker code can be rolled back with `npx wrangler rollback` after inspecting the deployment history. A Worker rollback does not restore D1 or R2 data; maintain a separate, tested export/backup process for uploaded media and database exports before launch.

### Required manual steps

1. Verify the GitHub repository owner/URL and authenticate to GitHub before pushing.
2. Authenticate to the intended Cloudflare account and confirm resource names/account plan before creating production D1/R2 resources.
3. Replace the D1 placeholder and R2 bucket name in `wrangler.jsonc` with the created production resource values.
4. Review sample defaults (publication identity, admin email, and legal pages) and prepare real initial content before public launch.
5. Review security headers and add a provider-specific Content Security Policy before enabling third-party scripts.

## Current scope and limitations

- D1 and R2 bindings run locally through Wrangler/Workerd. Production resource IDs, deployment, and the GitHub remote are not configured.
- Article/page editing supports sanitized basic HTML in a textarea rather than a rich-text editor. Uploaded media URLs can be used for featured images; image selection/picker and image transformations are not included.
- Article categories currently support one primary category per article.
- Login throttling is stored in D1, but a public production launch should also apply edge-level rate limiting and operational monitoring.
- No email delivery is configured. Administrator password resets are initiated by a Super Admin setting a temporary password, which must be shared through a secure channel.
- Sample legal pages are placeholders and need organization-specific review before publication.
- No quiz, trivia, giveaway, or related functionality is included.
