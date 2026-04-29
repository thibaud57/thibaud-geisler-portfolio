---
feature: "Feature 7 — Conformité légale"
subproject: "Content-Security-Policy statique avec whitelist Calendly day-1"
goal: "Compléter la Content-Security-Policy manquante (TODO next.config.ts ligne 13) avec une politique statique qui autorise Calendly et bloque tout le reste, conforme aux 6 autres security headers déjà en place"
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: []
date: "2026-04-28"
---

# Content-Security-Policy statique avec whitelist Calendly day-1

## Scope

Ajouter un header `Content-Security-Policy` au tableau `securityHeaders` de `next.config.ts` (lignes 6-14, déjà existant pour 6 autres headers). Définir 11 directives strictes adaptées à `react-calendly@^4.4.0` (version installée du projet, utilise `<InlineWidget>` qui rend une iframe directement sans charger de script externe) : `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: https:`, `frame-src https://calendly.com https://*.calendly.com`, `connect-src 'self' https://*.calendly.com`, `font-src 'self' data:`, `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`. Implémentation : tableau TypeScript structuré `cspDirectives: ReadonlyArray<readonly [string, string]>` + helper `.map().join('; ')` pour produire la chaîne finale (lisibilité accrue vs string monolithique). CSP appliquée en dev ET prod (parité, repérage précoce des violations). **Exclut** : directive `report-uri`/`report-to` (post-MVP avec Sentry ou endpoint custom), origines Umami (post-MVP analytics), nonces dynamiques (overkill MVP), désactivation conditionnelle en dev, séparation par route (CSP unique pour `'/(.*)'` comme les autres headers), `script-src https://assets.calendly.com` (non utilisé par `react-calendly` v4, nécessaire uniquement si bascule vers widget JS officiel `assets.calendly.com/assets/external/widget.js`).

### État livré

À la fin de ce sub-project, on peut : (a) lancer `pnpm dev` puis `curl -I http://localhost:3000/` et observer le header `Content-Security-Policy:` listant les 11 directives ; (b) charger `/contact` dans un navigateur, ouvrir DevTools console, vérifier l'absence totale de violations CSP côté Next.js bundles + Tailwind + Magic UI/Aceternity ; (c) en `pnpm build && pnpm start`, idem `curl -I` retourne la même CSP, idem aucune violation console sur les pages publiques actuelles.

## Dependencies

Aucune. Ce sub-project est autoporté. Il n'introduit pas de nouveau modèle, pas de nouvelle dépendance npm, pas de nouvelle variable d'env. Il modifie uniquement `next.config.ts` en ajoutant un header dans le tableau existant `securityHeaders`.

## Files touched

