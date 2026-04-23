## Context

Personal platform serving as a **professional showcase** (offerings, projects, case studies) and as a **technical foundation** for a scalable freelance platform (admin dashboard, RAG chatbot, mini-CRM, blog, AI generation) planned post-MVP.

**My role**: end-to-end design and development (architecture, UI, backend, infrastructure, docs).

## Key achievements

### Public portfolio (pages, projects, contact, SEO, i18n)

Public pages with an ordered narrative (Home → Services → Projects → About → Contact), project list with filters, dedicated case studies, SMTP contact form, SEO (Open Graph metadata, sitemap, robots.txt) and FR/EN i18n wired in from day 1.

**Technical challenges**: ordering the public narrative (offering, proof, person, action), serving dynamic assets without coupling to the Next.js build, wiring i18n from the start to avoid content rewrites, pre-generating case studies for SEO.

**Solutions**: isolated route group for the public site (future admin dashboard kept separate), assets served through a dedicated API route backed by a Docker volume, next-intl with a browser-language detection middleware, SSG for static pages, SSR plus `generateStaticParams` for the case study page.

### Technical foundations (fullstack Next.js monolith)

Strict TypeScript monolith covering public pages plus future admin dashboard in a single app. Server Actions for mutations, API Routes for third-party endpoints (n8n, post-MVP chatbot), Prisma + PostgreSQL from the MVP.

**Technical challenges**: first Next.js and React project after several years of Angular (paradigm shift), minimal but scalable data modeling.

**Solutions**: logical separation between actions and queries, pragmatic approach with no heavy abstraction layer, Prisma with versioned migrations, **14 ADRs signed off** before development.

### Hybrid design system (shadcn/ui + Magic UI + Aceternity UI)

3-layer UI stack: shadcn/ui as the functional base, Magic UI + Aceternity UI for marketing visual effects (spotlight, glows, reveals, bento, marquee), Tailwind CSS v4 for styling. Custom sage-green palette, Dark/Light mode following OS preference, Geist Sans + Sansation + Geist Mono typography.

**Technical challenges**: composing 3 UI libraries without structural conflict, design tokens in **OKLCH** via CSS variables for automatic Dark/Light support.

**Solutions**: dedicated subfolders per UI library, class-composition utility without conflicts, semantic CSS tokens for primary/muted/accent.

### Self-hosted infrastructure & Ops

Dokploy hosting on VPS, Docker Compose (Next.js + Postgres), GitHub Actions CI, automatic deployment via GitHub webhook on merges to `main`, automated PostgreSQL and volume backups to Cloudflare R2, structured logs, security headers + HSTS + in-memory rate limiting.

**Technical challenges**: Dokploy rather than Vercel (VPS already paid for, full control, complete post-MVP stack on the same infrastructure), reliable backups without over-engineering, rate limiting without Redis.

**Solutions**: in-memory IP counter on the Server Action side, automated backup script to R2, structured logs accessible in Dokploy.

## Takeaways

- Next.js App Router (Server Components, Server Actions, SSG/SSR/ISR, opt-in caching)
- Mindset shift from Angular: "backend-in-front" logic
- Modern design system via hybrid libraries (shadcn + Magic UI + Aceternity)
- Strict TypeScript + type-safe Prisma
- Modern self-hosting (Dokploy + Docker Compose + Cloudflare R2)
- Documentation discipline: 14 ADRs plus structured project docs (brainstorm, architecture, design, production)

## Planned evolutions

- Single-user admin dashboard (Better Auth + Google OAuth + email whitelist)
- Public RAG chatbot (showcase for AI skills, pgvector in PostgreSQL)
- Internal mini-CRM (progressive replacement of the Notion draft)
- Blog + AI content generation
- Self-hosted Umami analytics
- Self-hosted n8n (workflow orchestration)
- Migration of Docker-volume assets to Cloudflare R2 (at the time of the admin dashboard)
