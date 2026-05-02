# Fichier llms.txt pour AI engines: Plan d'implémentation (sub-project 06 / Feature 5 SEO)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec source :** [docs/superpowers/specs/seo-referencement/06-llms-txt-design.md](../../specs/seo-referencement/06-llms-txt-design.md)

**Goal :** Exposer `/llms.txt` à la racine du domaine au format llmstxt.org pour fournir aux AI engines (ChatGPT, Perplexity, Claude search) une carte structurée et machine-readable du portfolio.

**Architecture :** Route handler Next.js GET (`src/app/llms.txt/route.ts`) qui retourne un markdown UTF-8 conforme llmstxt.org (H1 + blockquote + sections H2 Pages + Optional) en `Content-Type: text/plain; charset=utf-8`. Réutilise `siteUrl` du sub-project 01 avec normalisation du trailing slash (cohérent avec sub-projects 03 et 04). Cache-Control 1h fresh + 24h stale-while-revalidate. Aucun test automatisé (`tdd_scope: none`, no-lib-test).

**Tech Stack :** Next.js 16.2.4 App Router · TypeScript 6 strict · `output: 'standalone'`.

**Rules à respecter (lecture dynamique) :**
- `.claude/rules/nextjs/api-routes.md` (cœur : route handler GET, retour `Response`, content-type explicite)
- `.claude/rules/nextjs/routing.md`
- `.claude/rules/typescript/conventions.md`

**ADRs liés :** ADR-001 (monolithe Next.js, route handler dans la même app), ADR-006 (hub de démos, llms.txt oriente les AI engines vers les pages portfolio).

**Politique commits :** Pas de commit en cours de plan. La séquence complète est validée puis le user déclenche un commit unique en fin de workflow d'implémentation (cf. `~/.claude/CLAUDE.md` § Discipline commit).

---

## File Structure

| Fichier | Action | Rôle |
|---|---|---|
| `src/app/llms.txt/route.ts` | Créer | Route handler GET retournant le markdown llmstxt.org en `text/plain`. ~30 lignes. |