- **À modifier** : `next.config.ts` (ajout du tableau `cspDirectives` + helper `cspHeaderValue`, ajout d'une entrée `{ key: 'Content-Security-Policy', value: cspHeaderValue }` dans `securityHeaders`, suppression du commentaire TODO ligne 13)

**Non touchés** : aucun autre fichier. Pas d'impact sur `prisma/schema.prisma`, `messages/{fr,en}.json`, `src/server/queries/*`, les pages App Router, ni les composants existants.

## Architecture approach

- **Pattern Next 16 `headers()` du projet déjà en place** : la fonction `nextConfig.headers()` retourne un tableau `[{ source: '/(.*)', headers: securityHeaders }]` qui s'applique à toutes les requêtes. On ajoute simplement une entrée supplémentaire au tableau `securityHeaders` existant. Voir `.claude/rules/nextjs/configuration.md` (NextConfig typé, `headers()` async, conventions Next 16).
- **CSP statique côté serveur** : la directive est définie au build/boot du container et ne peut PAS varier en fonction d'un cookie client (les cookies sont lus après que les headers de réponse aient été émis). Le gating Calendly côté consentement utilisateur se fait donc uniquement côté client (sub-project 5 `gating-calendly-marketing` qui conditionne le rendu de `<InlineWidget>` au consent marketing). La CSP autorise l'iframe Calendly **day-1** dès le premier chargement, et c'est le DOM côté client qui décide d'instancier ou non l'iframe.
- **Tableau TypeScript structuré + concat string** : déclarer un `cspDirectives: ReadonlyArray<readonly [string, string]>` avec `as const` (1 ligne par directive) et concaténer via `.map(([d, v]) => `${d} ${v}`).join('; ')` produit le format CSP standard. Ajouter une directive future = ajouter 1 ligne. Bien plus lisible et maintenable qu'une string monolithique de ~250 caractères. Voir `.claude/rules/typescript/conventions.md` (`as const`, types dérivés via `typeof`).
- **CSP appliquée en dev ET prod** : aucune condition `process.env.NODE_ENV`. Volonté explicite de parité dev/prod pour repérer les violations dès le développement local. Si Next 16 + Turbopack dev casse à cause de la CSP (ex: HMR a besoin de `'unsafe-eval'`), patcher conditionnellement uniquement le `script-src` à l'implémentation (cf. Edge cases). À ce stade, on parie que la directive `'self' 'unsafe-inline'` suffit (Turbopack n'utilise plus `eval()` pour le HMR standard depuis Next 15).
- **`'unsafe-inline'` accepté MVP sur `script-src` et `style-src`** : compromis nécessaire pour `vanilla-cookieconsent` (sub-project 3) qui injecte un script inline pour démarrer le banner, et pour Magic UI / Aceternity qui calculent des `style` inline runtime via motion/react. Durcissement post-MVP via nonces dynamiques (`'nonce-<random>'`) générés par middleware Next, mais hors scope MVP : coût > bénéfice tant qu'aucun report-uri n'est branché.
- **`frame-ancestors 'none'` redondant avec `X-Frame-Options: DENY`** : redondance volontaire. `X-Frame-Options` est legacy CSP1 (supporté partout), `frame-ancestors` est CSP3 (plus strict, override XFO sur les navigateurs modernes). Garder les deux pour défense en profondeur.
- **Format header standard** : directives séparées par `; ` (point-virgule + espace), pas de trailing semicolon. Ordre logique du plus général (`default-src`) au plus spécifique (`object-src 'none'`).
- **ADRs liés** : aucun ADR existant ne traite directement de la CSP. Cette décision est implicitement couverte par ADR-005 (Dokploy self-hosted, sécurité infra responsabilité projet). Pas de nouvel ADR à créer pour cette CSP statique MVP.

## Acceptance criteria

### Scénario 1 : Header CSP retourné en dev sur la home

**GIVEN** l'app est lancée en local via `pnpm dev` sur `http://localhost:3000`
**WHEN** je lance `curl -I http://localhost:3000/`
**THEN** la réponse HTTP contient un header `Content-Security-Policy:`
**AND** la valeur du header inclut les 11 directives concaténées avec `; ` :
```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src https://calendly.com https://*.calendly.com; connect-src 'self' https://*.calendly.com; font-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```
**AND** les 6 autres security headers existants sont toujours présents (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 0`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains`)

### Scénario 2 : Header CSP retourné en build prod sur n'importe quelle page

**GIVEN** l'app est buildée via `pnpm build` puis lancée via `pnpm start` (`NODE_ENV=production`)
**WHEN** je lance `curl -I http://localhost:3000/fr/contact`
**THEN** le header `Content-Security-Policy` est strictement identique à celui du Scénario 1 (parité dev/prod)
**AND** charger l'URL dans un navigateur ne produit AUCUNE violation CSP en console DevTools (Network panel : aucune ressource bloquée par CSP)

### Scénario 3 : Calendly inline embed autorisé par la CSP day-1

