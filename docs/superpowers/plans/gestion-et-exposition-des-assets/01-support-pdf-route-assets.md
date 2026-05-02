# Support PDF dans `/api/assets/[...path]` + convention `documents/<slug>/`: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Étendre la route catch-all `/api/assets/[...path]` au type MIME `application/pdf` et documenter la convention de sous-dossiers `documents/<slug>/<filename>` (avec `cv/` slug réservé pour le CV).

**Architecture:** Single-touch extension du helper `src/server/config/assets.ts` (ajout d'une entrée dans `CONTENT_TYPE_MAP`, qui est la source unique de vérité dont dérivent `AssetPathSchema`, `validateAssetPath` et `getContentType`). Mise à jour de tests Vitest existants (unit + integration) + mise à jour de la rule technique. Aucune modification de la route handler ni du gitignore. Voir spec : `docs/superpowers/specs/gestion-et-exposition-des-assets/01-support-pdf-route-assets-design.md`.

**Tech Stack:** TypeScript 6 strict, Next.js 16 App Router, Zod, Vitest (node env pour helper, node env pour route integration via `@vitest-environment node`), no Prisma nor PostgreSQL involved (le fichier test d'intégration utilise uniquement le filesystem via `TEST_ASSETS_DIR`).

**Environnement dev** : tous les tests de ce plan sont exécutables sans Docker ni PostgreSQL (pas de dépendance DB). Le warning SessionStart sur Docker/Postgres ne bloque pas l'exécution.

---

## File Structure

Chaque fichier a une responsabilité unique et déjà établie dans le codebase. On ajoute du contenu aux fichiers existants, pas de nouveau fichier source.

| Fichier | Rôle | Nature du changement |
|---------|------|----------------------|
| `src/server/config/assets.ts` | Source unique de vérité MIME/validation | +1 ligne dans `CONTENT_TYPE_MAP` |
| `src/server/config/assets.test.ts` | Tests unit du helper | Ajustement 1 assertion existante (PDF n'est plus rejetée) + 2 nouveaux blocs de test |
| `src/app/api/assets/[...path]/route.integration.test.ts` | Test bout-en-bout du handler | +1 fixture PDF, +1 scénario test |
| `.claude/rules/nextjs/assets.md` | Rule technique chargée par les workflows | Extension whitelist + section `documents/<slug>/` + exemple |

Aucune création de fichier, aucune suppression, aucune modification de `.gitignore`. Voir `Architectural decisions` du spec pour la justification (alignement sur le pattern `projets/` non versionné).

---

### Task 1 : Tests unit: PDF accepté + Content-Type

**Files:**
- Modify: `src/server/config/assets.test.ts`

**But** : faire échouer les tests unit en listant le comportement attendu pour PDF **avant** d'ajouter l'entrée dans `CONTENT_TYPE_MAP`. Cible les scénarios 1, 2, 3 du spec.

- [ ] **Step 1.1 : Retirer l'assertion PDF rejetée (devenue obsolète)**

Dans `src/server/config/assets.test.ts`, identifier le bloc lignes 43-47 :

```typescript
  it('rejette les extensions hors whitelist et segments commençant par un point', () => {
    expect(validateAssetPath(['malware.exe']).ok).toBe(false)
    expect(validateAssetPath(['doc.pdf']).ok).toBe(false)
    expect(validateAssetPath(['.htaccess']).ok).toBe(false)
  })
```

Remplacer la ligne `expect(validateAssetPath(['doc.pdf']).ok).toBe(false)` par une autre extension non whitelistée pour conserver la couverture :

```typescript
  it('rejette les extensions hors whitelist et segments commençant par un point', () => {
    expect(validateAssetPath(['malware.exe']).ok).toBe(false)
    expect(validateAssetPath(['doc.docx']).ok).toBe(false)
    expect(validateAssetPath(['.htaccess']).ok).toBe(false)
  })
```

- [ ] **Step 1.2 : Ajouter cas PDF accepté dans `AssetPathSchema + validateAssetPath`**

Dans le même `describe('AssetPathSchema + validateAssetPath', () => { ... })`, ajouter **à la fin du bloc** (après le `it('exige une extension valide sur le dernier segment uniquement', ...)` ligne 53-56) :

```typescript
  it('accepte un PDF sous documents/cv/', () => {
    expect(
      validateAssetPath(['documents', 'cv', 'cv-thibaud-geisler-fr.pdf']).ok,
    ).toBe(true)
  })

  it('accepte un PDF avec extension majuscule (flag i)', () => {
    expect(validateAssetPath(['documents', 'cv', 'CV-TEST.PDF']).ok).toBe(true)
  })
```

- [ ] **Step 1.3 : Étendre le bloc `getContentType` pour PDF**

Dans le `describe('getContentType', () => { ... })` (lignes 59-73), remplacer l'assertion titrée "mape les 5 extensions whitelist" par une version à 6 extensions incluant PDF :

```typescript
  it('mape les 6 extensions whitelist vers le bon MIME (case-insensitive)', () => {
    expect(getContentType('a.png')).toBe('image/png')
    expect(getContentType('a.jpg')).toBe('image/jpeg')
    expect(getContentType('a.jpeg')).toBe('image/jpeg')
    expect(getContentType('a.webp')).toBe('image/webp')
    expect(getContentType('a.svg')).toBe('image/svg+xml')
    expect(getContentType('a.pdf')).toBe('application/pdf')
    expect(getContentType('Test.PNG')).toBe('image/png')
    expect(getContentType('CV.PDF')).toBe('application/pdf')
  })
```

- [ ] **Step 1.4 : Lancer les tests unit et confirmer l'échec**

Run: `pnpm vitest run src/server/config/assets.test.ts`

Expected: plusieurs échecs (assertions PDF → "expected false to be true" et "expected undefined to be 'application/pdf'").

- [ ] **Step 1.5 : Commit des tests (red)**

```bash
git add src/server/config/assets.test.ts
git commit -m "test(assets): ajoute cas PDF attendus (documents/cv + Content-Type)"
```

---

### Task 2 : Implémentation: ajout `pdf` dans `CONTENT_TYPE_MAP`

**Files:**
- Modify: `src/server/config/assets.ts`

**But** : une seule ligne à ajouter fait passer les tests unit (propagation automatique via `Object.keys(CONTENT_TYPE_MAP)` côté `AssetPathSchema` et lookup côté `getContentType`).

- [ ] **Step 2.1 : Ajouter l'entrée PDF dans `CONTENT_TYPE_MAP`**

Dans `src/server/config/assets.ts`, modifier le bloc lignes 5-11 :

```typescript
export const CONTENT_TYPE_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
}
```

- [ ] **Step 2.2 : Lancer les tests unit, confirmer PASS**

Run: `pnpm vitest run src/server/config/assets.test.ts`

Expected: `Test Files 1 passed`, tous les tests verts.

- [ ] **Step 2.3 : Commit de l'implémentation (green)**

```bash
git add src/server/config/assets.ts
git commit -m "feat(assets): autorise PDF dans CONTENT_TYPE_MAP"
```

---

### Task 3 : Test d'intégration: GET PDF sous `documents/cv/`

**Files:**
- Modify: `src/app/api/assets/[...path]/route.integration.test.ts`

**But** : cible le scénario 1 du spec (GET PDF valide → 200 + Content-Type + corps binaire). Les scénarios 3 et 4 (400 extension non whitelist, 404 PDF inexistant) sont couverts par les tests existants sur `.exe` et `absent.png` : ajouter un doublon PDF n'apporte pas de garantie nouvelle (même branche de code dans le handler). YAGNI.

- [ ] **Step 3.1 : Ajouter la fixture PDF minimale**

Dans `src/app/api/assets/[...path]/route.integration.test.ts`, après la constante `SVG_MIN` (ligne 17), ajouter :

```typescript
const PDF_MIN = Buffer.from('%PDF-1.4\n%%EOF\n', 'ascii')
```

- [ ] **Step 3.2 : Créer le dossier `documents/cv/` et y écrire le PDF dans `beforeAll`**

Dans le `beforeAll` (lignes 19-28), ajouter après la création de `projets/client/foyer/` :

```typescript
beforeAll(() => {
  mkdirSync(path.join(TEST_ASSETS_DIR, 'projets', 'client', 'foyer'), { recursive: true })
  mkdirSync(path.join(TEST_ASSETS_DIR, 'documents', 'cv'), { recursive: true })
  writeFileSync(path.join(TEST_ASSETS_DIR, 'test.png'), PNG_1X1)
  writeFileSync(path.join(TEST_ASSETS_DIR, 'test.svg'), SVG_MIN)
  writeFileSync(
    path.join(TEST_ASSETS_DIR, 'projets', 'client', 'foyer', 'logo.png'),
    PNG_1X1,
  )
  writeFileSync(
    path.join(TEST_ASSETS_DIR, 'documents', 'cv', 'cv-test.pdf'),
    PDF_MIN,
  )
  process.env.ASSETS_PATH = TEST_ASSETS_DIR
})
```

- [ ] **Step 3.3 : Ajouter le scénario GET PDF**

À la fin du `describe('GET /api/assets/[...path]', () => { ... })`, après le test `'retourne 200 pour un PNG imbriqué sous projets/client/foyer/'` (lignes 103-107), ajouter :

```typescript
  it('retourne 200 + Content-Type application/pdf pour un PDF sous documents/cv/', async () => {
    const response = await callRoute(['documents', 'cv', 'cv-test.pdf'])
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body.equals(PDF_MIN)).toBe(true)
  })
```

- [ ] **Step 3.4 : Lancer le test d'intégration, confirmer PASS**

Run: `pnpm vitest run src/app/api/assets/[...path]/route.integration.test.ts`

Expected: `Test Files 1 passed`, le nouveau scénario PDF est vert, tous les existants restent verts.

- [ ] **Step 3.5 : Commit du test d'intégration**

```bash
git add src/app/api/assets/[...path]/route.integration.test.ts
git commit -m "test(assets): GET PDF sous documents/cv retourne 200 + application/pdf"
```

---

### Task 4 : Mise à jour de la rule `.claude/rules/nextjs/assets.md`

**Files:**
- Modify: `.claude/rules/nextjs/assets.md`

**But** : cible le scénario 5 du spec. La rule devient la source documentaire de la nouvelle whitelist et de la convention `documents/<slug>/<filename>`.

- [ ] **Step 4.1 : Étendre la whitelist dans "À faire"**

Dans `.claude/rules/nextjs/assets.md` ligne 16, remplacer :

```markdown
- Valider chaque segment du `path` via un schéma Zod strict (regex `^[a-z0-9][a-z0-9._-]*$` par segment, insensible à la casse) et valider que le **dernier segment** porte une extension whitelist (png/jpg/jpeg/webp/svg). Profondeur max 5 segments
```

par :

```markdown
- Valider chaque segment du `path` via un schéma Zod strict (regex `^[a-z0-9][a-z0-9._-]*$` par segment, insensible à la casse) et valider que le **dernier segment** porte une extension whitelist (png/jpg/jpeg/webp/svg/pdf). Profondeur max 5 segments
```

- [ ] **Step 4.2 : Ajouter une puce "Organisation documents" après la puce "Organisation en sous-dossiers"**

Dans la section "À faire", **juste après** la puce ligne 15 (`- **Organisation en sous-dossiers** : convention assets/projets/...`), insérer la nouvelle puce suivante (avant la puce "Valider chaque segment") :

```markdown
- **Organisation des documents publics** : convention `assets/documents/<slug>/<filename>` (ex: `documents/cv/cv-thibaud-geisler-fr.pdf`, `documents/cv/cv-thibaud-geisler-en.pdf`, `documents/plaquette-freelance/plaquette-fr.pdf`). Le slug `cv` est **réservé** pour le CV ; les fichiers CV suivent le pattern `cv-thibaud-geisler-<locale>.pdf` (locales alignées sur next-intl : `fr`, `en`). Comme pour `projets/`, les sous-dossiers ne sont pas versionnés (`.gitkeep` uniquement à la racine `assets/`) : ils se créent à la volée lors du premier dépôt de fichier en dev, ou via le volume Docker `portfolio_assets` en prod
```

- [ ] **Step 4.3 : Mettre à jour l'exemple `CONTENT_TYPE_MAP`**

Dans le bloc d'exemple TypeScript ligne 46-49, remplacer :

```typescript
export const CONTENT_TYPE_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', svg: 'image/svg+xml',
}
```

par :

```typescript
export const CONTENT_TYPE_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf',
}
```

- [ ] **Step 4.4 : Commit de la rule**

```bash
git add .claude/rules/nextjs/assets.md
git commit -m "docs(rules): étend assets.md au PDF + convention documents/<slug>/"
```

---

### Task 5 : Vérification finale (lint + typecheck + suite de tests complète)

**But** : s'assurer qu'aucune régression n'a été introduite sur les modules adjacents. Les tests intégration assets tournent sans Postgres (filesystem only), mais `just test` inclut aussi `test-integration` qui peut toucher d'autres tests nécessitant la DB : on isole d'abord les tests assets, puis on laisse `just test` finir si l'env le permet.

- [ ] **Step 5.1 : Typecheck strict**

Run: `just typecheck` (équivalent `pnpm tsc --noEmit`)

Expected: aucune erreur. Le changement est une entrée dans un `Record<string, string>`, aucun nouveau type n'a été introduit.

- [ ] **Step 5.2 : Lint**

Run: `just lint`

Expected: aucune erreur/warning sur les fichiers modifiés.

- [ ] **Step 5.3 : Suite unit + integration ciblée sur assets**

Run: `pnpm vitest run src/server/config/assets.test.ts src/app/api/assets/[...path]/route.integration.test.ts`

Expected: tous les tests verts, les 2 fichiers passent sans skip.

- [ ] **Step 5.4 : Suite complète si l'environnement DB est disponible**

Run: `just test`

Expected en environnement complet : tous verts. Si PostgreSQL / Docker n'est pas démarré dans la session courante (voir warning SessionStart), **skipper cette étape** et documenter dans le message de PR (les tests DB-dépendants tourneront en CI via le workflow GitHub Actions).

- [ ] **Step 5.5 : Inspection finale des fichiers touchés**

Run: `git diff --stat HEAD~4`

Expected: 4 fichiers modifiés, aucune modification hors du scope (pas de `.gitignore`, pas de nouveaux fichiers).

---

## Self-Review

**Spec coverage :**
- Scénario 1 (GET PDF valide 200 + Content-Type + Cache-Control) → Task 3 couvre 200 + Content-Type. Cache-Control conditionnel dev/prod déjà testé par les scénarios existants (PNG dev + prod) : même branche de code dans `route.ts`, pas d'assertion redondante nécessaire sur PDF (YAGNI, règle no-lib-test).
- Scénario 2 (GET PDF extension majuscule) → Task 1.2 (`validateAssetPath(['documents', 'cv', 'CV-TEST.PDF'])`) + Task 1.3 (`getContentType('CV.PDF')`).
- Scénario 3 (extension non whitelistée 400) → déjà couvert par le test existant `.exe` (ligne 53-56 de `route.integration.test.ts`) et par l'assertion `doc.docx` mise à jour en Task 1.1. Pas de test dupliqué.
- Scénario 4 (PDF inexistant 404) → déjà couvert par le test existant `absent.png` (ligne 63-66 de `route.integration.test.ts`) : même branche `ENOENT` dans le handler. YAGNI.
- Scénario 5 (rule à jour) → Task 4 complète (whitelist + section documents + exemple).

**Placeholder scan :** aucun TBD/TODO/"à définir" dans le plan. Chaque step a son code/commande/output attendu.

**Type consistency :** pas de nouveau type introduit. `CONTENT_TYPE_MAP: Record<string, string>` inchangé structurellement, juste une entrée additionnelle.

**Scope lock :** 4 fichiers touchés = files_touched du spec moins `.gitignore` et `assets/documents/.gitkeep` (retirés suite à la décision Architectural B revisitée).

---

## Verification (end-to-end manual)

Après fusion, pour valider manuellement l'incrément en dev :

1. Lancer `just docker-up` puis `pnpm dev` (port 3000).
2. Déposer un fichier PDF sur disque : `mkdir -p assets/documents/cv && cp ~/Documents/cv-reel.pdf assets/documents/cv/cv-thibaud-geisler-fr.pdf`.
3. Ouvrir `http://localhost:3000/api/assets/documents/cv/cv-thibaud-geisler-fr.pdf` dans le navigateur → le PDF doit s'ouvrir/télécharger.
4. Vérifier en devtools Network que la réponse porte `Content-Type: application/pdf` et `Cache-Control: no-cache, no-store, must-revalidate` (branche dev).
5. Tester un fichier inexistant : `http://localhost:3000/api/assets/documents/cv/ghost.pdf` → 404 + JSON `{"error":"Not found"}`.
6. Tester une extension non whitelistée : `http://localhost:3000/api/assets/documents/cv/resume.docx` → 400.
