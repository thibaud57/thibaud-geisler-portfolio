# Robots.txt avec déclaration du sitemap — Plan d'implémentation (sub-project 04 / Feature 5 SEO)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec source :** [docs/superpowers/specs/seo-referencement/04-robots-txt-design.md](../../specs/seo-referencement/04-robots-txt-design.md)

**Goal :** Exposer `/robots.txt` (1 fichier `src/app/robots.ts`, ~12 lignes) qui autorise le crawl public, bloque `/api/` et déclare l'URL absolue du sitemap dynamique.

**Architecture :** Convention Next.js 16 `app/robots.ts` retournant `MetadataRoute.Robots` (objet `{ rules: { userAgent, allow, disallow }, sitemap }`). Réutilisation du helper `siteUrl` du sub-project 01 avec normalisation du trailing slash (alignée sur `buildSitemapEntries` du sub-project 03). Aucune logique conditionnelle par environnement (le `noindex` hors prod est géré côté metadata HTML par `buildPageMetadata` du sub-project 01). Aucun test automatisé (`tdd_scope: none`, no-lib-test).

**Tech Stack :** Next.js 16.2.4 App Router · TypeScript 6 strict · `MetadataRoute.Robots` natif Next.js · `output: 'standalone'`, `cacheComponents: true`.

**Rules à respecter (lecture dynamique) :**
- `.claude/rules/nextjs/metadata-seo.md` (cœur : convention `app/robots.ts`, format `MetadataRoute.Robots`)
- `.claude/rules/nextjs/routing.md`
- `.claude/rules/typescript/conventions.md`

**ADRs liés :** ADR-001 (monolithe Next.js, route handler dans la même app), ADR-006 (hub de démos, robots.txt référence le sitemap du portfolio uniquement).

**Politique commits :** Pas de commit en cours de plan. La séquence complète est validée puis le user déclenche un commit unique en fin de workflow d'implémentation (cf. `~/.claude/CLAUDE.md` § Discipline commit).

---

## File Structure

| Fichier | Action | Rôle |
|---|---|---|
| `src/app/robots.ts` | Créer | Export default d'une fonction synchrone retournant `MetadataRoute.Robots`. ~12 lignes. |

**Non touchés** : `src/lib/seo.ts` (sub-project 01 inchangé, on consomme `siteUrl` tel quel), `src/app/sitemap.ts` (sub-project 03 inchangé, on référence `/sitemap.xml` sans modifier le sitemap), `next.config.ts`, `messages/{fr,en}.json`, `package.json`, `prisma/schema.prisma`.

---

## Task 1 : Créer `src/app/robots.ts`

**Files :**
- Create: `src/app/robots.ts`

- [ ] **Step 1 : Créer le fichier `src/app/robots.ts`**

```typescript
import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl.replace(/\/$/, '')

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: `${base}/sitemap.xml`,
  }
}
```

> **Notes** :
> - `siteUrl.replace(/\/$/, '')` normalise le trailing slash de `NEXT_PUBLIC_SITE_URL` pour éviter un `https://thibaud-geisler.com//sitemap.xml` si la variable d'env contient un `/` final (même logique que `buildSitemapEntries` du sub-project 03).
> - `MetadataRoute.Robots` est typé nativement par Next.js 16 (export depuis `'next'`).
> - Pas de `'use cache'` ni `cacheLife` : le robots.txt est statique au build (aucune Request-time API utilisée), Next.js le sert avec un Cache-Control long par défaut.
> - Pas de `runtime: 'nodejs'` explicite : la fonction est synchrone et n'utilise pas `process.cwd()`, le runtime par défaut Next.js suffit.
> - Le route group `(admin)` n'apparaît pas dans les URLs publiques (les route groups sont ignorés dans le path final), donc inutile de l'ajouter à `disallow`. Quand le dashboard arrivera post-MVP, on étendra avec `disallow: ['/api/', '/dashboard']`.

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur. Vérifier que le retour est compatible `MetadataRoute.Robots`.

