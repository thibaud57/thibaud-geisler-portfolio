---
title: "PRODUCTION — Thibaud Geisler Portfolio"
description: "Documentation opérationnelle : release strategy, déploiement, monitoring, incidents et backup pour thibaud-geisler.com."
date: "2026-04-01"
keywords: ["production", "deployment", "monitoring", "incidents", "release", "dokploy", "docker"]
scope: ["docs", "ops"]
technologies: ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Docker", "Dokploy", "Pino"]
---

# 🚀 Release Strategy

## Versioning

**Schéma** : SemVer — `MAJOR.MINOR.PATCH`

- `MAJOR` : Breaking change ou refonte majeure de l'interface/BDD
- `MINOR` : Nouvelle fonctionnalité rétrocompatible (nouvelle page, nouvelle section)
- `PATCH` : Bugfix ou correction mineure

> **Exemple** : `v1.2.0` → 1ère version majeure, 2ème feature ajoutée, aucun bugfix

> **Milestone `v1.0.0`** : atteint après le premier déploiement Dokploy validé + toutes les features MVP livrées (accueil, projets, services, contact). Jusque-là, le projet reste en `0.x.x` (dev initial, API instable). Bump automatique via release-please depuis les commits Conventional (`feat:` → MINOR, `fix:` → PATCH, `feat!:` ou `BREAKING CHANGE` → MAJOR).

## Workflow Release

### Flow

```
feature/* → develop → main → tag vX.Y.Z   (flux normal — fin d'epic)
hotfix/*  → main → tag vX.Y.Z             (flux hotfix — bug critique prod)
```

### Flux Release

