<!-- TODO: translate to English -->

## Contexte

Plateforme personnelle servant de **vitrine professionnelle** (offres, projets, case studies) et de **fondation technique** pour une plateforme freelance évolutive (dashboard admin, chatbot RAG, mini-CRM, blog, génération IA) à venir post-MVP.

**Mon rôle** : conception et développement de bout en bout (architecture, UI, backend, infra, docs).

## Réalisations marquantes

### Portfolio public (pages, projets, contact, SEO, i18n)

Pages publiques avec narration ordonnée (Accueil → Services → Projets → À propos → Contact), liste projets avec filtres, case studies dédiées, formulaire contact SMTP, SEO (metadata Open Graph, sitemap, robots.txt) et i18n FR/EN câblé dès J1.

**Défis techniques** : ordonnancer la narration publique (offre, preuve, personne, action), servir des assets dynamiques sans couplage au build Next.js, câbler i18n dès le début pour éviter la réécriture du contenu, pré-générer les case studies pour SEO.

**Solutions** : route group isolée pour le site public (dashboard admin futur séparé), assets servis via route API dédiée avec volume Docker, next-intl avec middleware de détection langue navigateur, SSG pour pages statiques, SSR + `generateStaticParams` pour la page case study.

### Fondations techniques (monolithe Next.js fullstack)

Monolithe TypeScript strict couvrant pages publiques + dashboard admin futur dans une seule app. Server Actions pour les mutations, API Routes pour les endpoints tiers (n8n, chatbot post-MVP), Prisma + PostgreSQL dès le MVP.

**Défis techniques** : premier projet Next.js et React après plusieurs années en Angular (changement de paradigme), modélisation BDD minimale mais évolutive.

**Solutions** : séparation logique actions / queries, pragmatique sans couche d'abstraction lourde, Prisma avec migrations versionnées, **14 ADRs actés** avant développement.

### Design System hybride (shadcn/ui + Magic UI + Aceternity UI)

Stack UI en 3 couches : shadcn/ui comme socle fonctionnel, Magic UI + Aceternity UI pour les effets visuels marketing (spotlight, glows, reveals, bento, marquee), Tailwind CSS v4 pour le styling. Palette custom vert sauge, Dark/Light mode suivant la préférence OS, typographie Geist Sans + Sansation + Geist Mono.

**Défis techniques** : composer 3 librairies UI sans conflit de structure, design tokens en **OKLCH** via CSS variables pour support Dark/Light automatique.

**Solutions** : sous-dossiers dédiés par librairie UI, utilitaire de composition de classes sans conflit, tokens sémantiques CSS pour primary/muted/accent.

### Infrastructure self-hosted & Ops

Hébergement Dokploy sur VPS, Docker Compose (Next.js + Postgres), CI GitHub Actions, déploiement automatique via webhook GitHub sur merge `main`, backups PostgreSQL et volumes vers Cloudflare R2 automatisés, logs structurés, security headers + HSTS + rate limiting en mémoire.

**Défis techniques** : Dokploy plutôt que Vercel (VPS déjà payé, contrôle total, stack post-MVP complète sur la même infra), backups fiables sans sur-ingénierie, rate limiting sans Redis.

**Solutions** : compteur IP en mémoire côté Server Action, script de backup automatisé vers R2, logs structurés accessibles dans Dokploy.

## Apprentissages

- Next.js App Router (Server Components, Server Actions, SSG/SSR/ISR, caching opt-in)
- Migration mentale depuis Angular : logique "backend-in-front"
- Design system moderne via libs hybrides (shadcn + Magic UI + Aceternity)
- TypeScript strict + Prisma type-safe
- Self-hosting moderne (Dokploy + Docker Compose + Cloudflare R2)
- Discipline documentaire : 14 ADRs + docs projet structurées (brainstorm, architecture, design, production)

## Évolutions prévues

- Dashboard admin single-user (Better Auth + Google OAuth + whitelist email)
- Chatbot RAG public (vitrine compétences IA, pgvector dans PostgreSQL)
- Mini-CRM interne (remplacement progressif du brouillon Notion)
- Blog + génération IA de contenu
- Analytics Umami self-hosted
- n8n self-hosted (orchestration workflows)
- Migration assets volumes Docker vers Cloudflare R2 (au moment du dashboard admin)
