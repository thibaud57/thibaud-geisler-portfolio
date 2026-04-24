---
feature: "Feature 3 MVP — Gestion et exposition des assets"
subproject: "support-pdf-route-assets"
goal: "Permettre à la route /api/assets/[...path] de servir les PDF et documenter la convention documents/<slug>/<filename>"
status: "implemented"
complexity: "S"
tdd_scope: "partial"
depends_on: []
date: "2026-04-24"
---

# Support PDF dans la route `/api/assets/[...path]` + convention `documents/<slug>/`

## Scope

Étendre la whitelist de la route catch-all assets au type MIME `application/pdf` pour débloquer la publication du CV et des documents publics, et documenter la convention de sous-dossiers `documents/<slug>/<filename>` (avec `cv/` comme slug réservé pour le CV). La whitelist des extensions est dérivée des clés de `CONTENT_TYPE_MAP` dans `src/server/config/assets.ts` (single source of truth) : une seule entrée à ajouter cascade automatiquement à `AssetPathSchema`, `validateAssetPath`, `getContentType`, et la route handler. **Exclu** : autres extensions (`docx`, `md`, `zip`), rate limiting `/api/assets` (ADR-014 `proposed`), migration Cloudflare R2 (ADR-011 trigger post-MVP), composant bouton CV côté UI (sub-project 02), matérialisation versionnée du dossier `assets/documents/` (aligné sur le pattern existant — voir Architectural decisions).

### État livré

À la fin de ce sub-project, on peut : déposer manuellement `assets/documents/cv/cv-thibaud-geisler-fr.pdf` en dev (le dossier est créé à la volée, gitignored), lancer `pnpm dev`, requêter `GET /api/assets/documents/cv/cv-thibaud-geisler-fr.pdf` et recevoir une réponse 200 avec `Content-Type: application/pdf` et `Cache-Control: no-cache, no-store, must-revalidate` ; le test d'intégration Vitest correspondant passe en CI.

## Dependencies

Aucune — ce sub-project est autoporté.

## Files touched