**GIVEN** l'app est lancée en `pnpm dev` ET le sub-project 5 `gating-calendly-marketing` n'est PAS encore mergé (donc le `<InlineWidget>` Calendly se charge inconditionnellement comme aujourd'hui)
**WHEN** je charge `/fr/contact` dans un navigateur (DevTools console ouverte)
**THEN** l'iframe Calendly se charge correctement (URL `https://calendly.com/...`)
**AND** aucune violation CSP `frame-src` ni `connect-src` n'apparaît en console
**AND** l'iframe est interactive (pas de blocage)

### Scénario 4 : Tentative d'embedding du site dans un iframe tiers bloquée

**GIVEN** l'app est déployée et accessible en HTTPS
**WHEN** un site tiers (ex: `https://attacker.example.com`) tente d'embarquer notre site via `<iframe src="https://thibaud-geisler.com">`
**THEN** le navigateur refuse le chargement (`frame-ancestors 'none'` + `X-Frame-Options DENY`)
**AND** la console du site tiers indique une violation `Refused to display 'https://thibaud-geisler.com/' in a frame because an ancestor violates the following Content Security Policy directive: 'frame-ancestors 'none''`

### Scénario 5 : Aucune régression sur les pages publiques actuelles

**GIVEN** l'app est lancée en `pnpm dev` après ajout de la CSP
**WHEN** je navigue sur `/fr` (Home), `/fr/services`, `/fr/projets`, `/fr/projets/<slug>`, `/fr/a-propos`, `/fr/contact` (idem en EN)
**THEN** aucune violation CSP n'apparaît en console DevTools sur aucune de ces pages
**AND** les composants Magic UI / Aceternity (animations motion/react avec `style` inline) s'affichent correctement
**AND** Tailwind 4 (CSS inliné) ne déclenche pas de violation `style-src`
**AND** next/image avec blur placeholder (data: URI) ne déclenche pas de violation `img-src`
**AND** next/font self-hosted ne déclenche pas de violation `font-src`

## Edge cases

- **Turbopack dev HMR si conflit avec CSP** : Next 16 + Turbopack utilise WebSockets (`ws://localhost:3000`) pour le HMR. La directive `connect-src 'self'` autorise déjà la même origine. Si malgré tout Turbopack a besoin de `'unsafe-eval'` (chunks dev), patcher l'implémentation pour ajouter conditionnellement `'unsafe-eval'` à `script-src` quand `process.env.NODE_ENV !== 'production'`. À valider à l'implémentation, pas anticipé dans le code MVP.
- **Composants Magic UI / Aceternity avec `style` calculés runtime** : `motion/react` et certains composants Aceternity injectent des styles inline via JS. Couvert par `style-src 'self' 'unsafe-inline'`. Si un composant utilise `eval()` ou `Function()` (rare mais possible), une CSP violation `script-src` apparaîtra. À résoudre au cas par cas en remplaçant le composant ou en passant en `'unsafe-eval'` (à éviter).
- **`vanilla-cookieconsent` (sub-project 3) avec script inline** : la lib injecte un `<script>` inline au mount. Couvert par `script-src 'self' 'unsafe-inline'`. Si la lib pose un cookie via `document.cookie = ...` côté client, c'est autorisé sans directive CSP (cookies = pas une ressource).
- **Calendly v4 (`react-calendly@^4.4.0` installée) utilise iframe pure + postMessage** : la lib rend `<InlineWidget url="https://calendly.com/...">` qui produit une iframe directement vers `calendly.com`, sans charger de script externe (différent du widget JS officiel `assets.calendly.com/assets/external/widget.js`). La communication parent/iframe passe par `window.postMessage`, bornée par `frame-src` et `frame-ancestors` (CSP), pas par `connect-src`. Notre `frame-src https://calendly.com https://*.calendly.com` couvre l'iframe et tous ses assets internes. `connect-src https://*.calendly.com` est défensif au cas où une future version de `react-calendly` introduirait des XHR client.
- **Si bascule vers le widget JS Calendly officiel (post-MVP éventuel)** : si on remplace `react-calendly` par l'embed officiel `<script src="https://assets.calendly.com/assets/external/widget.js">`, il faudra étendre la CSP avec `script-src https://assets.calendly.com`. Hors scope ce sub-project, à documenter pour le futur.
- **Attaque CSP via injection de `<base>` dans le HTML** : bloquée par `base-uri 'self'`.
- **Attaque CSP via formulaire qui POST vers un domaine externe** : bloquée par `form-action 'self'`.
- **Plugins legacy `<object>` / `<embed>` / `<applet>`** : bloqués par `object-src 'none'`. Aucun usage prévu MVP.
- **Pages d'erreur Next.js (`not-found.tsx`, `error.tsx`)** : pattern `'/(.*)'` dans `nextConfig.headers()` couvre toutes les routes y compris les pages d'erreur. Pas d'exception à prévoir.
- **Future intégration Umami analytics (post-MVP)** : ajouter à ce moment-là `connect-src https://analytics.example.com` et `script-src https://analytics.example.com`. Hors scope ce sub-project.
- **Future intégration Sentry / report-uri (post-MVP)** : ajouter `report-uri https://o<id>.ingest.sentry.io/...` ou un endpoint custom `/api/csp-report`. Hors scope ce sub-project.
- **Header très long (~280 caractères)** : reste sous la limite raisonnable des serveurs HTTP (typiquement 8 KB). Pas de risque de troncature.

## Architectural decisions

### Décision : Tableau structuré TypeScript vs string CSP monolithique

**Options envisagées :**
- **A. String monolithique** : déclarer `const cspHeaderValue = "default-src 'self'; script-src 'self' 'unsafe-inline'; ..."` directement. Simple, 1 ligne (longue).
- **B. Tableau d'objets** : `const cspDirectives = [{ name: 'default-src', value: "'self'" }, ...]` puis `.map(d => `${d.name} ${d.value}`).join('; ')`. Verbose, type explicite.
- **C. Tableau de tuples `as const`** : `const cspDirectives = [['default-src', "'self'"], ['script-src', "'self' 'unsafe-inline'"], ...] as const` puis `.map(([d, v]) => `${d} ${v}`).join('; ')`. Concis, typé via `as const`, lisible.

**Choix : C**

**Rationale :**
- L'option A force à éditer une string de ~280 caractères en monoligne. Toute modification (ajout d'une directive, ajustement de valeur) demande de relire toute la string pour ne pas casser la séparation `; `. Risque de typo élevé.
- L'option B est verbose pour le bénéfice marginal d'avoir des labels nommés. La structure tuple `[name, value]` est intuitive et auto-documentée.
- L'option C donne le meilleur ratio lisibilité/concision : 1 ligne par directive, alignement vertical naturel, ajout futur trivial. Le `.map().join()` est explicite et le résultat est testable manuellement par lecture du tableau. Le `as const` produit un type littéral readonly utilisable si on veut typer plus loin.