---

## Task 2 : Quality gates statiques

**Files :** aucun, lancement des outils.

- [ ] **Step 1 : Lint**

Run : `pnpm lint` (ou `just lint`)
Expected : 0 erreur, 0 warning bloquant. Pas de violation des règles ESLint sur le nouveau fichier.

- [ ] **Step 2 : Typecheck complet**

Run : `just typecheck` (lance `pnpm next typegen && pnpm typecheck`)
Expected : 0 erreur. Vérifier que `MetadataRoute.Robots` est correctement résolu depuis le package `next`.

- [ ] **Step 3 : Tests unit (vérifier qu'aucune régression)**

Run : `just test-unit` (`pnpm vitest run --project unit --passWithNoTests`)
Expected : tous les tests existants (sub-projects 01 + 03) passent. Aucun nouveau test attendu (`tdd_scope: none` confirmé par no-lib-test).

- [ ] **Step 4 : Tests integration (vérifier qu'aucune régression)**

Run : `just test-integration`
Expected : suites integration vertes. Le sub-project 04 ne touche ni aux Server Actions, ni aux queries Prisma, ni aux endpoints API.

- [ ] **Step 5 : Build standalone**

Run : `pnpm build`
Expected : build complet sans erreur. Vérifier que `next build` liste `/robots.txt` comme route statique sans warning. La route doit apparaître dans la liste de sortie du build (typiquement marquée `○ Static`).

---

## Task 3 : Validation manuelle end-to-end (3 scénarios spec)

**Files :** aucun, vérification HTTP.

> **Pré-requis** : `.env` rempli avec `NEXT_PUBLIC_SITE_URL=http://localhost:3000` en local (la valeur exacte de prod sera substituée via Dokploy au déploiement).

- [ ] **Step 1 : Mode dev — contenu exact attendu**

Run : `pnpm dev` (laisser tourner en arrière-plan).

Une fois le serveur démarré sur le port 3000 :

Run : `curl -s http://localhost:3000/robots.txt`
Expected (sortie exacte attendue) :
```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: http://localhost:3000/sitemap.xml
```

(en local, `siteUrl = 'http://localhost:3000'` car `NEXT_PUBLIC_SITE_URL` pointe localhost en dev)

- [ ] **Step 2 : Vérifier `Content-Type`**

Run : `curl -sI http://localhost:3000/robots.txt | grep -i 'content-type'`
Expected : `Content-Type: text/plain` (avec ou sans `; charset=utf-8`).

- [ ] **Step 3 : Couvre Scénario 2 spec — URL Sitemap absolue**

Run : `curl -s http://localhost:3000/robots.txt | grep ^Sitemap:`
Expected : `Sitemap: http://localhost:3000/sitemap.xml` (URL absolue, commence par `http://` ou `https://`, jamais relative).

- [ ] **Step 4 : Stopper le serveur dev**

Run : `just stop` (ou `Ctrl+C` sur le terminal qui tient `pnpm dev`).

- [ ] **Step 5 : Mode prod — Scénario 1 spec confirmé**

Run : `pnpm build && pnpm start`
Expected : `next start` écoute sur `http://localhost:3000`. `NODE_ENV` = `production` automatique.

Run : `curl -s http://localhost:3000/robots.txt`
Expected : sortie identique au Step 1 (le robots.txt n'a pas de logique conditionnelle env, donc dev et prod produisent le même contenu modulo la valeur de `siteUrl`).

- [ ] **Step 6 : Vérifier que `/robots.txt` reste accessible et bien typé en prod**

Run : `curl -sI http://localhost:3000/robots.txt | grep -E 'HTTP|Content-Type'`
Expected : `HTTP/1.1 200 OK` + `Content-Type: text/plain`.

- [ ] **Step 7 : Test cohérence avec sitemap (intégration sub-project 03)**

Le robots.txt déclare `Sitemap: <siteUrl>/sitemap.xml` ; vérifier que cette URL est bien servie par le sub-project 03 :

Run : `curl -sI http://localhost:3000/sitemap.xml | grep -E 'HTTP|Content-Type'`
Expected : `HTTP/1.1 200 OK` + `Content-Type: application/xml` (ou équivalent). Confirme la cohérence entre les deux sub-projects.

- [ ] **Step 8 : Stopper le serveur prod**

Run : `just stop`.

- [ ] **Step 9 : Scénario 3 spec — validation Search Console (déférable post-déploiement)**

> **Note** : ce scénario nécessite un déploiement réel sur le domaine `https://thibaud-geisler.com`. À effectuer une fois la PR mergée et déployée via Dokploy. Hors scope du plan local.

Quand le projet sera déployé en prod :
1. Ouvrir [Google Search Console](https://search.google.com/search-console) sur la propriété `https://thibaud-geisler.com/`.
2. Aller dans "Settings" → "robots.txt" (ou utiliser l'outil "Robots.txt Tester" historique).
3. Vérifier que Google reconnaît le format sans erreur de parsing.
4. Vérifier dans "Sitemaps" que `https://thibaud-geisler.com/sitemap.xml` est détecté ou peut être soumis manuellement.

Cette étape valide définitivement le scénario 3 du spec mais peut être déférée jusqu'au premier déploiement Dokploy en production.

---

## Self-review (post-écriture, fait par l'auteur du plan)

1. **Couverture spec** :
   - Création de `src/app/robots.ts` retournant `MetadataRoute.Robots` → Task 1 ✅
   - Format exact du contenu (`User-agent: *`, `Allow: /`, `Disallow: /api/`, ligne vide, `Sitemap: <siteUrl>/sitemap.xml`) → Task 1 (code complet) + Task 3 Step 1 (validation curl) ✅
   - URL Sitemap absolue construite via `siteUrl` → Task 1 (import `siteUrl` du sub-project 01) ✅
   - Normalisation trailing slash → Task 1 (`siteUrl.replace(/\/$/, '')` documenté) ✅
   - Pas de logique conditionnelle par env (cohérent avec sub-project 01 qui gère le `noindex` côté metadata HTML) → Task 1 (aucune branche `NODE_ENV`) ✅
   - 3 scénarios Acceptance criteria → Task 3 (Steps 1-3 et Step 9 pour Search Console) ✅
   - Edge case trailing slash → Task 1 Step 1 (couvert par la normalisation) ✅
   - Edge case `NEXT_PUBLIC_SITE_URL` absente → couvert par le fallback `'http://localhost:3000'` de `src/lib/seo.ts` (sub-project 01, déjà présent) ✅
   - Pas de modification de `src/lib/seo.ts`, `src/app/sitemap.ts`, `next.config.ts`, `messages/*.json` → respecté ✅
   - Aucun fichier `.test.ts` créé (`tdd_scope: none`) → respecté (Task 2 lance les tests existants pour non-régression uniquement) ✅

2. **Placeholder scan** :
   - Aucun `TBD` / `TODO` / `à compléter` dans le snippet de code.
   - Toutes les commandes `pnpm` / `just` / `curl` sont exactes et reproductibles.
   - Aucun "similar to Task N" : le plan ne contient qu'un seul fichier de code, pas de duplication possible.
   - Le scénario 3 Search Console est explicitement marqué "déférable post-déploiement" avec instructions concrètes.

3. **Type consistency** :
   - `MetadataRoute.Robots` (Task 1) est le type natif Next.js, importé depuis `'next'`.
   - `siteUrl` (Task 1) est une `string` exportée par `src/lib/seo.ts` (sub-project 01).
   - `base` (variable locale Task 1) est de type `string` après `replace`.
   - Les propriétés de l'objet retourné (`rules.userAgent`, `rules.allow`, `rules.disallow`, `sitemap`) correspondent exactement à la signature de `MetadataRoute.Robots`.

Plan complet.