- **À modifier** : `src/server/config/assets.ts` (ajouter `pdf: 'application/pdf'` dans `CONTENT_TYPE_MAP`)
- **À modifier** : `src/server/config/assets.test.ts` (ajouter cas `getContentType('foo.pdf')` et `validateAssetPath(['documents', 'cv', 'cv-thibaud-geisler-fr.pdf'])`)
- **À modifier** : `src/app/api/assets/[...path]/route.integration.test.ts` (ajouter scénario GET PDF sous `documents/cv/` → 200 + `Content-Type` + `Cache-Control`)
- **À modifier** : `.claude/rules/nextjs/assets.md` (étendre la whitelist à `pdf`, ajouter la section convention `documents/<slug>/<filename>` avec `cv/` réservé, exemples concrets ; préciser que `documents/` n'est pas matérialisé par un `.gitkeep` versionné — même pattern que `projets/`)

## Architecture approach

- **Extension MIME single-touch** : `CONTENT_TYPE_MAP` est la source unique de vérité dans `src/server/config/assets.ts`. Ajouter une entrée `pdf: 'application/pdf'` propage automatiquement l'extension à `AssetPathSchema` (via `ALLOWED_EXTENSIONS = Object.keys(CONTENT_TYPE_MAP)`), à `getContentType` (lookup direct), et au handler de route qui consomme ces helpers. Aucune modification de `src/app/api/assets/[...path]/route.ts` nécessaire. Voir `.claude/rules/nextjs/assets.md` (gotcha "dériver la whitelist Zod depuis `Object.keys(CONTENT_TYPE_MAP)` pour single source of truth").
- **Convention sous-dossiers documents** : adopter `documents/<slug>/<filename>` en miroir du pattern existant `projets/{client,personal}/<slug>/<filename>` documenté dans ADR-011. Le slug `cv` est réservé pour le CV (deux locales : `cv-thibaud-geisler-fr.pdf`, `cv-thibaud-geisler-en.pdf`). Profondeur = 3 segments, largement sous le max 5 segments imposé par `AssetPathSchema`. Chaque segment reste conforme au regex `^[a-z0-9][a-z0-9._-]*$` (kebab-case lower, cf. `.claude/rules/nextjs/assets.md`).
- **Rule update** : `.claude/rules/nextjs/assets.md` doit (1) étendre la whitelist mentionnée dans le "À faire" (png/jpg/jpeg/webp/svg **+ pdf**) et dans l'exemple `CONTENT_TYPE_MAP`, (2) ajouter un paragraphe "Organisation documents" en miroir de "Organisation en sous-dossiers" (projets), (3) lister `cv/` comme slug réservé avec pattern de nommage `cv-thibaud-geisler-<locale>.pdf`. Pas de duplication avec BRAINSTORM/ARCHITECTURE : la rule reste la source opérationnelle.
- **Route handler invariant** : le handler existant retourne déjà `Cache-Control: public, max-age=31536000, immutable` en production et `no-cache, no-store, must-revalidate` en dev (voir `src/app/api/assets/[...path]/route.ts`). Cette logique s'applique telle quelle aux PDF : pas d'effet secondaire du côté caching. Cohérent avec `.claude/rules/nextjs/api-routes.md` (route dynamique par défaut en Next 16, pas de `export const dynamic`) et `.claude/rules/nextjs/rendering-caching.md` (`cacheComponents: true` incompatible avec `dynamic` segment config).
- **Pas de `.gitkeep` versionné pour `documents/`** : le pattern existant (`git ls-files assets/` ne retourne que `assets/.gitkeep`) montre que `assets/projets/`, `assets/projets/client/`, `assets/projets/personal/` ne sont pas matérialisés dans le repo — ils sont créés automatiquement lors du premier dépôt de fichier en dev. On applique le même pattern à `documents/<slug>/` : aucune modification de `.gitignore`, aucun `.gitkeep` additionnel. La rule doit l'indiquer explicitement pour éviter la confusion. Voir "Architectural decisions" pour la justification.
- **Zod schemas stability** : `AssetPathSchema` reste module-level, dérivé via `z.infer` côté consommateurs. Aucun refactor requis (cf. `.claude/rules/zod/schemas.md`). L'extension automatique par dérivation des clés illustre le pattern "single source of truth" préconisé.
- **Tests** : Vitest existant couvre déjà les chemins nominaux images et les cas 400/404. Ajouter uniquement les cas PDF (unit + integration), dans les deux fichiers de test existants. Pas de nouveau fichier. Cohérent avec `.claude/rules/vitest/setup.md` et `.claude/rules/typescript/conventions.md` (alias `@/*`, `z.infer`, `strict: true`).

## Acceptance criteria

### Scénario 1 : GET PDF valide sous `documents/cv/`
**GIVEN** le fichier `assets/documents/cv/cv-thibaud-geisler-fr.pdf` existe sur le disque (monté via `ASSETS_PATH`)
**WHEN** un client requête `GET /api/assets/documents/cv/cv-thibaud-geisler-fr.pdf`
**THEN** la réponse est `200`
**AND** `Content-Type: application/pdf`
**AND** le corps binaire correspond au contenu du fichier sur disque
**AND** `Cache-Control` vaut `public, max-age=31536000, immutable` en production, `no-cache, no-store, must-revalidate` en dev

### Scénario 2 : GET PDF avec extension majuscule
**GIVEN** le fichier `assets/documents/cv/cv-thibaud-geisler-fr.PDF` existe
**WHEN** un client requête `GET /api/assets/documents/cv/cv-thibaud-geisler-fr.PDF`
**THEN** la réponse est `200`
**AND** `Content-Type: application/pdf`

*(Justification : la regex de segment `SEGMENT_PATTERN = /^[a-z0-9][a-z0-9._-]*$/i` est case-insensitive, et `path.extname(...).slice(1).toLowerCase()` normalise l'extension avant lookup. Déjà garanti par le helper existant, confirmé pour PDF.)*

### Scénario 3 : GET extension non whitelistée refusée
**GIVEN** la requête cible un fichier `documents/cv/resume.docx` (extension non présente dans `CONTENT_TYPE_MAP`)
**WHEN** un client requête `GET /api/assets/documents/cv/resume.docx`
**THEN** la réponse est `400`
**AND** le body JSON contient `error` mentionnant `Extension non autorisée`
**AND** un log `warn` est émis (`assets: invalid path`)

### Scénario 4 : GET PDF inexistant
**GIVEN** aucun fichier `documents/cv/ghost.pdf` sur le disque mais l'extension est whitelistée
**WHEN** un client requête `GET /api/assets/documents/cv/ghost.pdf`
**THEN** la réponse est `404`
**AND** le body JSON vaut `{ "error": "Not found" }`
**AND** un log `debug` est émis (`assets: not found`)

### Scénario 5 : rule technique à jour
**GIVEN** la rule `.claude/rules/nextjs/assets.md`
**WHEN** un développeur consulte la section "À faire" et les exemples
**THEN** la whitelist inclut `pdf` dans la liste des extensions autorisées et dans le `CONTENT_TYPE_MAP` exemple
**AND** une section explicite décrit la convention `documents/<slug>/<filename>` avec `cv/` comme slug réservé et le pattern `cv-thibaud-geisler-<locale>.pdf`

## Tests à écrire

Justification no-lib-test : on teste trois règles métier du projet (la whitelist inclut PDF, `Content-Type` exact retourné, convention de chemin `documents/cv/*.pdf` acceptée de bout en bout). Ces tests échoueraient si l'entrée `pdf` était oubliée dans `CONTENT_TYPE_MAP` ou si une régression changeait la logique de validation/resolve. Pas de test de plumbing `fs.readFile` (lib Node), pas de test de format du `Cache-Control` déjà couvert par l'existant pour les images (règle générique de la route, ne dépend pas de l'extension).

### Unit

- `src/server/config/assets.test.ts` :
  - `getContentType('cv-thibaud-geisler-fr.pdf')` retourne `'application/pdf'`
  - `getContentType('CV.PDF')` (case insensitive) retourne `'application/pdf'`
  - `validateAssetPath(['documents', 'cv', 'cv-thibaud-geisler-fr.pdf'])` retourne `{ ok: true, joined: 'documents/cv/cv-thibaud-geisler-fr.pdf' }`
  - `validateAssetPath(['documents', 'cv', 'resume.docx'])` retourne `{ ok: false, error: /Extension non autorisée/ }`

### Integration

- `src/app/api/assets/[...path]/route.integration.test.ts` :
  - `GET /api/assets/documents/cv/cv-test.pdf` avec fixture PDF sur disque → 200, `Content-Type: application/pdf`, corps binaire = fichier sur disque
  - `GET /api/assets/documents/cv/ghost.pdf` sans fichier sur disque → 404, body `{ error: 'Not found' }`
  - `GET /api/assets/documents/cv/resume.docx` → 400, body contient `Extension non autorisée`

## Edge cases

- **Profondeur 3 vs max 5** : la convention `documents/<slug>/<filename>` reste à 3 segments, bien sous la limite `MAX_SEGMENTS = 5`. Aucune modification du schéma requise. Le cas d'un document avec une variante additionnelle (ex: `documents/plaquette-freelance/v2/plaquette-fr.pdf`) resterait valide à 4 segments ; à ne pas proscrire dans la rule mais à utiliser avec parcimonie.
- **Slug `cv` collision éventuelle** : le slug `cv` est réservé pour le CV dans la rule. S'il y a un jour un document « CV de formation client », il devra s'appeler autrement (ex: `cv-formation`, `doc-cv-client`) pour ne pas entrer en collision avec la convention. Non bloquant en MVP (un seul CV personnel).
- **Pattern de matérialisation dossier** : `.gitignore` contient `/assets/*` + `!/assets/.gitkeep`. Seul `assets/.gitkeep` est versionné ; `assets/projets/`, `assets/projets/client/`, `assets/projets/personal/` ne le sont **pas** et sont créés à la volée lors du premier usage en dev. On s'aligne strictement sur ce pattern pour `documents/`.

## Architectural decisions

### Décision : matérialisation du dossier `assets/documents/` en dev

**Options envisagées :**
- **A. Étendre l'exception `.gitignore` à `!/assets/documents/.gitkeep`** : versionner explicitement un `.gitkeep` dans `assets/documents/` pour que le dossier existe au clone. Coût : 1 ligne dans `.gitignore` + 1 fichier `.gitkeep` vide. Incohérent avec le pattern existant (`projets/` n'est pas versionné).
- **B. Ne pas versionner de `.gitkeep`, créer le dossier au premier usage (comme `projets/`)** : `/assets/*` reste gitignoré strict, la rule documente la convention attendue, les dossiers apparaissent au fur et à mesure que le dev dépose des fichiers. Zéro fichier versionné, parfaitement cohérent avec `assets/projets/client/` et `assets/projets/personal/` qui existent uniquement localement.

**Choix : B**

**Rationale :**
- `git ls-files assets/` retourne uniquement `assets/.gitkeep`. Tous les sous-dossiers existants (`projets/`, `projets/client/`, `projets/personal/`) sont hors du repo et n'ont jamais eu de `.gitkeep` versionné : le projet a acté ce pattern depuis la Feature 2 (projets).
- Ajouter un `.gitkeep` uniquement pour `documents/` créerait une incohérence silencieuse dans le repo (deux pratiques différentes pour la même arborescence). La règle "pas d'exception arbitraire" prime.
- La rule `.claude/rules/nextjs/assets.md` reste la source de vérité pour la convention : le dev apprend l'arborescence `documents/<slug>/<filename>` en lisant la rule (chargée dynamiquement par les workflows), pas en scannant le filesystem au clone.
- Friction réelle au clone = nulle pour un repo single-user MVP où le dev principal connaît la convention. Pour un futur contributeur hypothétique, la doc opérationnelle dans la rule est plus lisible qu'un dossier vide versionné.

## Open questions

*(Aucune — toutes les décisions nécessaires à l'implémentation ont été prises.)*