**Non touchés** : `src/lib/seo.ts` (read-only via import `siteUrl`), `src/config/social-links.ts` (URLs hardcodées dans le template string, pas d'import dynamique), `src/app/robots.ts` (sub-project 04 inchangé, le `User-agent: *` autorise déjà les AI crawlers), `next.config.ts`, `package.json`, `messages/{fr,en}.json`, `prisma/schema.prisma`.

---

## Task 1 : Créer `src/app/llms.txt/route.ts`

**Files :**
- Create: `src/app/llms.txt/route.ts`

- [ ] **Step 1 : Créer le fichier `src/app/llms.txt/route.ts`**

```typescript
import { siteUrl } from '@/lib/seo'

export async function GET(): Promise<Response> {
  const base = siteUrl.replace(/\/$/, '')

  const body = `# Thibaud Geisler

> Freelance AI engineer & full-stack developer. Portfolio with services, case studies, and AI training offerings.

## Pages
- [Home](${base}/fr): positioning and services overview
- [Services](${base}/fr/services): AI & automation, full-stack development, corporate AI training
- [Projects](${base}/fr/projets): case studies (client and personal)
- [About](${base}/fr/a-propos): background, expertise, work approach
- [Contact](${base}/fr/contact): scheduling and contact form

## Optional
- [Sitemap](${base}/sitemap.xml)
- [LinkedIn](https://www.linkedin.com/in/thibaud-geisler/)
- [GitHub](https://github.com/thibaud57)
`

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}
```

> **Notes** :
> - `siteUrl.replace(/\/$/, '')` normalise le trailing slash de `NEXT_PUBLIC_SITE_URL` (cohérent avec `buildSitemapEntries` du sub-project 03 et `app/robots.ts` du sub-project 04).
> - Liens préfixés `/fr/` car `localePrefix: 'always'` dans `src/i18n/routing.ts` (pas d'URL `/services` non préfixée). On pointe sur la version FR par défaut (`routing.defaultLocale = 'fr'`).
> - URLs LinkedIn/GitHub hardcodées dans le template string (chrome stable, pas besoin de réimporter `SOCIAL_LINKS` pour 2 valeurs).
> - `Content-Type: text/plain; charset=utf-8` explicite (et non `text/markdown` qui est moins universellement reconnu).
> - Pas d'import `'server-only'` : route handler natif côté serveur, pas de risque d'import client.
> - `async function GET()` car la signature Next.js attend une fonction qui peut être async (même si on n'await rien ici).

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur. Vérifier que `Response` est correctement typé et que l'import `siteUrl` résout.

---

## Task 2 : Quality gates statiques

**Files :** aucun, lancement des outils.

- [ ] **Step 1 : Lint**

Run : `pnpm lint` (ou `just lint`)
Expected : 0 erreur, 0 warning bloquant.

- [ ] **Step 2 : Typecheck complet**

Run : `just typecheck` (lance `pnpm next typegen && pnpm typecheck`)
Expected : 0 erreur. Vérifier que la route `/llms.txt` est typée correctement par `next typegen` (présente dans `.next/types/`).

- [ ] **Step 3 : Tests unit (vérifier qu'aucune régression)**

Run : `just test-unit` (`pnpm vitest run --project unit --passWithNoTests`)
Expected : tous les tests existants (sub-projects 01 + 03 + 05) passent. Aucun nouveau test attendu (`tdd_scope: none`).

- [ ] **Step 4 : Tests integration (vérifier qu'aucune régression)**

Run : `just test-integration`
Expected : suites integration vertes. Le sub-project 06 ne touche ni Server Actions ni queries Prisma.

- [ ] **Step 5 : Build standalone**

Run : `pnpm build`
Expected : build complet sans erreur. Vérifier que `next build` liste `/llms.txt` comme route dynamique sans warning.

---

## Task 3 : Validation manuelle end-to-end (3 scénarios spec)

**Files :** aucun, vérification HTTP.

- [ ] **Step 1 : Mode dev: contenu attendu**

Run : `pnpm dev` (laisser tourner en arrière-plan).

Une fois le serveur démarré sur le port 3000 :

Run : `curl -s http://localhost:3000/llms.txt`
Expected (sortie attendue, locale dev avec `siteUrl=http://localhost:3000`) :

```
# Thibaud Geisler

> Freelance AI engineer & full-stack developer. Portfolio with services, case studies, and AI training offerings.

## Pages
- [Home](http://localhost:3000/fr): positioning and services overview
- [Services](http://localhost:3000/fr/services): AI & automation, full-stack development, corporate AI training
- [Projects](http://localhost:3000/fr/projets): case studies (client and personal)
- [About](http://localhost:3000/fr/a-propos): background, expertise, work approach
- [Contact](http://localhost:3000/fr/contact): scheduling and contact form

## Optional
- [Sitemap](http://localhost:3000/sitemap.xml)
- [LinkedIn](https://www.linkedin.com/in/thibaud-geisler/)
- [GitHub](https://github.com/thibaud57)
```

- [ ] **Step 2 : Vérifier `Content-Type` et `Cache-Control`**

Run : `curl -sI http://localhost:3000/llms.txt | grep -E 'Content-Type|Cache-Control'`
Expected :
- `Content-Type: text/plain; charset=utf-8`
- `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`

- [ ] **Step 3 : Couvre Scénario 1 spec: structure valide**

Run : `curl -s http://localhost:3000/llms.txt | head -1`
Expected : `# Thibaud Geisler`

Run : `curl -s http://localhost:3000/llms.txt | grep -c '^## '`
Expected : `2` (sections `## Pages` et `## Optional`)

Run : `curl -s http://localhost:3000/llms.txt | grep -c '^- \['`
Expected : `8` (5 liens Pages + 3 liens Optional)

- [ ] **Step 4 : Couvre Scénario 2 spec: URLs absolues**

Run : `curl -s http://localhost:3000/llms.txt | grep -E 'http://localhost:3000/sitemap.xml'`
Expected : ligne avec le lien sitemap absolu présent.

Run : `curl -s http://localhost:3000/llms.txt | grep -cE '\(http://localhost:3000/fr'`
Expected : `5` (5 pages préfixées `/fr/`).

- [ ] **Step 5 : Stopper le serveur dev**

Run : `just stop` (ou `Ctrl+C` sur le terminal `pnpm dev`).

- [ ] **Step 6 : Mode prod: Scénario 3 spec confirmé**

Run : `pnpm build && pnpm start`
Expected : `next start` écoute sur `http://localhost:3000`. `NODE_ENV=production` automatique.

Run : `curl -sI http://localhost:3000/llms.txt | grep -E 'HTTP|Content-Type|Cache-Control'`
Expected :
- `HTTP/1.1 200 OK`
- `Content-Type: text/plain; charset=utf-8`
- `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` (Scénario 3 spec)

Run : `curl -s http://localhost:3000/llms.txt`
Expected : sortie identique au Step 1 modulo la valeur de `siteUrl` (le contenu reste statique en dev et en prod, seules les URLs absolues changent selon `NEXT_PUBLIC_SITE_URL`).

- [ ] **Step 7 : Stopper le serveur prod**

Run : `just stop`.

- [ ] **Step 8 : Validation post-MEP (déférable au déploiement)**

> Cette étape est déjà tracée dans `PRODUCTION.md > # ✅ Checklist Post-MEP > Accessibilité /llms.txt` (sub-project 04 a aussi tracé ce check). Pas besoin de la dupliquer ici.

Quand le projet sera déployé en prod :
- `curl -s https://thibaud-geisler.com/llms.txt` doit retourner le markdown attendu avec `siteUrl=https://thibaud-geisler.com`.

---

## Self-review (post-écriture, fait par l'auteur du plan)

1. **Couverture spec** :
   - Création de `src/app/llms.txt/route.ts` (route handler GET) → Task 1 ✅
   - Format llmstxt.org strict (H1 + blockquote + Pages + Optional) → Task 1 Step 1 (template string complet) ✅
   - Réutilisation de `siteUrl` avec normalisation trailing slash → Task 1 Step 1 (`siteUrl.replace(/\/$/, '')`) ✅
   - Content-Type `text/plain; charset=utf-8` → Task 1 Step 1 + Task 3 Step 2 ✅
   - Cache-Control `public, max-age=3600, stale-while-revalidate=86400` → Task 1 Step 1 + Task 3 Step 2 + Step 6 ✅
   - 3 scénarios Acceptance criteria → Task 3 (Steps 1-7) ✅
   - Edge case trailing slash → Task 1 Step 1 (couvert par la regex `replace`) ✅
   - 1 décision architecturale (route handler vs public/) → Task 1 reflète l'option A choisie ✅
   - EN-only, pas de variante FR → respecté (1 seul fichier `src/app/llms.txt/route.ts`) ✅
   - Pas de modification des autres sub-projects → respecté ✅
   - Aucun fichier `.test.ts` créé (`tdd_scope: none`) → respecté (Task 2 lance les tests existants pour non-régression uniquement) ✅

2. **Placeholder scan** :
   - Aucun `TBD` / `TODO` / `à compléter` dans les snippets de code.
   - Toutes les commandes `pnpm` / `just` / `curl` sont exactes et reproductibles.
   - URLs LinkedIn/GitHub concrètes (pas d'invention).
   - Aucun "similar to Task N" : le plan ne contient qu'un seul fichier de code.

3. **Type consistency** :
   - `Response` (Task 1) est le type natif Web standard supporté par Next.js route handlers.
   - `siteUrl` (Task 1) est une `string` exportée par `src/lib/seo.ts` (sub-project 01).
   - `base` (variable locale Task 1) est de type `string` après `replace`.
   - La signature `async function GET(): Promise<Response>` est conforme à la convention Next.js App Router pour les route handlers GET.

Plan complet.
