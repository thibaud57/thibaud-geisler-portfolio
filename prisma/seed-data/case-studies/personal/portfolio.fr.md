## Contexte

Plateforme personnelle servant de **vitrine professionnelle** (offres, projets, case studies) et de **fondation technique** pour une plateforme freelance évolutive (dashboard admin, chatbot RAG, mini-CRM, blog, génération IA) à venir post-MVP.

**Mon rôle** : conception et développement de bout en bout (architecture, UI, backend, infra, docs).

## Réalisations marquantes

### Portfolio public (pages, projets, contact, SEO, i18n)

Pages publiques avec narration ordonnée (Accueil → Services → Projets → À propos → Contact), liste projets avec filtres, case studies dédiées, formulaire contact SMTP, SEO (metadata Open Graph, sitemap, robots.txt) et i18n FR/EN câblé dès J1.

**Défis techniques** : ordonnancer la narration publique (offre, preuve, personne, action), servir des assets dynamiques sans couplage au build Next.js, câbler i18n dès le début pour éviter la réécriture du contenu, modéliser le content bilingue en BDD sans casser l'UI chrome.

**Solutions** : route group isolée pour le site public (dashboard admin futur séparé), assets servis via route API dédiée (volume Docker, migration R2 post-MVP), next-intl avec middleware de détection langue navigateur, **PPR (Partial Prerendering) Next.js 16 + cache opt-in granulaire** plutôt que SSG/SSR/ISR classiques, colonnes jumelées Fr/En sur Prisma + helper de localisation côté query.

### Design System hybride (shadcn/ui + Magic UI + Aceternity UI)

Stack UI en 3 couches : shadcn/ui comme socle fonctionnel, Magic UI + Aceternity UI pour les effets visuels marketing (spotlight, glows, reveals, bento, marquee), Tailwind CSS 4 pour le styling. Palette custom vert sauge, Dark/Light mode suivant la préférence OS, typographie Geist Sans + Sansation + Geist Mono.

**Défis techniques** : composer 3 librairies UI sans conflit de structure, design tokens en **OKLCH** via CSS variables pour support Dark/Light automatique.

**Solutions** : sous-dossiers dédiés par librairie UI, utilitaire de composition de classes sans conflit, tokens sémantiques CSS pour primary/muted/accent.

### SEO & GEO 2026 (Generative Engine Optimization)

Stratégie SEO + GEO actualisée 2026 pour les moteurs traditionnels (Google, Bing) et les AI engines (ChatGPT, Perplexity, Claude search) : metadata Open Graph par locale, sitemap dynamique avec hreflang FR/EN, JSON-LD `Person` enrichi Wikidata + SIRET, OG Images dynamiques générées via ImageResponse, robots.txt et `/llms.txt`.

**Défis techniques** : best-practice GEO 2026 non encore documentée comme le SEO classique, signal E-E-A-T identité freelance via JSON-LD `Person` (SIRET, adresse postale), OG Images dynamiques sur Edge runtime (contraintes spécifiques sur les fonts et la palette).

**Solutions** : JSON-LD `ProfilePage` + `Person` avec entrées `knowsAbout` enrichies Wikidata reconnues par les AI engines (vs simples strings), `/llms.txt` servi via route handler pour consommer dynamiquement l'URL du site, OG Images via ImageResponse Satori (fonts custom + palette light hardcodée Edge runtime).

### Conformité légale & RGPD

Pages légales (`/mentions-legales` LCEN, `/confidentialite` RGPD), bandeau de consentement cookies, gating du widget Calendly inline conditionné au consent marketing, CSP whitelist Calendly + IP hashing pour tracking RGPD-friendly. Bloquante avant prod publique : LCEN, RGPD, directive ePrivacy, CNIL.

**Défis techniques** : choisir entre une lib clé-en-main et une implémentation custom maison (`vanilla-cookieconsent` v3 + Provider Context + tests intégration ~250 LOC) pour gagner du contrôle, respecter la **symétrie CNIL 2020-092 Accept/Reject** (les libs ne le font pas par défaut, override CSS requis), gating Calendly conditionné au consent marketing (cookies tiers Segment, Google Analytics, Hotjar, LinkedIn Insight Tag), banner non-bloquant pour Core Web Vitals.

**Solutions** : adoption de **`@c15t/nextjs` v2 (mode offline)** après écartement de l'implémentation custom (3x plus de code à maintenir), gating côté React qui empêche le rendu du widget Calendly tant que le consent marketing n'est pas accordé, IP hashing serveur partagé entre Server Actions, jamais de PII en logs Pino.

### Infrastructure self-hosted & Ops

Hébergement Dokploy sur VPS, Docker Compose (Next.js + Postgres), CI GitHub Actions, déploiement automatique via webhook GitHub sur merge `main`, image Docker `output: 'standalone'` (~250 MB), logs structurés Pino, security headers (HSTS + CSP) + rate limiting en mémoire.

**Défis techniques** : Dokploy plutôt que Vercel (VPS déjà payé, contrôle total, stack post-MVP complète sur la même infra), image Docker légère, migrations BDD au startup container, rate limiting sans Redis, build Docker sans accès DB (sandbox builder isolé du réseau du compose).

**Solutions** : Dockerfile multi-stage pour produire une image runtime minimale, migrations Prisma exécutées atomiquement au démarrage de chaque container (avant le serveur Next.js), compteur IP en mémoire côté Server Action, couple `'use cache'` + `await connection()` côté data-fetching pour passer le build sans toucher la DB (pages publiques en Partial Prerender : shell statique au build + contenu DB streamé au runtime depuis le Data Cache).

## Résultats

- **MVP livré en ~2 semaines** (5 features publiques + 14 ADRs + bilingue FR/EN dès J1)
- Site bilingue FR/EN opérationnel sans réécriture (hreflang SEO + content éditorial Fr/En jumelé en BDD)
- Conformité légale **CNIL-ready dès la mise en prod** (banner cookies, gating Calendly, IP hashing, pages légales bilingues)
- Référencement **GEO 2026** opérationnel (JSON-LD Wikidata + SIRET, `/llms.txt`, OG Images dynamiques)
- Image Docker **~250 MB** (vs ~1.2 GB sans standalone), self-hosting zéro coût récurrent vs Vercel

## Apprentissages

- Next.js App Router (Server Components, Server Actions, **PPR + caching opt-in** granulaire)
- Migration mentale depuis Angular : logique "backend-in-front"
- Design system moderne via libs hybrides (shadcn + Magic UI + Aceternity)
- TypeScript strict + Prisma type-safe
- SEO moderne + GEO 2026 (JSON-LD Wikidata, schema.org Person/SIRET, OG Images dynamiques, llms.txt)
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