| Étape | Branch | Environnement | Déclencheur |
|-------|--------|---------------|-------------|
| Développement | `feature/*` | Local | — |
| Intégration | `develop` | Local | Merge feature/* → develop |
| Mise en production | `main` | Production (Dokploy) | Merge develop → main (epic terminé) |
| PR release (CHANGELOG + bump version) | `release-please--branches--main--*` | — | Auto à chaque merge sur `main` (release-please) |
| Tag release | — | — | Auto au merge de la PR release-please |
| Resync develop | `develop` | Local | `git pull origin main` après tag |

### Flux Hotfix (bug critique prod)

| Étape | Branch | Environnement | Déclencheur |
|-------|--------|---------------|-------------|
| Fix | `hotfix/*` depuis `main` | Local | — |
| Mise en production | `main` | Production (Dokploy) | Merge hotfix/* → main |
| Tag release | — | — | Auto au merge de la PR release-please |
| Resync develop | `develop` | Local | `git pull origin main` après tag |

## Convention Commits

**Format** : `type(scope optionnel): description`

| Type | Usage |
|------|-------|
| `feat` | Nouvelle fonctionnalité (`feat(projets): add case study page`) |
| `fix` | Correction de bug (`fix(contact): handle SMTP timeout`) |
| `docs` | Documentation uniquement |
| `refactor` | Refactoring sans changement fonctionnel |
| `test` | Ajout ou modification de tests |
| `chore` | Maintenance, dépendances, configuration Docker/Dokploy |

## Checklist Release

**Automatisé par GitHub Actions (vérifier le statut CI avant de merger) :**
- [ ] Tests passent (lint, typecheck, tests unitaires/intégration)
- [ ] Build sans erreurs TypeScript

**Manuel :**
- [ ] Variables d'environnement à jour dans Dokploy
- [ ] Merge vers `main` validé (develop → main fin d'epic, ou hotfix/* → main pour bug critique)
- [ ] Déploiement automatique Dokploy confirmé (onglet Deployments → statut ✅)
- [ ] Migrations Prisma appliquées — vérifier dans les logs Dokploy au démarrage du container
- [ ] Smoke test manuel : accueil, `/projets`, formulaire contact
- [ ] Security headers vérifiés si `next.config.ts` modifié (`curl -I https://thibaud-geisler.com`)
- [ ] PR release-please mergée après validation prod (smoke test + Dokploy ✅) → tag `vX.Y.Z` auto-créé

> **Politique de tagging** : les tags sont générés automatiquement par release-please au merge de la PR release sur `main` (fin d'epic ou hotfix critique). Les merges `feature/* → develop` ne déclenchent pas de release. **Merger la PR release-please uniquement après validation prod** (smoke test + Dokploy ✅) pour que le tag ne soit créé qu'après confirmation.

---

# 🌍 Environnements

## Liste Environnements

| Env | URL | Branch | Auto-deploy |
|-----|-----|--------|-------------|
| development | `http://localhost:3000` (`pnpm dev`) | — | Non |
| production | `https://thibaud-geisler.com` | `main` | Oui (webhook Dokploy) |

### Accès Dashboard Dokploy

- **URL** : `https://<IP_VPS_IONOS>:3000` (ou domaine configuré lors de l'installation Dokploy)
- **Onglets essentiels** :
  - `Settings → Environment Variables` : gérer les secrets
  - `Deployments` : historique des builds et logs de déploiement
  - `Logs` : logs temps réel stdout (Pino)

## Variables d'Environnement

> **Validation runtime** : toutes les vars typées et validées au boot via `src/env.ts` (`@t3-oss/env-nextjs` + Zod). Server vs client séparés. Fail-fast si une var server requise manque (`DATABASE_URL`, `SMTP_*`, `MAIL_TO`). `NEXT_PUBLIC_SITE_URL` côté client a un fallback `http://localhost:3000`. Bypass via `SKIP_ENV_VALIDATION=true` pour build CI/Docker et tests Vitest. **Exception** : `ASSETS_PATH` reste sur `process.env` direct (rule `nextjs/assets.md` impose lecture dynamique avec fallback `./assets` pour dev sans `.env`).

### Variables Communes

```bash
# Application
NODE_ENV=                           # development | production

# Assets (fichiers servis via /api/assets/[...path], sous-dossiers projets/{client,personal}/<slug>/)
ASSETS_PATH=                        # Dev local : ./assets | Prod Docker : /app/assets

# Calendly (widget inline /contact, exposé au navigateur — une URL par locale, event types FR/EN distincts)
NEXT_PUBLIC_CALENDLY_URL_FR=        # URL Calendly FR (ex: https://calendly.com/<slug>/<event-type-fr>)
NEXT_PUBLIC_CALENDLY_URL_EN=        # URL Calendly EN (ex: https://calendly.com/<slug>/<event-type-en>)
```

### Variables Secrets

```bash
# Via Dokploy → Application → Environment Variables

# Base de données
DATABASE_URL=                       # URL connexion PostgreSQL (ex: postgresql://user:pass@postgres:5432/db)
                                    # ⚠️ Utiliser le nom du service Docker comme host : "postgres", jamais "localhost"
                                    # ⚠️ Prisma 7 : la CLI ne charge plus .env automatiquement. En prod Dokploy, aucun impact (var injectée par Docker). En dev local : `@next/env` dans `prisma.config.ts` charge le .env.

# SMTP IONOS (formulaire contact)
SMTP_HOST=                         # Hôte SMTP IONOS (ex: smtp.ionos.fr)
SMTP_PORT=                         # Port SMTP (587 TLS ou 465 SSL)
SMTP_USER=                         # Compte SMTP (ex: contact@thibaud-geisler.com)
SMTP_PASS=                         # Mot de passe SMTP IONOS
SMTP_FROM=                         # Adresse expéditeur affichée

# Auth (post-MVP — dashboard admin, Better Auth + Google OAuth)
BETTER_AUTH_URL=                    # URL publique du site (ex: https://thibaud-geisler.com)
BETTER_AUTH_SECRET=                 # Secret de signature Better Auth (openssl rand -base64 32)
GOOGLE_CLIENT_ID=                   # Client ID OAuth Google (Google Cloud Console)
GOOGLE_CLIENT_SECRET=               # Client Secret OAuth Google (Google Cloud Console)
ADMIN_EMAIL=                        # Email unique autorisé (whitelist single-user, ex: contact@thibaud-geisler.com)

# API LLM (post-MVP — chatbot RAG public + génération IA de contenu dashboard)
LLM_API_KEY=                        # Clé API du fournisseur LLM retenu (voir ADR-012 : Anthropic, OpenAI ou Mistral)
LLM_MODEL=                          # Identifiant du modèle (ex: claude-haiku-4-5, gpt-4o-mini, mistral-small)
```

### Règles

- ✅ **Gérer tous les secrets dans Dokploy** : interface Settings → Environment Variables, jamais dans le dépôt Git
- ✅ **Documenter chaque variable** avec son rôle dans ce fichier
- ✅ **Préfixer `NEXT_PUBLIC_`** uniquement pour les variables exposées au navigateur

### Anti-Patterns

- ❌ **Ne jamais commiter de secrets** dans le dépôt (`.env`, `.env.local`, `.env.production`)
- ❌ **Ne pas mettre `DATABASE_URL` avec host `localhost`** en production — utiliser le nom du service Docker (`postgres`)
- ❌ **Ne pas exposer `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET` ou `SMTP_PASS`** via `NEXT_PUBLIC_`

---

# 🔄 Déploiement

## Pipeline

| Trigger | Étapes | Cible |
|---------|--------|-------|
| Push / PR sur n'importe quelle branche | lint, typecheck, tests (GitHub Actions) | — |
| Merge sur `main` | rebuild Docker + redéploiement (Dokploy webhook) | Production |

> GitHub Actions ne déploie pas : il garantit uniquement la qualité du code. Dokploy prend le relais dès que le merge atterrit sur `main`.

## Étapes de Déploiement Dokploy (Automatiques)

1. **Webhook reçu** → Dokploy démarre le rebuild
2. **Build Docker** → `docker build` exécute `pnpm build`, génère les artefacts Next.js
3. **Démarrage container** → `prisma migrate deploy` s'exécute via le `CMD` du Dockerfile avant le démarrage de Next.js (Prisma 7 : les vars d'env sont lues depuis l'environnement Docker, pas depuis `.env` — aucun impact en prod Dokploy)
4. **Health check** → Dokploy attend que le container écoute sur le port configuré (timeout ~30s)
5. **Bascule trafic** → si health check ✅, l'ancien container est arrêté et le trafic bascule

> ⚠️ **Migration longue** : si `prisma migrate deploy` dure plusieurs secondes (ex: `ALTER TABLE` sur table volumineuse), le health check peut timeout. Dans ce cas, augmenter le timeout de démarrage dans Dokploy ou exécuter la migration manuellement avant le déploiement.

## Rollback

**Déclencheur** : déploiement cassé, app ne démarre plus, régression critique détectée.

**Procédure** :
1. Ouvrir Dokploy → Application → onglet `Deployments`
2. Identifier le dernier déploiement stable (timestamp + statut ✅)
3. Cliquer "Redeploy" sur ce commit — Dokploy rebuilde et redéploie (~2-3 min)

> ⚠️ **Attention BDD** : le rollback du code ne défait pas les migrations Prisma déjà appliquées. Si la migration contenait un changement destructeur (`DROP COLUMN`, etc.), restaurer la BDD depuis le backup S3 (voir section Backup & Recovery) avant ou après le rollback.

## Checklist Pré-MEP

Notes de bootstrap non bloquantes en dev local. À activer **une fois** avant le tout premier merge `develop → main` qui déclenchera le premier déploiement Dokploy. Ce merge ouvrira la voie vers le milestone `v1.0.0` (MVP complet + prod stable).

- [x] **Dockerfile `output: 'standalone'`** — activé dans `next.config.ts`, stage `runner` copie `.next/standalone` + `.next/static` + `public/` + `CMD ["node", "server.js"]`. Réduit l'image Docker de ~1.2 GB à ~250 MB.
- [x] **Opt-out Turbopack build (Prisma WASM)** — `next build --webpack` actif dans le Dockerfile. À surveiller : [Prisma issue #29025](https://github.com/prisma/prisma/issues/29025) pour retirer quand le bug upstream est corrigé.
- [x] **Migrations auto au startup container** — stage `deploy-prisma` (pnpm deploy --legacy --prod) + CMD `node node_modules/prisma/build/index.js migrate deploy && node server.js`. `prisma migrate deploy` s'exécute atomiquement au démarrage de chaque container.

> Ces items étaient des optimisations et workarounds techniques (pas des ADRs : pas de décision architecturale structurelle). Implémentés au bootstrap Phase 6 et validés empiriquement.

> **Port 5432 et overrides dev** : l'exposition du port Postgres et les autres overrides dev-specific (bind-mount assets, override `DATABASE_URL`) sont isolés dans `compose.override.yaml` auto-chargé en local et ignoré par Dokploy. Aucune manip manuelle requise avant le premier déploiement.

### Cohérence documentaire (alignement specs ↔ implémentation)

- [ ] **BRAINSTORM.md** — auditer le doc dans son ensemble et identifier les écarts entre la vision/features livrées et l'impl
- [ ] **ARCHITECTURE.md** — auditer le doc dans son ensemble et identifier les écarts entre l'architecture documentée et l'impl
- [ ] **DESIGN.md** — auditer le doc dans son ensemble et identifier les écarts entre le design system et l'UI livrée
- [ ] **PRODUCTION.md** — auditer le doc dans son ensemble et vérifier que toutes les procédures opérationnelles documentées sont effectivement en place

## Checklist Post-MEP

À effectuer une fois après le premier déploiement Dokploy validé. La majorité de ces items nécessite que le site soit accessible publiquement (`https://thibaud-geisler.com`).

- [ ] **Search Console + Bing Webmaster** — vérifier propriété (DNS TXT) + soumettre `sitemap.xml`
- [ ] **Validation rich results JSON-LD** — [Google Rich Results Test](https://search.google.com/test/rich-results) sur `/a-propos` (Profile page) et pages internes (Breadcrumbs), FR + EN, 0 erreur
- [ ] **Accessibilité `/llms.txt`** — `curl` sur l'URL prod retourne le markdown attendu
- [ ] **Baseline Core Web Vitals** — [PageSpeed Insights](https://pagespeed.web.dev/) sur 4 pages clés × 2 locales, noter LCP/INP/CLS comme baseline

---

# 🔧 Mises à jour

## Composants applicatifs

| Composant | Fréquence | Procédure | Responsable |
|-----------|-----------|-----------|-------------|
| Dépendances npm | Mensuelle | `pnpm update` en local → vérifier build + tests → merge sur main | Dev |
| Next.js (major) | Sur release majeure | Suivre migration guide officiel → PR dédiée → smoke test prod | Dev |
| Image Docker Node | Trimestrielle | Mettre à jour le `FROM` dans `Dockerfile` → rebuild Dokploy | Dev |
| Image Docker Postgres | Trimestrielle | Mettre à jour la version dans `docker-compose.yml` → tester migration | Dev |

> ✅ **Toujours vérifier le build et les tests avant de merger une mise à jour de dépendances**
> ❌ **Ne jamais mettre à jour Next.js et Prisma simultanément** — isoler les mises à jour critiques
> ✅ **Dependabot** : activer via `.github/dependabot.yml` pour les PRs automatiques de sécurité et patch — la CI tourne sur chaque PR, merger manuellement après validation

---

# 🔐 Sécurité & Configuration

## Secrets & Configuration

### Gestion des Secrets

| Type | Stockage | Accès |
|------|----------|-------|
| Credentials SMTP | Dokploy — Environment Variables | Via `process.env` côté serveur uniquement (Server Actions) |
| `DATABASE_URL` | Dokploy — Environment Variables | Via `process.env` (Prisma client) |
| `BETTER_AUTH_SECRET` (post-MVP) | Dokploy — Environment Variables | Via `process.env` (Better Auth) |
| `GOOGLE_CLIENT_SECRET` (post-MVP) | Dokploy — Environment Variables | Via `process.env` côté serveur uniquement (flow OAuth) |
| `ADMIN_EMAIL` (post-MVP) | Dokploy — Environment Variables | Via `process.env` (whitelist single-user dans le hook de création) |
| `LLM_API_KEY` (post-MVP) | Dokploy — Environment Variables | Via `process.env` côté serveur uniquement (chatbot RAG + génération IA dashboard) |

### Rotation

| Secret | Fréquence | Procédure |
|--------|-----------|-----------|
| `SMTP_PASS` | En cas de compromission ou changement de mot de passe IONOS | Mettre à jour dans Dokploy → redéploiement automatique |
| `BETTER_AUTH_SECRET` | En cas de compromission | Régénérer (`openssl rand -base64 32`) → Dokploy → invalide toutes les sessions actives |
| `GOOGLE_CLIENT_SECRET` | En cas de compromission | Régénérer dans Google Cloud Console → mettre à jour dans Dokploy → redéploiement |
| `DATABASE_URL` (mot de passe) | En cas de compromission | `ALTER ROLE <user> PASSWORD 'newpass'` sur le container Postgres → mettre à jour dans Dokploy |

## Security Headers

Configurés dans `next.config.ts` (`poweredByHeader: false` activé — retire `X-Powered-By: Next.js`).

| Header | Valeur | Rôle |
|--------|--------|------|
| `X-Frame-Options` | `DENY` | Protection clickjacking |
| `X-Content-Type-Options` | `nosniff` | Empêche le MIME sniffing |
| `X-XSS-Protection` | `0` | Désactivé — CSP prend le relais (le filtre natif peut introduire des failles) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limite la fuite d'URL vers les sites externes |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Désactive les APIs navigateur inutilisées |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Force HTTPS sur 2 ans |
| `Content-Security-Policy` | Livrée par Feature 7 (cohérence avec gating cookies Calendly) | Whitelist des origines autorisées — protection XSS |

> ✅ **Vérifier après chaque modification de `next.config.ts`** : `curl -I https://thibaud-geisler.com`
> ❌ **Ne pas désactiver HSTS ou CSP en production**, même temporairement
> ℹ️ **CSP — origines tierces à prévoir** : Calendly (widget embed, MVP) et Umami (analytics, post-MVP) devront être explicitement autorisés. Implémentation livrée par Feature 7, en synchronisation avec le gating cookies Calendly.

## Rate Limiting

| Endpoint / Scope | Limite | Fenêtre | Mécanisme |
|-----------------|--------|---------|-----------|
| Formulaire contact (Server Action) | 5 requêtes | 10 min | Compteur IP in-memory (dans la Server Action) |
| `/api/chat` (post-MVP) | 20 requêtes | 1 h | À définir (voir ADR-014) |

---

# 📊 Observabilité

## Stack Monitoring

| Outil | Usage | Accès |
|-------|-------|-------|
| Dokploy Logs | Logs applicatifs stdout (Pino) en temps réel | Dokploy Dashboard → onglet "Logs" |
| Dokploy Deployments | Historique des builds et déploiements | Dokploy Dashboard → onglet "Deployments" |
| Umami (post-MVP) | Analytics visiteurs RGPD-friendly, sans cookies | Instance self-hosted Dokploy (voir ADR-007) |

## Métriques Clés

### Mesurables avec Dokploy Logs (MVP)

| Métrique | Seuil Warning | Seuil Critical | Mesure |
|----------|---------------|----------------|--------|
| Disponibilité du service | < 99% sur 24h | Service down | Dokploy notifications (email) |
| Taux d'erreur applicative | > 1% des events | > 5% | Compter `"level":"error"` dans les logs Pino |
| Échecs envoi email (SMTP) | > 2 erreurs/heure | > 10 erreurs/heure | Logs Pino — event `email:failed` |
| Rate limit formulaire déclenché | > 5 fois/heure | > 20 fois/heure | Logs Pino — niveau `warn` |

### À mesurer post-déploiement (outils externes)

| Métrique | Target | Outil |
|----------|--------|-------|
| LCP pages publiques | < 2.5s | [PageSpeed Insights](https://pagespeed.web.dev/) ou Google Search Console |
| INP — pages interactives | < 200ms | [PageSpeed Insights](https://pagespeed.web.dev/) ou package `web-vitals` côté client |
| CLS — pages publiques | < 0.1 | [PageSpeed Insights](https://pagespeed.web.dev/) ou Google Search Console (impacté par le banner cookies de Feature 7) |
| TTFB page accueil (SSG) | < 200ms | `curl -o /dev/null -s -w "%{time_starttransfer}\n" https://thibaud-geisler.com` |
| TTFB page `/projets` (SSR) | < 500ms | Lighthouse (DevTools → Network) |
| Durée Server Action formulaire | < 3s (hors SMTP) | Pino logs instrumentés dans la Server Action |

## Alertes

| Alerte | Condition | Canal |
|--------|-----------|-------|
| Service down | Conteneur Next.js ou Postgres arrêté | Notification Dokploy (email) |
| Échec de déploiement | Build échoué ou crash au démarrage | Notification Dokploy (email) |
| Erreur BDD répétée | `"cannot connect to database"` dans les logs Pino | Vérification manuelle — `docker ps` sur le VPS |
| Échec SMTP répété | > 3 erreurs `email:failed` consécutives | Vérification manuelle — credentials SMTP IONOS |

---

# 📝 Logging

## Format

### Structure

JSON structuré via Pino — output stdout, visible dans l'onglet Logs de Dokploy.

```json
{
  "level": "info | warn | error",
  "time": 1711929600000,
  "msg": "Description lisible de l'événement",
  "req": {
    "method": "POST",
    "url": "/api/contact",
    "id": "uuid"
  },
  "err": "stack trace si applicable"
}
```

### Exemples Réels

**Envoi email réussi :**
```json
{ "level": "info", "time": 1711929600000, "msg": "Email sent", "event": "email:sent", "recipient": "contact@client.com", "duration_ms": 1200 }
```

**Échec SMTP :**
```json
{ "level": "error", "time": 1711929603000, "msg": "SMTP send failed", "event": "email:failed", "err": "Error: connect ECONNREFUSED 127.0.0.1:587" }
```

**Erreur Prisma :**
```json
{ "level": "error", "time": 1711929605000, "msg": "Database query failed", "query": "findUnique Project", "err": "PrismaClientKnownRequestError: ..." }
```

## Niveaux

| Level | Usage |
|-------|-------|
| `debug` | Développement local uniquement (désactivé en production) |
| `info` | Événements normaux (email envoyé, page rendue, requête Prisma) |
| `warn` | Comportements anormaux non bloquants (rate limit déclenché, tentative auth échouée) |
| `error` | Erreurs bloquantes (échec SMTP, erreur BDD, crash Server Action) |

## Rétention

| Env | Rétention | Gestion |
|-----|-----------|---------|
| development | Terminal local, pas de rétention | — |
| production | Logs Docker sur disque VPS | À configurer dès le premier déploiement dans `docker-compose.yml` — Dokploy ne gère pas la rotation automatiquement. Valeurs recommandées : `max-size: "100m"`, `max-file: "10"` par service |

## Règles Logging

### Règles

- ✅ **Logger les appels SMTP** : succès/échec, destinataire (sans contenu du message)
- ✅ **Logger les erreurs avec contexte** : route, action, message d'erreur, stack trace
- ✅ **Utiliser les niveaux Pino** de manière cohérente (`logger.info`, `logger.error`, etc.)

### Anti-Patterns

- ❌ **Ne jamais logger de secrets** : `SMTP_PASS`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET`
- ❌ **Ne jamais logger le contenu des messages de contact** (données personnelles — RGPD)
- ❌ **Ne pas utiliser `console.log` en production** — passer systématiquement par le logger Pino
- ❌ **Ne pas logger à niveau `debug` en production** — impact performance

---

# 🚨 Incident Response

## Sévérités

| Sévérité | Définition | Exemples | Response Time | Action |
|----------|------------|----------|---------------|--------|
| 🔴 P1 — Critique | Site complètement indisponible ou fuite de données | Page 500 pour tous > 5 min, secrets exposés en logs | < 30 min | Intervention immédiate, rollback si nécessaire |
| 🟡 P2 — Majeur | Fonctionnalité critique dégradée | Formulaire contact KO, pages projets inaccessibles | < 4h | Correction prioritaire dans la journée |
| 🟢 P3 — Mineur | Dégradation cosmétique ou partielle | Typo, style cassé, feature non-critique inaccessible | < 48h | Inclure dans le prochain déploiement |

## Investigation Checklist

Avant de déployer un fix, diagnostiquer la cause :

1. **Logs Dokploy** → onglet "Logs" → filtrer par `"level":"error"` → lire les 50 lignes autour du timestamp de l'incident
2. **Statut des containers** → SSH sur le VPS → `docker ps` — vérifier que `nextjs` et `postgres` sont `Up`
3. **Logs Docker bruts** → `docker logs <container_id> --tail 100`
4. **Connexion BDD** → `docker exec <postgres_container> psql -U postgres -d <db> -c "SELECT 1;"` — vérifier que Postgres répond
5. **Dernier déploiement** → Dokploy → onglet Deployments → quel commit a précédé l'incident ?
6. **Rollback** si la cause est un commit récent → voir section Déploiement — Rollback

## Contacts

| Rôle | Nom | Canal | Disponibilité |
|------|-----|-------|---------------|
| Owner & On-call | Thibaud Geisler | Email IONOS | P1 : immédiat — P2/P3 : heures ouvrées |

## Post-mortem Template

```markdown
## Incident: <titre>
**Date**: <date>
**Durée**: <durée>
**Sévérité**: <P1 | P2 | P3>

### Timeline
- HH:MM - Détection de l'incident
- HH:MM - Début de l'investigation
- HH:MM - Identification de la root cause
- HH:MM - Déploiement du fix
- HH:MM - Résolution confirmée

### Root Cause
<Description technique précise de la cause racine>

### Impact
<Pages/fonctionnalités impactées, durée, visiteurs potentiellement affectés>

### Actions
- [ ] <Action corrective immédiate>
- [ ] <Action préventive à long terme>
- [ ] <Amélioration du monitoring/alerting si applicable>
```

---

# 💾 Backup & Recovery

## Stratégie Backup

| Ressource | Fréquence | Rétention | Localisation |
|-----------|-----------|-----------|--------------|
| PostgreSQL (pg_dump) | Quotidien (cron VPS) | 7 jours | Cloudflare R2 (gratuit jusqu'à 10 GB) |
| Assets Docker volume | Quotidien (cron VPS) | 7 jours | Cloudflare R2 (même bucket) |

> **Assets (MVP)** : stockés en Docker volume (ADR-011 acté). Migration vers Cloudflare R2 prévue lors de l'implémentation de l'upload dashboard admin.

> ✅ **Rétention R2** : configurer une règle de lifecycle dans le dashboard Cloudflare R2 (Bucket → Settings → Lifecycle rules → delete after 7 days). Plus fiable que `rclone delete --min-age 7d` car indépendant du cron — si activée, la ligne `rclone delete` du script peut être supprimée.

## Configuration Backup (Setup initial)

### 1. Installer rclone sur le VPS

```bash
curl https://rclone.org/install.sh | sudo bash
```

### 2. Configurer rclone pour Cloudflare R2

```bash
rclone config
# Type : s3
# Provider : Cloudflare
# Access Key ID : <Cloudflare R2 Dashboard → Manage API Tokens>
# Secret Access Key : <idem>
# Endpoint : https://<ACCOUNT_ID>.r2.cloudflarestorage.com
# Sauvegarder la config
```

### 3. Créer le script `/opt/backup.sh`

> **Noms des containers** : Docker Compose nomme les containers `{COMPOSE_PROJECT}-{service}-{instance}`. `COMPOSE_PROJECT` = valeur du champ `name:` dans `docker-compose.yml`, ou par défaut le nom du répertoire. Vérifier avec `docker ps` après le premier déploiement.

```bash
#!/bin/bash
set -e
BACKUP_DIR=/tmp/backups
DB_CONTAINER=<COMPOSE_PROJECT>-postgres-1  # vérifier : docker ps | grep postgres
DB_NAME=<DB_NAME>                           # nom de la base PostgreSQL (défini dans docker-compose.yml)
R2_BUCKET=<R2_BUCKET_NAME>                  # nom du bucket Cloudflare R2

mkdir -p $BACKUP_DIR
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Dump PostgreSQL
docker exec $DB_CONTAINER pg_dump -U postgres $DB_NAME | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Backup du volume assets (si applicable)
docker run --rm -v <COMPOSE_PROJECT>_assets:/data -v $BACKUP_DIR:/backup alpine \
  tar czf /backup/assets_$TIMESTAMP.tar.gz /data 2>/dev/null || true

# Upload vers R2
rclone copy $BACKUP_DIR r2:$R2_BUCKET/backups/

# Nettoyage local (> 1 jour) et R2 (> 7 jours)
find $BACKUP_DIR -name "*.gz" -mtime +1 -delete
rclone delete r2:$R2_BUCKET/backups/ --min-age 7d
```

```bash
chmod +x /opt/backup.sh
```

### 4. Configurer le cron

```bash
crontab -e
# Ajouter :
2 2 * * * /opt/backup.sh >> /var/log/backup.log 2>&1
```

### 5. Vérifier le setup

```bash
/opt/backup.sh
rclone ls r2:<R2_BUCKET_NAME>/backups/
```

## Recovery

| Scénario | RTO | RPO | Procédure |
|----------|-----|-----|-----------|
| Corruption BDD / suppression accidentelle | < 2h | < 24h | Voir procédure ci-dessous |
| Perte du VPS (crash total) | < 4h | < 24h | Voir procédure ci-dessous |
| Déploiement cassé (app ne démarre plus) | < 30 min | N/A | Rollback Dokploy — voir section Déploiement |

> **RTO** = Recovery Time Objective (temps max pour restaurer le service)
> **RPO** = Recovery Point Objective (perte de données max acceptable)

### Procédure : Restauration BDD

```bash
# 1. Lister les backups disponibles
rclone ls r2:<R2_BUCKET_NAME>/backups/ | grep db_ | sort

# 2. Télécharger le backup cible
rclone copy r2:<R2_BUCKET_NAME>/backups/db_YYYYMMDD_HHMMSS.sql.gz /tmp/

# 3. Mettre l'app en pause pour éviter les writes pendant la restauration
docker pause <COMPOSE_PROJECT>-nextjs-1     # vérifier : docker ps | grep nextjs

# 4. Restaurer
gunzip -c /tmp/db_YYYYMMDD_HHMMSS.sql.gz | docker exec -i <COMPOSE_PROJECT>-postgres-1 psql -U postgres <DB_NAME>

# 5. Relancer
docker unpause <COMPOSE_PROJECT>-nextjs-1

# 6. Smoke test
curl -I https://thibaud-geisler.com
```

> ⚠️ Si l'incident est survenu après le dernier backup (< 24h), les modifications récentes sont perdues — c'est le RPO de 24h. Vérifier le timestamp du backup avant de restaurer.

### Procédure : Perte VPS Totale

1. Créer un nouveau VPS IONOS avec la même spec
2. Installer Dokploy (voir [ADR-005](adrs/005-hebergement-dokploy-vs-vercel.md))
3. Reconfigurer les variables d'environnement dans Dokploy
4. Reconfigurer le webhook GitHub → Dokploy
5. Déclencher un redéploiement — Dokploy rebuild et redémarre automatiquement
6. Restaurer la BDD depuis le dernier backup S3 (voir procédure ci-dessus)
7. Smoke test complet

---

# ⚡ Performance

## Benchmarks

| Page/Feature | Target | Outil de mesure |
|--------------|--------|-----------------|
| Page accueil (SSG) — TTFB | < 200ms | `curl -o /dev/null -s -w "%{time_starttransfer}\n" https://thibaud-geisler.com` |
| Page `/projets` (SSR) — TTFB | < 500ms | Lighthouse (DevTools → Network → TTFB) |
| Page `/projets/[slug]` (SSR) — TTFB | < 500ms | Lighthouse (DevTools) |
| LCP — pages publiques | < 2.5s | [PageSpeed Insights](https://pagespeed.web.dev/) ou Google Search Console |
| Server Action formulaire contact | < 3s (hors SMTP) | Instrumenter avec `Date.now()` dans la Server Action → Pino logs |

> Prendre une baseline après le premier déploiement production. Mesurer à nouveau après chaque optimisation significative.

## Optimisations

- [ ] Surveiller la taille des bundles JS (`next build` → rapport de bundles)
- [ ] Vérifier les Core Web Vitals après mise en production initiale (Google Search Console)
- [ ] Baseline LCP/INP/CLS via [PageSpeed Insights](https://pagespeed.web.dev/) sur 4 pages clés × 2 locales au premier déploiement
- [ ] Lazy load du banner cookies (Feature 7) pour préserver INP, position `fixed` pour CLS = 0
- [ ] `priority` sur l'image LCP above-the-fold (cf. `.claude/rules/nextjs/images-fonts.md`)

> La revalidation type ISR est déjà en place via `cacheComponents: true` + `'use cache'` + `cacheTag('projects')` sur les queries mises en cache. Invalidation ciblée via `revalidateTag('projects')` depuis les Server Actions admin (post-MVP).

---

# 🔗 Ressources

## Documentation Officielle

- [Dokploy](https://dokploy.com/docs)
- [Docker Compose](https://docs.docker.com/compose/)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
- [Prisma Migrate Deploy](https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-deploy)
- [Better Auth](https://better-auth.com/docs) — auth dashboard (configuration, variables d'environnement)
- [Better Auth — Google provider](https://better-auth.com/docs/authentication/google) — setup OAuth Google
- [Google Cloud Console — OAuth 2.0](https://console.cloud.google.com/apis/credentials) — création du Client ID / Client Secret
- [Pino](https://getpino.io)
- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [rclone — Cloudflare R2](https://rclone.org/s3/#cloudflare-r2)
- [PostgreSQL pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)

## Ressources Complémentaires

- [The Twelve-Factor App](https://12factor.net/)
- [SRE Book](https://sre.google/sre-book/table-of-contents/)
