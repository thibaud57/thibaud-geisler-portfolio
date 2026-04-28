# Content-Security-Policy statique avec whitelist Calendly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compléter la Content-Security-Policy manquante (TODO `next.config.ts` ligne 13) avec une politique statique qui autorise Calendly day-1 et bloque tout le reste, conforme aux 6 autres security headers déjà en place.

**Architecture:** Ajout d'un seul header `Content-Security-Policy` au tableau `securityHeaders` de `next.config.ts`. Implémentation via tableau TypeScript structuré `cspDirectives` (1 ligne par directive) + helper de concatenation pour produire la string CSP finale. CSP appliquée en dev ET prod (parité, repérage précoce des violations).

**Tech Stack:** Next.js 16, TypeScript 6 strict, react-calendly 4.4.0 (lib utilisateur), Turbopack (dev + build).

**Spec source :** [docs/superpowers/specs/conformite-legale/02-csp-headers-calendly-whitelist-design.md](../../specs/conformite-legale/02-csp-headers-calendly-whitelist-design.md)

**Discipline commit (CLAUDE.md projet) :** AUCUN `git commit` intermédiaire pendant l'implémentation. Un seul commit final après validation utilisateur explicite à la fin de Task 4. Toutes les Tasks intermédiaires laissent simplement le working tree modifié sans commit.

**Rules applicables :**
- `.claude/rules/nextjs/configuration.md` (NextConfig typé, conventions Next 16, `headers()`)
- `.claude/rules/nextjs/production-deployment.md` (output standalone, instrumentation)
- `.claude/rules/typescript/conventions.md` (`as const`, types dérivés via `typeof`)

---

## Task 1: Ajouter la CSP dans `next.config.ts`

**Files:**
- Modify: `next.config.ts:6-14` (tableau `securityHeaders` actuel à étendre, suppression du commentaire TODO ligne 13)

- [ ] **Step 1.1: Lire le fichier actuel pour confirmer l'état**

Run: `cat next.config.ts`
Expected: 31 lignes, 6 entrées dans `securityHeaders`, commentaire TODO ligne 13.

- [ ] **Step 1.2: Remplacer le tableau `securityHeaders` complet avec la version étendue**

Le contenu actuel des lignes 6-14 :
```typescript
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // TODO: Content-Security-Policy à définir lors de l'ajout Calendly (MVP) + Umami (post-MVP)
]
```

Remplacer par cette version qui (a) ajoute le tableau `cspDirectives` et le helper `cspHeaderValue` AVANT `securityHeaders`, (b) ajoute une 7e entrée `Content-Security-Policy` dans `securityHeaders`, (c) supprime le commentaire TODO :

```typescript
const cspDirectives = [
  ['default-src', "'self'"],
  ['script-src', "'self' 'unsafe-inline'"],
  ['style-src', "'self' 'unsafe-inline'"],
  ['img-src', "'self' data: https:"],
  ['frame-src', 'https://calendly.com https://*.calendly.com'],
  ['connect-src', "'self' https://*.calendly.com"],
  ['font-src', "'self' data:"],
  ['frame-ancestors', "'none'"],
  ['base-uri', "'self'"],
  ['form-action', "'self'"],
  ['object-src', "'none'"],
] as const

const cspHeaderValue = cspDirectives.map(([directive, value]) => `${directive} ${value}`).join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: cspHeaderValue },
]
```

Note : on retire complètement le commentaire `// TODO: Content-Security-Policy à définir lors de l'ajout Calendly (MVP) + Umami (post-MVP)` qui n'a plus lieu d'être (Umami sera ajouté post-MVP dans un autre sub-project en éditant ce même tableau).

- [ ] **Step 1.3: Vérifier la compilation TypeScript**

Run: `pnpm typecheck`
Expected: aucune erreur. Le `as const` typifie le tableau comme `readonly [readonly ['default-src', "'self'"], ...]`, le `.map()` produit `string[]`, et `.join('; ')` produit la `string` finale assignée à `cspHeaderValue`.

- [ ] **Step 1.4: Vérifier que le format de la string CSP générée est correct**

