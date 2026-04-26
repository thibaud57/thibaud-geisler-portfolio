---
feature: "Feature 4 — Formulaire de contact"
subproject: "zod-schema-contact"
goal: "Définir le schéma Zod contactSchema qui valide les 5 champs métier du formulaire de contact (name, company, email, subject, message) avec des codes d'erreur custom destinés à l'i18n côté UI."
status: "draft"
complexity: "S"
tdd_scope: "partial"
depends_on: []
date: "2026-04-26"
---

# Schéma Zod du formulaire de contact

## Scope

Création de `src/lib/schemas/contact.ts` exposant `contactSchema` (Zod object des 5 champs métier avec longueurs alignées sur la prod : `name` 1-120, `company` 0-200, `email` 1-200 + format, `subject` 1-200, `message` 20-5000) et le type inféré `ContactInput = z.infer<typeof contactSchema>`. Tous les champs string sont `trim()` directement dans le schéma. Les messages d'erreur sont des codes snake_case stables (`'name_required'`, `'email_invalid'`, etc.) destinés à être mappés vers les traductions next-intl par le sub 04.

**Exclu** : champ honeypot `website` (orthogonal à la validation métier — vérifié séparément par la Server Action sub 03 via `formData.get('website')` avant le `safeParse`), helper `sanitizeContactInput` autonome (`.trim()` est intégré dans le schéma, pas besoin d'abstraction supplémentaire), utilisation du schéma dans une Server Action (sub 03), localisation des codes d'erreur (sub 04 via `t('ContactPage.form.errors.<code>')`), tests sur les comportements internes de Zod (no-lib-test : pas de test « Zod rejette un email mal formé »).

### État livré

À la fin de ce sub-project, on peut : importer `contactSchema` et `ContactInput` depuis `@/lib/schemas/contact`, appeler `contactSchema.safeParse(Object.fromEntries(formData))` et obtenir soit `{ success: true, data }` (avec `data` typée `ContactInput` et champs trim'és), soit `{ success: false, error }` dont `error.flatten().fieldErrors` retourne un objet `{ <champ>: ['<code>'] }` directement consommable par `useActionState`. `pnpm test src/lib/schemas/contact.test.ts` passe vert avec couverture des codes d'erreur custom et du trim.

## Dependencies

Aucune — ce sub-project est autoporté. `zod` est déjà installé dans le projet.

## Files touched

- **À créer** : `src/lib/schemas/contact.ts` (schéma + type inféré exporté)
- **À créer** : `src/lib/schemas/contact.test.ts` (tests unitaires Vitest, collocated selon convention projet)

## Architecture approach

- **Path canonique** : `src/lib/schemas/<nom>.ts` conformément à `.claude/rules/zod/validation.md` (l'exemple ligne 34 trace `import { Schema } from '@/lib/schemas/example'`). Pas de dossier `validators/` créé.
- **Tests collocated** : `src/lib/schemas/contact.test.ts` à côté du source, conforme au pattern projet existant (cf `src/lib/projects.test.ts`, `src/i18n/localize-content.test.ts`, `src/server/config/assets.test.ts`).
- **Codes d'erreur snake_case** : chaque contrainte Zod reçoit un message qui est un code stable (`'name_required'`, `'name_too_long'`, `'email_invalid'`, `'message_too_short'`, etc.). Ces codes sont la « clé » que sub 04 mappe ensuite vers les traductions next-intl via `t('ContactPage.form.errors.<code>')`. Découplage backend↔i18n strict.
- **Trim natif Zod** : `z.string().trim()` au lieu d'un helper externe. Conforme au principe « pas de sur-ingénierie anticipatoire » (CLAUDE.md). Avantage : le `data` retourné par `safeParse` contient déjà les valeurs nettoyées, sub 03 n'a rien à pré-traiter.
- **Pas de `.strict()`** sur le schéma : laisser le default (champs inconnus ignorés silencieusement). Le champ `website` (honeypot) sera présent dans le `formData` mais ignoré par `safeParse`. C'est sub 03 qui le lit séparément.
- **`company` optional** : `.optional()` (renvoie `string | undefined` côté typage). Le champ peut être absent ou présent vide après trim — la longueur max 200 reste appliquée s'il est rempli.
- **Pas de `.email()` sur les autres champs** : seul `email` utilise `z.string().email('email_invalid')`. Conforme à la rule zod/schemas.
- **Type inféré exporté** : `export type ContactInput = z.infer<typeof contactSchema>`, jamais typé à la main, conforme à `.claude/rules/zod/validation.md` ligne 15-16.
- **Conventions TypeScript** : `.claude/rules/typescript/conventions.md` (export nommé pour `contactSchema`, type inféré nommé `ContactInput`).
- **Conventions Zod** : `.claude/rules/zod/schemas.md` + `.claude/rules/zod/validation.md` (consommation via `safeParse` + `flatten().fieldErrors` côté sub 03).

## Acceptance criteria

### Scénario 1 : payload valide
**GIVEN** un objet `{ name: "Alice", company: "Acme", email: "alice@acme.fr", subject: "Projet IA", message: "Bonjour, j'aimerais discuter d'un projet IA dans ma boîte" }`
**WHEN** `contactSchema.safeParse(input)` est appelé
**THEN** le résultat est `{ success: true, data }` avec `data` typé `ContactInput`
**AND** chaque champ string est trim'é (espaces leading/trailing supprimés)

### Scénario 2 : `name` vide après trim
**GIVEN** `name: "   "` (3 espaces)
**WHEN** `contactSchema.safeParse({ name: "   ", email: "...", subject: "...", message: "..." })` est appelé
**THEN** le résultat est `{ success: false, error }`
**AND** `error.flatten().fieldErrors.name` contient `['name_required']`

### Scénario 3 : `name` > 120 caractères
**GIVEN** `name` est une chaîne de 121 caractères
**WHEN** `contactSchema.safeParse(...)` est appelé
**THEN** `error.flatten().fieldErrors.name` contient `['name_too_long']`

### Scénario 4 : `email` mal formé
**GIVEN** `email: "pas-un-email"`
**WHEN** `contactSchema.safeParse(...)` est appelé
**THEN** `error.flatten().fieldErrors.email` contient `['email_invalid']`

### Scénario 5 : `subject` vide
**GIVEN** `subject: ""`
**WHEN** `contactSchema.safeParse(...)` est appelé
**THEN** `error.flatten().fieldErrors.subject` contient `['subject_required']`

### Scénario 6 : `message` < 20 caractères
**GIVEN** `message: "Trop court"` (10 chars)
**WHEN** `contactSchema.safeParse(...)` est appelé
**THEN** `error.flatten().fieldErrors.message` contient `['message_too_short']`

### Scénario 7 : `message` > 5000 caractères
**GIVEN** `message` est une chaîne de 5001 caractères
**WHEN** `contactSchema.safeParse(...)` est appelé
**THEN** `error.flatten().fieldErrors.message` contient `['message_too_long']`

### Scénario 8 : `company` absente
**GIVEN** un payload sans la clé `company`
**WHEN** `contactSchema.safeParse(...)` est appelé
**THEN** `success: true`
**AND** `data.company` vaut `undefined`

### Scénario 9 : `company` > 200 caractères
**GIVEN** `company` est une chaîne de 201 caractères
**WHEN** `contactSchema.safeParse(...)` est appelé
**THEN** `error.flatten().fieldErrors.company` contient `['company_too_long']`

### Scénario 10 : champ inconnu ignoré
**GIVEN** un payload contenant `website: "spam-bot-filled"` (le honeypot rempli, simulé)
**WHEN** `contactSchema.safeParse(...)` est appelé sur le payload (avec les 5 champs métier valides)
**THEN** `success: true`
**AND** `data` ne contient PAS la clé `website` (champ inconnu ignoré silencieusement faute de `.strict()`)

## Tests à écrire

### Unit
- `src/lib/schemas/contact.test.ts` :
  - `contactSchema` accepte un payload valide minimal (sans `company`) et retourne `data` typé `ContactInput`
  - `contactSchema` trim les 4 champs string requis (`name`, `email`, `subject`, `message`) — vérifié via `data.name === 'Alice'` quand l'input est `'  Alice  '`
  - `contactSchema` retourne le code `'name_required'` quand `name` est vide après trim
  - `contactSchema` retourne le code `'name_too_long'` quand `name` dépasse 120 caractères
  - `contactSchema` retourne le code `'email_invalid'` quand `email` ne matche pas le format Zod
  - `contactSchema` retourne le code `'subject_required'` quand `subject` est vide
  - `contactSchema` retourne le code `'message_too_short'` quand `message` < 20 caractères
  - `contactSchema` retourne le code `'message_too_long'` quand `message` > 5000 caractères
  - `contactSchema` accepte `company` absente (et `data.company === undefined`)
  - `contactSchema` retourne le code `'company_too_long'` quand `company` dépasse 200 caractères
  - `contactSchema` ignore silencieusement les champs inconnus (test avec `website: 'x'` qui ne fait pas échouer le parse)

## Edge cases

- **`name` exactement 120 caractères** : passe (`max(120)` est inclusif).
- **`message` exactement 20 caractères** : passe (`min(20)` est inclusif).
- **Tous les champs sont des chaînes contenant uniquement des espaces** : après `.trim()`, deviennent `''` → tous les codes `_required` se déclenchent en cascade (`name_required`, `subject_required`, `message_too_short` puisque 0 < 20). Comportement attendu, sub 04 affiche les erreurs sous chaque champ.
- **Email avec espaces autour** : `' alice@acme.fr '` est trim'é avant validation `.email()` → passe normalement (Zod applique les transformations dans l'ordre déclaré).
- **`company` vide après trim** : `optional()` permet `undefined` mais une chaîne vide passée explicitement passe le test `max(200)` — `data.company === ''`. Acceptable, sub 03 utilisera `data.company || undefined` si besoin.

## Architectural decisions

### Décision : honeypot dans le schéma vs vérifié séparément

**Options envisagées :**
- **A. Honeypot vérifié séparément par sub 03** : le schéma `contactSchema` ignore le champ `website`. Sub 03 lit `formData.get('website')` avant le `safeParse` ; si non vide, retourne immédiatement un succès silencieux factice (`{ ok: true }` sans envoi).
- **B. Honeypot dans le schéma** : ajout de `website: z.string().max(0, 'honeypot_filled').optional().default('')`. Si rempli, `safeParse` échoue avec le code `'honeypot_filled'`. Sub 03 traite ce code spécifiquement pour retourner un succès silencieux factice.

**Choix : A**

**Rationale :**
- Le schéma est un contrat de validation métier (les 5 champs visibles utilisateur). Le honeypot est un mécanisme anti-spam orthogonal qui demande un comportement spécial (succès factice, pas un échec utilisateur). Mélanger les deux pollue le schéma et complique sub 04 qui devrait alors filtrer le code `'honeypot_filled'` avant d'afficher les erreurs.
- Avec A, le schéma reste pur (5 codes d'erreur tous user-facing). Sub 04 mappe directement chaque code à un message i18n sans cas particulier.
- Sub 03 a déjà la responsabilité du rate limit et des logs, ajouter le check honeypot 1 ligne avant le `safeParse` est minimal et lisible.

### Décision : codes d'erreur snake_case vs camelCase

**Options envisagées :**
- **A. snake_case** : `'name_required'`, `'email_invalid'`, `'message_too_short'`. Cohérent avec la convention « event names » Pino (`email:sent`, `email:failed`) et lisible visuellement.
- **B. camelCase** : `'nameRequired'`, `'emailInvalid'`, `'messageTooShort'`. Cohérent avec les conventions JS/TS standard pour les identifiants.

**Choix : A**

**Rationale :**
- Les codes d'erreur sont des **string littéraux** au sens API/protocole, pas des identifiants TypeScript. Le snake_case est neutre et résiste aux automatismes de tooling (ex: linter qui veut renommer un identifiant camelCase).
- Les clés i18n côté sub 04 seront `ContactPage.form.errors.name_required` (mapping 1-1 trivial). Pas de transformation à faire entre code et clé.
- Cohérence avec les codes d'événements Pino du projet (`email:sent`, `email:failed`) — même registre « string littérale dans les logs/erreurs ».

### Décision : `trim()` dans le schéma vs helper séparé

**Options envisagées :**
- **A. `.trim()` natif Zod** : `z.string().trim().min(...)` directement dans la définition du schéma. Le `data` retourné par `safeParse` contient les valeurs nettoyées.
- **B. Helper `sanitizeContactInput(raw)`** : fonction externe appelée par sub 03 avant le `safeParse`.

**Choix : A**

**Rationale :**
- YAGNI : `.trim()` Zod fait exactement le job, pas besoin d'une indirection.
- Avec A, le schéma est la source de vérité unique pour la validation ET la sanitization de chaîne. Sub 03 fait un seul appel (`safeParse`) et reçoit des données prêtes à l'emploi.
- Aligne avec la philo projet « pas de sur-ingénierie anticipatoire » (CLAUDE.md).
