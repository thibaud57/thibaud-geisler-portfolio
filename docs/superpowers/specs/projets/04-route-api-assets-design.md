---
feature: "Feature 2 — Projets (liste + case studies)"
subproject: "route-api-assets"
goal: "Exposer la route GET /api/assets/[filename] qui sert les fichiers images depuis un volume Docker dédié avec validation anti path-traversal et cache headers"
status: "draft"
complexity: "M"
tdd_scope: "full"
depends_on: []
date: "2026-04-21"
---

# Route API /api/assets/[filename] — Service des images du portfolio

## Scope

Créer un Route Handler Next.js `src/app/api/assets/[filename]/route.ts` (GET uniquement) qui sert les fichiers binaires (images de case studies, assets de marque) depuis un répertoire local défini par `ASSETS_PATH` (env var déjà présente dans `.env.example` ligne 3). Créer un helper pur `src/server/config/assets.ts` centralisant la validation du `filename` (Zod + regex stricte + whitelist d'extensions), la résolution du path absolu (avec vérification finale anti path-traversal), et la résolution du `Content-Type` via l'extension. Écrire 6 tests d'intégration Vitest ciblés sur les règles de sécurité et de comportement HTTP. **Exclus** : upload (pas de dashboard admin MVP), resize/thumbnails (à faire côté client avec `next/image` si besoin), signed URLs (assets publics), listing d'un dossier, cache server-side via Next.js (le cache navigateur via `Cache-Control` suffit en MVP), migration Cloudflare R2 (ADR-011, post-MVP, le helper est conçu pour le permettre).

### État livré

À la fin de ce sub-project, on peut : déposer `test.png` dans `./assets/` en dev, lancer `just dev`, appeler `curl http://localhost:3000/api/assets/test.png` → le fichier est retourné avec `Content-Type: image/png` et `Cache-Control: public, max-age=31536000, immutable` ; appeler `curl 'http://localhost:3000/api/assets/..%2F..%2Fetc%2Fpasswd'` → renvoie 400 ; appeler `curl http://localhost:3000/api/assets/absent.png` → renvoie 404. Les 6 tests Vitest d'intégration `tests/integration/assets-route.integration.test.ts` passent tous.

## Dependencies

Aucune — ce sub-project est autoporté.

## Files touched

- **À créer** : `src/server/config/assets.ts` (helper pur : `validateFilename`, `resolveAssetPath`, `getContentType` + constantes)
- **À créer** : `src/app/api/assets/[filename]/route.ts` (Route Handler GET)
- **À créer** : `tests/integration/assets-route.integration.test.ts` (6 tests Vitest)
- **À créer** : `assets/.gitkeep` (tracker le dossier vide en dev)
- **À vérifier** : `.env.example` ligne 3 `ASSETS_PATH=` déjà présente (commentaire `dev: ./assets | prod: /app/assets`) — aucune modif si OK
- **À vérifier** : `compose.yaml` ligne 33-34 volume `portfolio_assets:/app/assets` monté sur le service nextjs — aucune modif si OK
- **À vérifier** : `.gitignore` couvre-t-il `assets/*` (sauf `.gitkeep`) pour éviter de tracker des fichiers binaires ? Ajouter si absent :
  ```
  # Assets locaux (servis par /api/assets en dev, volume Docker en prod)
  /assets/*
  !/assets/.gitkeep
  ```

## Architecture approach

### Helper pur `src/server/config/assets.ts`

- **Validation via Zod** : un schéma `FilenameSchema` (type `z.string()` avec contrainte regex) qui applique simultanément trois règles — (1) premier caractère obligatoirement alphanumérique (jamais `.`, `-`, ou séparateur), (2) corps du nom restreint à l'ensemble `a-z 0-9 . _ -`, (3) extension terminale dans la whitelist `png | jpg | jpeg | webp | svg`. Validation case-insensitive. Le pattern exact est décrit dans le plan d'implémentation. Conforme à [.claude/rules/zod/validation.md](../../../../.claude/rules/zod/validation.md).
- **Interface typée** : `validateFilename(raw: string): { ok: true; filename: string } | { ok: false; error: string }`. Discriminated union pour narrowing TypeScript côté caller (cf. [.claude/rules/typescript/conventions.md](../../../../.claude/rules/typescript/conventions.md)).
- **Résolution path avec défense en profondeur** : `resolveAssetPath(filename: string): string` fait `path.join(ASSETS_PATH, filename)` puis `path.resolve(...)`, puis vérifie que le résultat commence bien par `path.resolve(ASSETS_PATH)` (garde-fou même si la regex Zod a laissé passer quelque chose d'inattendu). Si non, lance une `Error` (ce cas ne devrait jamais se produire avec la validation amont, mais la défense en profondeur est gratuite).
- **Lecture de `ASSETS_PATH`** : lu depuis `process.env.ASSETS_PATH` avec fallback `./assets` en dev. Pas de Zod env schema custom ici (on s'appuie sur la convention projet existante). Conforme à [.claude/rules/nextjs/configuration.md](../../../../.claude/rules/nextjs/configuration.md).
- **Mapping Content-Type** : objet const `CONTENT_TYPE_MAP = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', svg: 'image/svg+xml' }`. Helper `getContentType(filename: string): string` extrait l'extension via `path.extname(filename).slice(1).toLowerCase()` et lookup dans le map.
- **Abstraction minimale pour futur R2** (ADR-011) : le helper expose `resolveAssetPath` et `getContentType`, le route handler appelle `fs.readFile(resolveAssetPath(filename))`. Pour migrer vers R2 post-MVP, il suffira de remplacer le corps de `resolveAssetPath` par un fetch signé R2 (ou d'ajouter une seconde fonction `readAsset(filename): Promise<Buffer>`), sans changer la signature côté route handler. YAGNI : pas d'interface `AssetStorage` prématurée.

### Route Handler `src/app/api/assets/[filename]/route.ts`

- **Route Handler Next.js 16 App Router** : export `async function GET(request, { params })`. `params` est async depuis Next 15 (`await params`). Conforme à [.claude/rules/nextjs/api-routes.md](../../../../.claude/rules/nextjs/api-routes.md).
- **Séquence** : `await params` → `validateFilename(filename)` → si !ok : `logger.warn({ raw, error }, 'assets: invalid filename')` + `return new Response(error, { status: 400 })` → sinon `resolveAssetPath` + `fs.readFile` → `return new Response(data, { status: 200, headers: { 'Content-Type': ..., 'Cache-Control': 'public, max-age=31536000, immutable' } })`.
- **Gestion du 404** : `fs.readFile` lève `ENOENT` si le fichier n'existe pas. Catch ciblé sur `err.code === 'ENOENT'` → `logger.debug({ filename }, 'assets: not found')` + `return new Response('Not found', { status: 404 })`. Autres erreurs (permission, IO) → re-throw pour que Next.js gère via `error.tsx`.
- **Logger Pino** : import depuis `@/lib/logger` (doit exister ou être créé dans un sub-project voisin, ou ici si manquant). Niveau `warn` pour 400 (signal de tentative suspecte potentielle), `debug` pour 404 (volume de liens morts acceptable, on veut debug ciblé). Conforme à [.claude/rules/pino/logger.md](../../../../.claude/rules/pino/logger.md) — ne jamais logger le contenu du fichier (uniquement le filename tenté).
- **Pas de cache Next.js côté serveur** : la route est dynamique (lit le filesystem à chaque requête), mais le `Cache-Control: immutable` en header garantit que le navigateur cache 1 an. Pour un portfolio avec ~20 assets, le volume de requêtes réelles au serveur sera minime.

### Tests `tests/integration/assets-route.integration.test.ts`

- **Environnement Vitest `node`** (pas jsdom) : directive `// @vitest-environment node` en tête (cf. [.claude/rules/vitest/setup.md](../../../../.claude/rules/vitest/setup.md)).
- **Approche** : appel direct du Route Handler `GET(request, { params })` importé comme module. Pas de serveur HTTP réel (plus simple, plus rapide, teste bien le handler isolé).
- **Fixtures** : `beforeAll` crée un dossier de test temporaire (`./assets-test/`) avec 2 fichiers (`test.png`, `test.svg`), surcharge `ASSETS_PATH` via `process.env` pour pointer dessus. `afterAll` nettoie.
- **Objet `Request` minimal** : Web Fetch API standard, `new Request('http://localhost/api/assets/test.png')` suffit.
- **Pas de mock `fs`** : on teste contre un vrai filesystem (dossier de fixtures) — c'est le but du test d'intégration.

## Acceptance criteria

### Scénario 1 : Path traversal via slash — rejeté 400

**GIVEN** la route `/api/assets/[filename]` active
**WHEN** un attaquant envoie `GET /api/assets/..%2F..%2Fetc%2Fpasswd` (URL-encoded `../../etc/passwd`)
**THEN** la réponse a status 400
**AND** le corps n'inclut PAS le contenu de `/etc/passwd`
**AND** un log Pino `warn` est émis avec le raw filename tenté

### Scénario 2 : Path traversal via caractères invalides — rejeté 400

**GIVEN** la route active
**WHEN** on envoie un filename contenant `/`, `\`, ou un null byte (ex: `foo%00.png`)
**THEN** la réponse a status 400
**AND** aucun accès au filesystem n'est tenté

### Scénario 3 : Extension non whitelist — rejeté 400

**GIVEN** la route active et un fichier `malware.exe` hypothétique dans `assets/`
**WHEN** on envoie `GET /api/assets/malware.exe`
**THEN** la réponse a status 400 (extension `.exe` hors whitelist png/jpg/jpeg/webp/svg)
**AND** `fs.readFile` n'est jamais appelé

### Scénario 4 : Fichier valide mais absent — 404

**GIVEN** la route active, `assets/absent.png` n'existe pas dans le filesystem
**WHEN** on envoie `GET /api/assets/absent.png`
**THEN** la réponse a status 404
**AND** un log Pino `debug` est émis

### Scénario 5 : Fichier PNG existant — 200 + Content-Type correct + cache

**GIVEN** la route active, `assets/test.png` existe (fixture de test)
**WHEN** on envoie `GET /api/assets/test.png`
**THEN** la réponse a status 200
**AND** header `Content-Type: image/png`
**AND** header `Cache-Control: public, max-age=31536000, immutable`
**AND** le corps contient les bytes du fichier

### Scénario 6 : Fichier SVG existant — Content-Type `image/svg+xml`

**GIVEN** la route active, `assets/test.svg` existe (fixture)
**WHEN** on envoie `GET /api/assets/test.svg`
**THEN** la réponse a status 200
**AND** header `Content-Type: image/svg+xml`

## Tests à écrire

### Unit

- `src/server/config/__tests__/assets.test.ts` :
  - `validateFilename` + `FilenameSchema` : filename valide simple (`test.png`) → `{ ok: true }`
  - `validateFilename` : majuscules acceptées via flag `i` (`Test.PNG`, `photo.JPEG`) → `{ ok: true }`
  - `validateFilename` : path traversal via slash (`../etc/passwd`) → `{ ok: false, error }`
  - `validateFilename` : path traversal via backslash (`..\\file.png`) → `{ ok: false }`
  - `validateFilename` : null byte (`foo\u0000.png`) → `{ ok: false }`
  - `validateFilename` : extension hors whitelist (`.exe`, `.pdf`, `.html`) → `{ ok: false }`
  - `validateFilename` : commence par `.` (`.htaccess`, `.env`) → `{ ok: false }` (regex exige `[a-z0-9]` en tête)
  - `validateFilename` : string vide → `{ ok: false }`
  - `getContentType` : mapping des 5 extensions (`.png` → `image/png`, `.jpg`/`.jpeg` → `image/jpeg`, `.webp` → `image/webp`, `.svg` → `image/svg+xml`)
  - `getContentType` : extension inconnue → fallback `application/octet-stream`
  - `getContentType` : case-insensitive (`Test.PNG` → `image/png`)
  - `resolveAssetPath` : garde-fou anti path-traversal (filename qui tenterait d'échapper à `ASSETS_PATH`) → `throw Error`

### Integration

- `tests/integration/assets-route.integration.test.ts` :
  - **Test 1** : `GET /api/assets/..%2F..%2Fetc%2Fpasswd` (URL-encoded path traversal) → 400 (couvre scénario 1)
  - **Test 2** : `GET /api/assets/foo%00.png` (null byte injection) → 400 (couvre scénario 2)
  - **Test 3** : `GET /api/assets/malware.exe` (extension hors whitelist) → 400 (couvre scénario 3)
  - **Test 4** : `GET /api/assets/absent.png` (fichier inexistant dans fixture) → 404 (couvre scénario 4)
  - **Test 5** : `GET /api/assets/test.png` (fixture PNG présente) → 200 + `Content-Type: image/png` + `Cache-Control: public, max-age=31536000, immutable` (couvre scénario 5)
  - **Test 6** : `GET /api/assets/test.svg` (fixture SVG présente) → 200 + `Content-Type: image/svg+xml` (couvre scénario 6)

Les tests unit valident la **logique pure** en isolation (ARCHITECTURE.md : fonctions pures + schémas Zod → unit). Les tests intégration valident le **comportement HTTP complet** (Route Handler, filesystem, headers). Les 2 niveaux sont complémentaires : unit détecte les régressions sur les fonctions pures sans dépendre du filesystem ou du Route Handler.

→ `tdd_scope = full` (12 tests : 6 unit couvrant 100% des fonctions pures + edge cases + 6 integration couvrant les 6 scénarios d'acceptance HTTP).

## Edge cases

- **Filename avec majuscules** (`Test.PNG`) : la regex a flag `i` donc autorisé. Le lookup Content-Type utilise `.toLowerCase()` sur l'extension. Accepté.
- **Filename avec `__tests__` ou double underscore** : regex `[a-z0-9._-]+` accepte underscore simple. Double underscore `__` passe. Accepté (pas un vecteur d'attaque connu).
- **Filename commençant par point** (`.htaccess`, `.env`) : la regex exige qu'il commence par `[a-z0-9]`, rejette ces cas. Bloqué par design.
- **Fichier dans sous-dossier** (`sub/folder/image.png`) : le `/` est interdit par la regex. Bloqué — si besoin plus tard, on refactorisera pour supporter des sous-chemins explicitement.
- **Fichier > 10 Mo** : aucune limite explicite dans ce sub-project. `fs.readFile` charge en mémoire, potentiel risque RAM. Pour le MVP (screenshots ~500 Ko max), acceptable. Suivi dans open questions pour R2 post-MVP (streaming natif).
- **`ASSETS_PATH` absent** : si `.env` ne définit pas `ASSETS_PATH`, fallback sur `./assets` dans le helper. Aucun crash au démarrage.
- **Fichier corrompu ou 0 bytes** : `fs.readFile` réussit, la route retourne 200 avec un Buffer vide. Pas de validation de contenu — responsabilité de l'upload (futur). Acceptable pour MVP.
- **Unicode / emoji dans filename** (`📷.png`) : la regex `[a-z0-9._-]` rejette. Bloqué — convention stricte ASCII only.

## Architectural decisions

### Décision : Helper pur + `fs.readFile` direct, pas d'interface `AssetStorage`

**Options envisagées :**
- **A. Helper simple** : `src/server/config/assets.ts` expose `validateFilename`, `resolveAssetPath`, `getContentType`. Le route handler fait `fs.readFile` directement.
- **B. Interface abstraite** `AssetStorage { read(filename): Promise<Buffer> }` avec implémentation `FsAssetStorage` en MVP, future `R2AssetStorage` plug-and-play.

**Choix : A**

**Rationale :**
- YAGNI strict : 1 seul consommateur en MVP (la route `/api/assets`), pas besoin de polymorphisme.
- ADR-011 prévoit migration R2 post-MVP. À ce moment-là, remplacer le corps du helper (ajouter un `readAsset(filename): Promise<Buffer>` si besoin) sans toucher à la signature côté route — refactor trivial.
- L'interface ajoute ~50 lignes de boilerplate (interface TS + implémentation fs + export) pour zéro bénéfice MVP.

### Décision : Zod + whitelist stricte d'extensions plutôt que blacklist ou regex libre

**Options envisagées :**
- **A. Zod + regex stricte** incluant whitelist `(png|jpg|jpeg|webp|svg)` dans la regex elle-même.
- **B. Regex native simple** `[a-z0-9._-]+` sans whitelist extension.
- **C. Blacklist** (bloquer `.exe`, `.html`, `.js`, etc., accepter le reste).

**Choix : A**

**Rationale :**
- Zod fournit un message d'erreur structuré et une API type-safe (cf. convention projet — Zod utilisé pour le formulaire contact, etc.).
- Whitelist = sécurité par défaut. Une extension inattendue (`.wasm`, `.pdf`, `.mp4`) est **refusée par défaut**. Blacklist = vulnérable aux oublis (toute nouvelle extension dangereuse = faille).
- Les 5 extensions couvrent 100% des besoins portfolio (images statiques). Ajout futur trivial (modifier la regex).
- Message d'erreur explicite côté dev ("filename must match [a-z0-9][a-z0-9._-]* and end with .png/.jpg/.jpeg/.webp/.svg").

### Décision : 400 (invalide) + 404 (absent) explicites plutôt que 404 uniforme

**Options envisagées :**
- **A. 400 pour invalide + 404 pour absent** : sémantique HTTP standard.
- **B. 404 uniforme** : security through obscurity, n'aide pas les attaquants qui font du fuzzing.

**Choix : A**

**Rationale :**
- Les URLs servies sont publiques par nature (le portfolio est un site public). Masquer la différence entre "tu as mal formé ta requête" et "le fichier n'existe pas" n'apporte aucune sécurité additionnelle — un attaquant peut toujours tester les deux cas.
- 400 aide le debug dev et un éventuel client légitime (lien cassé dans un e-mail, typo manuelle). 404 = case standard.
- Conforme à la sémantique HTTP (RFC 7231).

### Décision : Pas de rate-limiting sur cette route en MVP

**Options envisagées :**
- **A. Pas de rate-limit** : `Cache-Control: immutable` fait que les navigateurs cachent après premier hit, volume serveur minime.
- **B. Rate-limit in-memory IP-based** (ex: 100 req/min).

**Choix : A**

**Rationale :**
- Les assets sont immutables → cache navigateur 1 an → hits serveur minimes en usage normal.
- Un attaquant qui veut DOS passera par des routes plus coûteuses (Server Action contact, queries BDD). Cette route fait du `fs.readFile` synchrone simple, coût serveur marginal.
- Rate-limit in-memory ne survit pas aux redémarrages ni au multi-instance (mais le portfolio est single-instance Dokploy donc OK). Complexité non justifiée MVP.
- Ajoutable plus tard si analytics montrent du fuzzing abusif.

### Décision : Cache-Control 1 an immutable

**Options envisagées :**
- **A. `public, max-age=31536000, immutable`** (1 an).
- **B. `public, max-age=3600`** (1 heure).

**Choix : A**

**Rationale :**
- Les captures d'écran de projets ne bougent pas souvent. Cache long = UX fluide (chargement instantané lors de navigations).
- Si besoin de remplacer une image, convention : changer le filename (ex: `capture-v2.png` au lieu d'`capture.png`). Invalidation via rename, pas via cache-bust.
- `immutable` = directive HTTP qui dit au navigateur de ne PAS revalider, même si l'utilisateur fait un reload. Cohérent avec la convention de rename.
- Pour les SVG qui sont le logo ou similaires, cache long aussi OK — si logo change, nouveau filename.

### Décision : Logging Pino asymétrique 400/warn + 404/debug

**Options envisagées :**
- **A. 400 warn + 404 debug** : distingue signal potentiellement hostile (400) du bruit normal (404).
- **B. Silence complet** : aucun log.
- **C. Tout en info** : logs de tous les accès.

**Choix : A**

**Rationale :**
- 400 = filename rejeté pour invalidité (path traversal, extension exotique, null byte). Intéressant de le voir pour détecter des tentatives d'attaque dans les logs prod.
- 404 = fichier inexistant, souvent bénin (lien cassé dans un e-mail historique, scraper qui teste des URLs aléatoires). Pas besoin de polluer les warn.
- Aucun log sur 200 : volume trop élevé pour un portfolio avec du traffic (chaque page vue = 1-5 assets). Les métriques d'accès seront géfées par Umami/analytics niveau plus haut.
- Conforme à [.claude/rules/pino/logger.md](../../../../.claude/rules/pino/logger.md) : logger des événements structurés avec un child logger nommé.