Run: `node -e "
const directives = [
  ['default-src', \"'self'\"],
  ['script-src', \"'self' 'unsafe-inline'\"],
  ['style-src', \"'self' 'unsafe-inline'\"],
  ['img-src', \"'self' data: https:\"],
  ['frame-src', 'https://calendly.com https://*.calendly.com'],
  ['connect-src', \"'self' https://*.calendly.com\"],
  ['font-src', \"'self' data:\"],
  ['frame-ancestors', \"'none'\"],
  ['base-uri', \"'self'\"],
  ['form-action', \"'self'\"],
  ['object-src', \"'none'\"],
];
console.log(directives.map(([d, v]) => d + ' ' + v).join('; '));
"`

Expected output :
```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://calendly.com https://*.calendly.com; connect-src 'self' https://*.calendly.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

(Pas de point-virgule final, espaces propres entre directive et valeur.)

---

## Task 2: Smoke test en dev

**Files:** aucun fichier modifié à cette task. Validation en runtime uniquement.

- [ ] **Step 2.1: Démarrer le serveur dev**

Run: `pnpm dev` (ou `just dev` si la commande existe dans le projet)
Expected: serveur démarre sur `http://localhost:3000`, pas d'erreur de config Next.js. Le redémarrage est nécessaire car `next.config.ts` est lu une seule fois au boot.

Note : laisser le serveur tourner en arrière-plan pour les steps suivants.

- [ ] **Step 2.2: Vérifier la présence du header CSP via curl**

Run (dans un autre terminal) : `curl -I http://localhost:3000/`
Expected output : la réponse HTTP contient les 7 security headers. La ligne suivante doit être présente :
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://calendly.com https://*.calendly.com; connect-src 'self' https://*.calendly.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

Et les 6 autres headers existants doivent toujours être présents : `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 0`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`.

- [ ] **Step 2.3: Vérifier l'absence de violations CSP sur les pages publiques**

Ouvrir dans un navigateur (Chrome/Firefox) avec DevTools console ouverte :
1. `http://localhost:3000/fr` (Home)
2. `http://localhost:3000/fr/services`
3. `http://localhost:3000/fr/projets`
4. `http://localhost:3000/fr/projets/<un-slug-publié>` (ex: `digiclaims` si seedé)
5. `http://localhost:3000/fr/a-propos`
6. `http://localhost:3000/fr/contact` (page avec `<CalendlyWidget>` inline)
7. Idem en EN : `http://localhost:3000/en`, `http://localhost:3000/en/contact`, etc.