### Décision : CSP appliquée en dev ET prod (parité) vs prod only

**Options envisagées :**
- **A. CSP partout (dev + prod)** : ajouter le header sans condition. Parité totale entre environnements.
- **B. CSP en prod uniquement** : `if (process.env.NODE_ENV === 'production') securityHeaders.push({ ... })`. Évite tout risque de casser le dev expérience.
- **C. CSP en dev avec mode `Content-Security-Policy-Report-Only`** : le header devient `Content-Security-Policy-Report-Only` en dev (logue les violations sans bloquer). Hybride.

**Choix : A**

**Rationale :**
- L'option A garantit que toute violation CSP est repérée dès le développement local. Si un nouveau composant injecte une ressource non autorisée, la console DevTools affiche immédiatement la violation. Coût zéro tant que la CSP est bien dimensionnée.
- L'option B reporte le risque à la prod : un composant qui marche en dev peut casser en prod si une CSP violation bloque une ressource critique. Anti-pattern courant.
- L'option C nécessite un endpoint `/api/csp-report` pour collecter les violations. Hors scope MVP (ce sub ne crée pas d'endpoint), donc le `Report-Only` mode n'apporte rien de plus que la console DevTools en dev.
- Si Turbopack dev a besoin de `'unsafe-eval'` (à valider au sub-project 2 lors de l'implémentation), patcher conditionnellement uniquement cette directive plutôt que désactiver toute la CSP. Mitigation ciblée.

### Décision : `'unsafe-inline'` accepté MVP vs nonces dynamiques

**Options envisagées :**
- **A. `'unsafe-inline'` sur `script-src` et `style-src`** : compatible avec `vanilla-cookieconsent` + Magic UI / Aceternity inline styles. Compromis CSP standard.
- **B. Nonces dynamiques** : middleware Next.js génère un nonce par requête, l'injecte dans le HTML render et dans le header `script-src 'nonce-<random>'`. Strict CSP3, bloque toute injection inline non whitelistée.
- **C. Hashes statiques `'sha256-...'`** : whitelist par hash de chaque script/style inline connu. Très strict mais maintenance lourde.

**Choix : A**

**Rationale :**
- L'option B (nonces) est la best-practice CSP3 stricte mais nécessite un middleware Next dédié, propagation du nonce au React render, gestion du HMR dev (Turbopack ne sait pas générer de nonces aujourd'hui). Coût d'intégration significatif sans bénéfice tant qu'aucun `report-uri` n'est branché pour détecter les attaques inline.
- L'option C (hashes) demande de hasher manuellement chaque script/style inline et de les maintenir à chaque release. Quasi-impossible avec des libs tierces (vanilla-cookieconsent, Magic UI) qui peuvent injecter des styles dynamiques.
- L'option A est le compromis MVP standard. La majorité des sites freelance / portfolios FR utilisent `'unsafe-inline'` dans leur CSP MVP. Durcissement post-MVP avec nonces si le besoin réel apparaît (ex: branchement Sentry CSP reports + détection d'injections suspectes).
- Trade-off de sécurité accepté : un attaquant qui réussirait une XSS injection pourrait exécuter du JS inline. Mitigation par les autres couches (validation Zod côté Server Actions, sanitization next-intl, pas de `dangerouslySetInnerHTML` non-échappé dans le projet à ce stade).
