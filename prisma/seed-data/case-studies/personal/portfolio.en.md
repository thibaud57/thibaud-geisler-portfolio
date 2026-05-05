## Context

Personal platform serving as a **professional showcase** (offerings, projects, case studies) and as a **technical foundation** for a scalable freelance platform (admin dashboard, RAG chatbot, mini-CRM, blog, AI generation) planned post-MVP.

**My role**: end-to-end design and development (architecture, UI, backend, infrastructure, docs).

## Key achievements

### Public portfolio (pages, projects, contact, SEO, i18n)

Public pages with an ordered narrative (Home → Services → Projects → About → Contact), filterable project list, dedicated case studies, SMTP contact form, SEO (Open Graph, sitemap, robots.txt) and FR/EN bilingual wired in from day 1.

**Technical challenges**: avoid content rewrites by wiring i18n from the start, model bilingual content in the database without breaking the UI, serve dynamic assets without coupling to the Next.js build.

**Impact**: public narrative aligned with the commercial offering, **PPR Next.js 16** retained after benchmarking against SSG/SSR/ISR for a fast MVP that scales, twin Fr/En columns in the DB to absorb future case studies without refactoring.

### Hybrid design system (shadcn/ui + Magic UI + Aceternity UI)

3-layer UI stack: shadcn/ui (functional base), Magic UI + Aceternity UI (marketing visual effects: spotlight, glows, reveals, bento), Tailwind CSS 4. Custom sage-green palette, Dark/Light mode following OS preference, Geist Sans + Sansation + Geist Mono typography.

**Technical challenges**: composing 3 UI libraries without structural conflict, semantic tokens with automatic Dark/Light support.

**Impact**: cohesive and maintainable design system, dedicated subfolders per library to prevent future collisions, Dark/Light switch with no visible flash.

### SEO & GEO 2026 (Generative Engine Optimization)

SEO + GEO strategy updated for 2026 targeting both classic search engines (Google, Bing) and AI engines (ChatGPT, Perplexity, Claude search): per-locale Open Graph metadata, dynamic sitemap with FR/EN hreflang, JSON-LD `Person` enriched with Wikidata + SIRET, dynamic OG Images, `robots.txt` and `/llms.txt`.

**Technical challenges**: GEO 2026 best practices not yet documented like classical SEO, E-E-A-T signal for freelance identity, dynamic OG Images with Edge runtime constraints.

**Impact**: search ranking operational on both fronts (SEO + GEO 2026), Wikidata entries recognized by AI engines for better visibility in AI-assisted searches.

### Legal compliance & GDPR

GDPR/CNIL compliance, blocking before public production: bilingual legal pages (LCEN, GDPR), cookie consent banner with Accept/Reject symmetry (CNIL recommendation), Calendly widget gating conditioned on marketing consent, server-side IP hashing for GDPR-friendly tracking.

**Technical challenges**: choice between a turnkey library and a custom implementation (~250 LOC), non-blocking banner for Core Web Vitals, third-party cookie gating (Segment, Google Analytics, Hotjar, LinkedIn).

**Impact**: **CNIL-ready from production launch**, `@c15t/nextjs` chosen after benchmarking (3x less code to maintain vs custom), no identifying personal data ever logged in clear.

### Self-hosted infrastructure & Ops

Dokploy hosting on VPS, Docker Compose (Next.js + Postgres), GitHub Actions CI, automatic deployment via GitHub webhook on merges to `main`, standalone Docker image, structured Pino logs, security headers (HSTS + CSP) + in-memory rate limiting.

**Technical challenges**: Dokploy chosen over Vercel (VPS already paid for, full post-MVP stack on the same infrastructure), lightweight Docker image, DB migrations at container startup, Docker build without DB access (builder sandbox isolated from the Compose network), rate limiting without Redis.

**Impact**: Docker image **~250 MB** (vs ~1.2 GB without standalone), **zero-recurring-cost self-hosting vs Vercel**, atomic Prisma migrations at every container startup, build that passes without hitting the DB thanks to opt-in caching on the data-fetching side.

## Results

- **MVP delivered in ~2 weeks** (5 public features + 14 ADRs + FR/EN bilingual from day 1)
- FR/EN bilingual site operational without rewrites (hreflang SEO + Fr/En editorial content twinned in DB)
- **CNIL-ready legal compliance from production launch**
- **GEO 2026 SEO operational** (JSON-LD Wikidata + SIRET, `/llms.txt`, dynamic OG Images)
- Docker image **~250 MB**, zero-recurring-cost self-hosting vs Vercel

## Takeaways

- Next.js App Router (Server Components, Server Actions, **PPR + granular opt-in caching**)
- Mindset shift from Angular: "backend-in-front" logic
- Modern design system via hybrid libraries (shadcn + Magic UI + Aceternity)
- Strict TypeScript + type-safe Prisma
- Modern SEO + GEO 2026 (JSON-LD, schema.org, dynamic OG Images, llms.txt)
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