Expected pour chaque page : DevTools console ne contient AUCUNE ligne du type `Refused to ... because it violates the following Content Security Policy directive: ...`. Les composants Magic UI / Aceternity (animations motion/react inline styles) s'affichent. L'iframe Calendly se charge correctement sur `/contact` (sub 5 ne touche pas encore ce comportement, donc l'iframe est instanciée inconditionnellement).

- [ ] **Step 2.4: Vérifier que Turbopack HMR fonctionne (dev only)**

Modifier un fichier React quelconque (par ex. ajouter un espace dans `src/app/[locale]/(public)/page.tsx`).
Expected : Turbopack HMR met à jour le navigateur sans rechargement complet, aucune erreur console liée à la CSP (du type `EvalError` ou `Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source`).

Si HMR casse à cause d'une violation CSP (très improbable mais possible), patcher conditionnellement `script-src` pour ajouter `'unsafe-eval'` en dev uniquement. Modifier alors `cspDirectives` ainsi :

```typescript
const isDev = process.env.NODE_ENV !== 'production'
const cspDirectives = [
  ['default-src', "'self'"],
  ['script-src', isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'"],
  // ... reste inchangé
] as const
```

Si HMR fonctionne sans cette modification (cas attendu), ne rien faire.

- [ ] **Step 2.5: Arrêter le serveur dev**

Run : `Ctrl+C` dans le terminal du serveur dev (ou `just stop` si la commande existe).
Expected : libération du port 3000.

---

## Task 3: Smoke test en build prod

**Files:** aucun fichier modifié. Validation en runtime production uniquement.

- [ ] **Step 3.1: Builder l'app en mode production**

Run: `pnpm build`
Expected: build réussi, aucune erreur. Output Next.js typique avec les routes statiques marquées (le rapport `next build` montre `○ Static`, `ƒ Dynamic`).

- [ ] **Step 3.2: Démarrer le serveur de production**

Run: `pnpm start`
Expected: serveur démarre sur `http://localhost:3000`, mode production (`NODE_ENV=production`).

- [ ] **Step 3.3: Vérifier le header CSP en prod via curl**

Run (autre terminal) : `curl -I http://localhost:3000/`
Expected: header `Content-Security-Policy` strictement identique à celui retourné en dev (Step 2.2). Parité dev/prod confirmée.

- [ ] **Step 3.4: Vérifier l'absence de violations CSP en prod sur la page contact**

Ouvrir `http://localhost:3000/fr/contact` dans un navigateur (DevTools console ouverte).
Expected : aucune violation CSP, l'iframe Calendly se charge depuis `https://calendly.com/...`, `useCalendlyEventListener` reçoit les events postMessage normalement.

- [ ] **Step 3.5: Arrêter le serveur prod**

Run : `Ctrl+C` dans le terminal du serveur prod.
Expected : libération du port 3000.

---

## Task 4: Vérifications finales et préparation commit

- [ ] **Step 4.1: Lancer le typecheck global**

Run: `pnpm typecheck`
Expected: aucune erreur.

- [ ] **Step 4.2: Lancer le lint**

Run: `pnpm lint`
Expected: aucune erreur sur `next.config.ts`. Aucune nouvelle erreur sur les autres fichiers.

- [ ] **Step 4.3: Lancer la suite de tests complète (régression)**

Run: `pnpm test`
Expected: tous les tests verts. Aucune régression sur les tests existants. Note : ce sub-project n'introduit pas de nouveau test, mais on vérifie qu'aucun test existant ne casse à cause d'un changement de header (improbable).

- [ ] **Step 4.4: Vérifier le diff git**

Run: `git diff next.config.ts`
Expected output (résumé) :
- Ajout d'un bloc `const cspDirectives = [...] as const` (~14 lignes)
- Ajout d'une ligne `const cspHeaderValue = cspDirectives.map(...).join('; ')`
- Ajout d'une entrée `{ key: 'Content-Security-Policy', value: cspHeaderValue }` dans `securityHeaders`
- Suppression de la ligne `// TODO: Content-Security-Policy à définir lors de l'ajout Calendly (MVP) + Umami (post-MVP)`

Aucun autre changement attendu dans le diff.

- [ ] **Step 4.5: Vérifier qu'aucun autre fichier n'a été modifié**

Run: `git status`
Expected: `modified: next.config.ts` uniquement. Aucun autre fichier modifié, aucun untracked relevant.

Si l'option dev avec `'unsafe-eval'` conditionnel a été activée (cas Turbopack HMR cassé au Step 2.4), le diff inclura aussi le `const isDev = ...` et la condition ternaire sur `script-src`.

- [ ] **Step 4.6: DEMANDER VALIDATION USER avant tout `git add` / `git commit`**

NE PAS lancer `git commit` directement. La discipline projet (CLAUDE.md projet § Workflow Git > Discipline commit) interdit les commits auto-initiés.

Présenter à l'utilisateur :
1. La liste des fichiers modifiés (`git status`)
2. Un résumé : "Sub-project 2/7 implémenté : CSP statique 11 directives ajoutée à next.config.ts, smoke tests dev + prod OK, aucune violation console DevTools sur les pages publiques, Calendly iframe se charge correctement"
3. Une proposition de message de commit Conventional :
   ```
   feat(security): add Content-Security-Policy header with Calendly whitelist

   - 11 directives strictes (default-src, script-src, style-src, img-src, frame-src, connect-src, font-src, frame-ancestors, base-uri, form-action, object-src)
   - Whitelist Calendly day-1 (frame-src + connect-src https://*.calendly.com) compatible react-calendly v4
   - Tableau TS structuré + concat helper pour lisibilité (vs string monolithique)
   - CSP appliquée en dev ET prod (parité, repérage précoce des violations)

   Refs: docs/superpowers/specs/conformite-legale/02-csp-headers-calendly-whitelist-design.md
   ```

Attendre l'accord explicite de l'utilisateur avant de lancer `git add` puis `git commit`.

- [ ] **Step 4.7: Après validation user uniquement, commiter**

Run (uniquement après accord explicite user) :
```bash
git add next.config.ts
git commit -m "$(cat <<'EOF'
feat(security): add Content-Security-Policy header with Calendly whitelist

- 11 directives strictes (default-src, script-src, style-src, img-src, frame-src, connect-src, font-src, frame-ancestors, base-uri, form-action, object-src)
- Whitelist Calendly day-1 (frame-src + connect-src https://*.calendly.com) compatible react-calendly v4
- Tableau TS structuré + concat helper pour lisibilité (vs string monolithique)
- CSP appliquée en dev ET prod (parité, repérage précoce des violations)

Refs: docs/superpowers/specs/conformite-legale/02-csp-headers-calendly-whitelist-design.md
EOF
)"
```

Run: `git status`
Expected: working tree clean.

- [ ] **Step 4.8: Mettre à jour le statut du spec**

Modifier le frontmatter de `docs/superpowers/specs/conformite-legale/02-csp-headers-calendly-whitelist-design.md` :
- Changer `status: "draft"` en `status: "implemented"`

Cette modification peut être commitée séparément en `chore(specs): mark csp-headers-calendly-whitelist as implemented` après accord user.

---

## Self-Review

**Spec coverage check :**

| Spec section | Task(s) couvrant |
|---|---|
| Header CSP retourné en dev (Scénario 1) | Task 2 Step 2.2 |
| Header CSP retourné en prod (Scénario 2) | Task 3 Step 3.3 |
| Calendly inline embed autorisé (Scénario 3) | Task 2 Step 2.3 + Task 3 Step 3.4 |
| Tentative d'embedding tiers bloquée (Scénario 4) | Couvert par `frame-ancestors 'none'` dans Task 1 Step 1.2 (testable manuellement post-deploy, non scripté MVP) |
| Aucune régression pages publiques (Scénario 5) | Task 2 Step 2.3 (6 pages testées en FR + EN) |
| Edge case Turbopack `'unsafe-eval'` | Task 2 Step 2.4 (test + patch conditionnel) |
| Edge case Magic UI / Aceternity inline styles | Task 2 Step 2.3 (couvert par les pages testées qui contiennent ces composants) |
| Edge case Calendly iframe + postMessage | Task 2 Step 2.3 + Task 3 Step 3.4 |

Aucun gap identifié. Le scénario 4 (embedding tiers) n'est pas scripté car il nécessite un déploiement HTTPS public et un site tiers attaquant. Validation manuelle post-deploy via un test depuis n'importe quel domaine externe (curl avec User-Agent navigateur, ou test depuis un autre projet).

**Placeholder scan :** aucun TBD/TODO/à définir dans le plan. Code complet à chaque step. La seule occurrence de "TODO" est dans le contenu du commentaire à supprimer (Step 1.2), légitime.

**Type consistency :** `cspDirectives` est `ReadonlyArray<readonly [string, string]>` via `as const`. Le `.map([d, v] => ...)` destructure correctement. `cspHeaderValue` est `string`. Cohérent dans tout le plan.

---

## Execution Handoff

**Plan complet et sauvegardé dans `docs/superpowers/plans/conformite-legale/02-csp-headers-calendly-whitelist.md`.**

Ce plan sera consommé par `/implement-subproject conformite-legale 02` (orchestrateur subagent-driven-development + gates qualité `/simplify` + `code/code-reviewer`) lors de la phase d'implémentation effective.

**Pas d'implémentation tout de suite** : on est dans le workflow `/decompose-feature` qui boucle sur les 7 sub-projects. Le sub-project 3/7 (`bandeau-consentement-cookies`) est le suivant dans l'ordre topologique (et le plus gros morceau de la feature, complexity L).
