## Contexte

Plateforme personnelle servant de **vitrine professionnelle** (offres, projets, case studies) et de **fondation technique** pour une plateforme freelance évolutive (dashboard admin, chatbot RAG, mini-CRM, blog, génération IA) à venir post-MVP.

**Mon rôle** : conception et développement de bout en bout (architecture, UI, backend, infra, docs).

## Réalisations marquantes

### Portfolio public (pages, projets, contact, SEO, i18n)

Pages publiques avec narration ordonnée (Accueil → Services → Projets → À propos → Contact), liste projets filtrable, case studies dédiées, formulaire contact SMTP, SEO (Open Graph, sitemap, robots.txt) et bilingue FR/EN câblé dès J1.

**Défis techniques** : éviter la réécriture du contenu en câblant l'i18n dès le début, modéliser le contenu bilingue en BDD sans casser l'UI, servir des assets dynamiques sans dépendre du build Next.js.

**Impact** : narration publique livrée en cohérence avec l'offre commerciale, **PPR Next.js 16** retenu après benchmark vs SSG/SSR/ISR pour un MVP rapide qui scale, contenu bilingue jumelé en BDD pour absorber les futurs case studies sans refacto.

### Design System hybride (shadcn/ui + Magic UI + Aceternity UI)

Stack UI en 3 couches : shadcn/ui (socle fonctionnel), Magic UI + Aceternity UI (effets visuels marketing : spotlight, glows, reveals, bento), Tailwind CSS 4. Palette custom vert sauge, Dark/Light mode suivant la préférence OS, typographie Geist Sans + Sansation + Geist Mono.

**Défis techniques** : composer 3 librairies UI sans conflit de structure, tokens sémantiques avec support Dark/Light automatique.

**Impact** : design system cohérent et maintenable, sous-dossiers dédiés par librairie pour éviter les collisions futures, basculement Dark/Light sans flash visible.

### SEO & GEO 2026 (Generative Engine Optimization)

Stratégie SEO + GEO 2026 ciblant à la fois les moteurs classiques (Google, Bing) et les AI engines (ChatGPT, Perplexity, Claude search) : Open Graph par locale, sitemap dynamique avec hreflang FR/EN, JSON-LD `Person` enrichi Wikidata + SIRET, OG Images dynamiques, `robots.txt` et `/llms.txt`.

**Défis techniques** : best-practice GEO 2026 encore peu documentée, signal E-E-A-T identité freelance, OG Images dynamiques avec contraintes Edge runtime.

**Impact** : référencement opérationnel sur 2 fronts (SEO + GEO 2026), entrées Wikidata reconnues par les AI engines pour mieux ressortir dans les recherches assistées par IA.

### Conformité légale & RGPD

Mise en conformité RGPD/CNIL bloquante avant prod publique : pages légales bilingues (LCEN, RGPD), bandeau de consentement avec symétrie Accept/Reject (recommandation CNIL), gating du widget Calendly conditionné au consent marketing, IP hashing serveur pour tracking RGPD-friendly.

**Défis techniques** : choix entre lib clé-en-main et implémentation custom (~250 LOC), banner non-bloquant pour Core Web Vitals, gating de cookies tiers (Segment, Google Analytics, Hotjar, LinkedIn).

**Impact** : **CNIL-ready dès la mise en prod**, choix `@c15t/nextjs` validé après benchmark (3x moins de code à maintenir vs custom), aucune donnée personnelle identifiante loggée en clair.

### Infrastructure self-hosted & Ops

Hébergement Dokploy sur VPS, Docker Compose (Next.js + Postgres), CI GitHub Actions, déploiement automatique via webhook GitHub sur merge `main`, image Docker standalone, logs structurés Pino, security headers (HSTS + CSP) + rate limiting en mémoire.

**Défis techniques** : Dokploy retenu plutôt que Vercel (VPS déjà payé, stack post-MVP complète sur la même infra), image Docker légère, migrations BDD au startup container, build Docker sans accès DB (sandbox builder isolé du réseau Compose), rate limiting sans Redis.

**Impact** : image Docker **~250 MB** (vs ~1.2 GB sans standalone), **self-hosting zéro coût récurrent vs Vercel**, migrations Prisma atomiques au démarrage de chaque container, build qui passe sans toucher la DB grâce à un cache opt-in côté data-fetching.

## Résultats

- **MVP livré en ~2 semaines** (5 features publiques + 14 ADRs + bilingue FR/EN dès J1)
- Site bilingue FR/EN opérationnel sans réécriture (hreflang SEO + content éditorial Fr/En jumelé en BDD)
- Conformité légale **CNIL-ready dès la mise en prod**
- Référencement **GEO 2026** opérationnel (JSON-LD Wikidata + SIRET, `/llms.txt`, OG Images dynamiques)
- Image Docker **~250 MB**, self-hosting zéro coût récurrent vs Vercel

## Apprentissages

- Next.js App Router (Server Components, Server Actions, **PPR + caching opt-in** granulaire)
- Migration mentale depuis Angular : logique "backend-in-front"
- Design system moderne via libs hybrides (shadcn + Magic UI + Aceternity)
- TypeScript strict + Prisma type-safe
- SEO moderne + GEO 2026 (JSON-LD, schema.org, OG Images dynamiques, llms.txt)
- Conformité RGPD / CNIL (consent management, gating cookies tiers, IP hashing serveur, CSP)
- Self-hosting moderne (Dokploy + Docker multi-stage standalone)
- Discipline documentaire : 14 ADRs + docs projet structurées (brainstorm, architecture, design, production)

## Évolutions prévues

- Dashboard admin single-user (Better Auth + Google OAuth + whitelist email)
- Chatbot RAG public (vitrine compétences IA, pgvector dans PostgreSQL)
- Mini-CRM interne (remplacement progressif du brouillon Notion)
- Blog + génération IA de contenu
- Analytics Umami self-hosted
- n8n self-hosted (orchestration workflows)
- Backups Cloudflare R2 + rclone (script + cron, post-MVP)
- Migration assets volumes Docker vers Cloudflare R2 (au moment du dashboard admin)
