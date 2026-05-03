## Context

Personal platform serving as a **professional showcase** (offerings, projects, case studies) and as a **technical foundation** for a scalable freelance platform (admin dashboard, RAG chatbot, mini-CRM, blog, AI generation) planned post-MVP.

**My role**: end-to-end design and development (architecture, UI, backend, infrastructure, docs).

## Key achievements

### Public portfolio (pages, projects, contact, SEO, i18n)

Public pages with an ordered narrative (Home → Services → Projects → About → Contact), project list with filters, dedicated case studies, SMTP contact form, SEO (Open Graph metadata, sitemap, robots.txt) and FR/EN i18n wired in from day 1.

**Technical challenges**: ordering the public narrative (offering, proof, person, action), serving dynamic assets without coupling to the Next.js build, wiring i18n from the start to avoid content rewrites, modeling bilingual content in the database without breaking the UI chrome.

**Solutions**: isolated route group for the public site (future admin dashboard kept separate), assets served through a dedicated API route (Docker volume, R2 migration post-MVP), next-intl with a browser-language detection middleware, **PPR (Partial Prerendering) Next.js 16 + granular opt-in caching** rather than classic SSG/SSR/ISR, twin Fr/En columns on Prisma models + localization helper on the query side.

### Hybrid design system (shadcn/ui + Magic UI + Aceternity UI)

3-layer UI stack: shadcn/ui as the functional base, Magic UI + Aceternity UI for marketing visual effects (spotlight, glows, reveals, bento, marquee), Tailwind CSS 4 for styling. Custom sage-green palette, Dark/Light mode following OS preference, Geist Sans + Sansation + Geist Mono typography.

**Technical challenges**: composing 3 UI libraries without structural conflict, OKLCH design tokens via CSS variables for automatic Dark/Light support.

**Solutions**: dedicated subfolders per UI library, class-composition utility without conflicts, semantic CSS tokens for primary/muted/accent.

### SEO & GEO 2026 (Generative Engine Optimization)

SEO + GEO strategy updated for 2026 covering both traditional search engines (Google, Bing) and AI engines (ChatGPT, Perplexity, Claude search): per-locale Open Graph metadata, dynamic sitemap with FR/EN hreflang, JSON-LD `Person` enriched with Wikidata + SIRET, dynamic OG Images generated via ImageResponse, `robots.txt` and `/llms.txt`.

**Technical challenges**: GEO 2026 best practices not yet documented like classical SEO, E-E-A-T signal for freelance identity via JSON-LD `Person` (SIRET, postal address), dynamic OG Images on Edge runtime (specific constraints on fonts and color palette).

**Solutions**: JSON-LD `ProfilePage` + `Person` with `knowsAbout` entries enriched with Wikidata recognized by AI engines (vs plain strings), `/llms.txt` served via route handler to consume the site URL dynamically, OG Images via ImageResponse Satori (custom fonts + hardcoded light palette for Edge runtime).

### Legal compliance & GDPR

Legal pages (`/mentions-legales` LCEN, `/confidentialite` GDPR), cookie consent banner, gating of the inline Calendly widget conditioned on marketing consent, Calendly CSP whitelist + IP hashing for GDPR-friendly tracking. Blocking before public production: LCEN, GDPR, ePrivacy directive, CNIL.

**Technical challenges**: choosing between a turnkey library and a custom in-house implementation (`vanilla-cookieconsent` v3 + Provider Context + integration tests, ~250 LOC) for more control, respecting **CNIL 2020-092 Accept/Reject symmetry** (libraries don't do it by default, CSS override required), Calendly gating conditioned on marketing consent (third-party cookies: Segment, Google Analytics, Hotjar, LinkedIn Insight Tag), non-blocking banner for Core Web Vitals.

**Solutions**: adoption of **`@c15t/nextjs` v2 (offline mode)** after rejecting the custom implementation (3x more code to maintain), React-side gating that prevents the Calendly widget from rendering until marketing consent is granted, server-side IP hashing shared across Server Actions, no identifying personal data (raw IP, email, message body) ever logged in clear.

### Self-hosted infrastructure & Ops

Dokploy hosting on VPS, Docker Compose (Next.js + Postgres), GitHub Actions CI, automatic deployment via GitHub webhook on merges to `main`, Docker image with `output: 'standalone'` (~250 MB), structured Pino logs, security headers (HSTS + CSP) + in-memory rate limiting.

**Technical challenges**: Dokploy rather than Vercel (VPS already paid for, full control, complete post-MVP stack on the same infrastructure), lightweight Docker image, DB migrations at container startup, rate limiting without Redis, Docker build without DB access (builder sandbox isolated from the compose network).

**Solutions**: multi-stage Dockerfile to produce a minimal runtime image, Prisma migrations executed atomically at container startup (before the Next.js server), in-memory IP counter on the Server Action side, pairing `'use cache'` + `await connection()` on the data-fetching side to pass the build without hitting the DB (public pages rendered as Partial Prerender: static shell at build + DB content streamed at runtime from the Data Cache).

## Results

- **MVP delivered in ~2 weeks** (5 public features + 14 ADRs + FR/EN bilingual from day 1)
- FR/EN bilingual site operational without rewrites (hreflang SEO + Fr/En editorial content twinned in DB)
- **CNIL-ready legal compliance from day 1 in production** (cookie banner, Calendly gating, IP hashing, bilingual legal pages)
- **GEO 2026 SEO operational** (JSON-LD Wikidata + SIRET, `/llms.txt`, dynamic OG Images)
- Docker image **~250 MB** (vs ~1.2 GB without standalone), self-hosting with zero recurring cost vs Vercel

## Takeaways

- Next.js App Router (Server Components, Server Actions, **PPR + granular opt-in caching**)
- Mindset shift from Angular: "backend-in-front" logic
- Modern design system via hybrid libraries (shadcn + Magic UI + Aceternity)
- Strict TypeScript + type-safe Prisma
- Modern SEO + GEO 2026 (JSON-LD Wikidata, schema.org `Person`/SIRET, dynamic OG Images, llms.txt)
- GDPR / CNIL compliance (consent management, third-party cookies gating, server-side IP hashing, CSP)
- Modern self-hosting (Dokploy + Docker multi-stage standalone)
- Documentation discipline: 14 ADRs + structured project docs (brainstorm, architecture, design, production)

## Planned evolutions

- Single-user admin dashboard (Better Auth + Google OAuth + email whitelist)
- Public RAG chatbot (showcase for AI skills, pgvector in PostgreSQL)
- Internal mini-CRM (progressive replacement of the Notion draft)
- Blog + AI content generation
- Self-hosted Umami analytics
- Self-hosted n8n (workflow orchestration)
- Cloudflare R2 + rclone backups (script + cron, post-MVP)
- Migration of Docker-volume assets to Cloudflare R2 (at the time of the admin dashboard)
