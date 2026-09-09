---
feature: "Feature 1 — Espace admin"
subproject: "crud-entreprises"
goal: "Gérer les entreprises clientes, avec un formulaire montable depuis son écran comme depuis le formulaire projet"
status: "draft"
complexity: "M"
tdd_scope: "full"
depends_on: ["07-crud-tags-design.md"]
date: "2026-09-03"
---

# CRUD des entreprises

## Scope

Créer, modifier et supprimer des entreprises depuis l'espace admin, en reprenant le pattern posé au sub-project `07`. La différence tient au composant de formulaire, conçu dès le départ pour deux points de montage : son propre écran de liste, et le select du formulaire projet du sub-project `13`.

Exclut l'édition du logo, qui suppose le sélecteur d'assets du sub-project `10` et le bucket `portfolio-admin` du `09` : le sub-project `13` la branche, en passant un `AssetPicker` optionnel à ce même `CompanyFormDialog`. Exclut aussi la création d'une entité légale, qui relève des mentions légales. Le rattachement à une entité légale **existante** est en revanche couvert.

### État livré

À la fin de ce sub-project, on peut : créer une entreprise depuis son écran, la modifier, constater qu'une entreprise rattachée à un projet ne peut pas être supprimée, et vérifier que le même composant de formulaire fonctionne monté ailleurs que sur sa page.

## Dependencies

- `07-crud-tags-design.md` (statut: draft) : pose le pattern CRUD que ce sub-project reprend : forme des Server Actions, forme de l'état de formulaire, traitement des erreurs Prisma.

## Files touched

- **À créer** : `src/lib/schemas/company.ts`
- **À créer** : `src/server/actions/companies.ts`
- **À créer** : `src/server/actions/companies.test.ts`
- **À créer** : `src/server/actions/companies.types.ts`
- **À créer** : `src/server/queries/companies.ts`
- **À modifier** : `src/app/admin/(protected)/entreprises/page.tsx` (remplacement de la page d'attente)
- **Aucun composant shadcn à installer en principe** : `dialog`, `select`, `alert-dialog`, `pagination` et `checkbox` sont posés par le sub-project `07`, dont celui-ci dépend. Vérifier tout de même leur présence et n'installer que ce qui manque, la règle valant pour tout l'epic
- **À créer** : `src/components/features/admin/companies/CompanyFormDialog.tsx`
- **À créer** : `src/components/features/admin/companies/CompaniesTable.tsx`
- **À créer** : `src/components/features/admin/companies/DeleteCompanyDialog.tsx`

## Architecture approach

**Le pattern du sub-project `07` est repris tel quel** : Server Actions en `(prevState, formData)`, état portant `ok`, `errors`, `message` et `values`, messages de validation en français dans le schéma, `useActionState` côté formulaire, interception des codes d'erreur Prisma. Ce qui suit ne décrit que ce qui diffère.

**Chaque Server Action vérifie la session elle-même.** `await getCurrentUser()` ouvre chaque mutation, hors de tout `try/catch`. Le layout protège l'affichage des pages, il ne protège pas l'exécution des actions : une Server Action exportée est un endpoint HTTP que quiconque connaît l'identifiant peut appeler sans jamais charger l'écran. C'est la défense en profondeur qu'impose `.claude/rules/nextjs/server-actions.md`, qui écrit aussi bien « vérifier l'authentification dans chaque Server Action, même si le proxy protège déjà la route » que « ne pas dépendre uniquement du proxy : un matcher modifié peut supprimer la couverture ». L'appel précède le `try`, sinon le `catch` avalerait l'interruption `unauthorized()` et la présenterait comme une erreur technique.

**Le formulaire est conçu pour deux points de montage.** `CompanyFormDialog` reçoit son déclencheur en prop plutôt que de le rendre lui-même : sur l'écran de liste ce sera un bouton « Nouvelle entreprise », dans le formulaire projet un bouton d'ajout adjacent au select. Il expose également un rappel de succès, pour que le formulaire projet puisse sélectionner l'entreprise fraîchement créée. Sans ce rappel, il faudrait recharger la page et l'on perdrait la saisie du projet en cours.

**Les secteurs sont une sélection multiple, en `Checkbox` shadcn.** `sectors` est un tableau de `CompanySector` en base. Un `FormData` renvoyant plusieurs valeurs pour une même clé, la lecture passe par `getAll` et non `get`, et le schéma valide un tableau. C'est la principale différence de forme avec les tags. Le composant est celui du registry, pas une case native : `docs/DESIGN.md` § Formulaires admin le prescrit, seul lui rendant l'état indéterminé qu'un « tout sélectionner » de tableau exige, et trois écrans de l'epic en ont besoin. Il est installé au sub-project `07`.

**`Company` vit dans le schema `freelance`.** Le sub-project `03` l'y a déplacée : c'est une entité du CRM, que la vitrine ne lit qu'à travers `ClientMeta` pour afficher le nom du client d'un projet. Rien ne change pour ce sub-project, le client Prisma exposant toujours `prisma.company`, mais l'écran des entreprises est le premier du domaine freelance et non un écran de la vitrine.

**La lecture des données de la page vit sous `<Suspense>`.** Avec `cacheComponents: true`, une requête Prisma sans `'use cache'` est un accès dynamique et fait échouer le build hors d'une frontière `<Suspense>`. La page monte un sous-composant async, sur le modèle posé au sub-project `07`.

**La liste réutilise le `DataTable` du sub-project `07`** : recherche, tri par colonne et pied paginé, sans réécrire quoi que ce soit. Les deux `Popover` de la barre d'outils restent hors epic, comme au `07`.

**La taille est optionnelle**, `size` étant nullable. La chaîne vide du formulaire est convertie en `null`, comme l'icône des tags.

**Le rattachement à une entité légale est un select des entités existantes.** `legalEntityId` porte une contrainte d'unicité : une entité légale ne peut être rattachée qu'à une seule entreprise. Une tentative de rattachement à une entité déjà prise lève un `P2002` sur ce champ, à traduire en message de formulaire au même titre que le slug.

**La suppression est bloquée par `ClientMeta`.** La relation porte `onDelete: Restrict`, donc une entreprise référencée par un projet client ne peut pas être supprimée. Même traitement que pour les tags rattachés.

**`websiteUrl` n'accepte que `http` et `https`.** `z.url()` valide par `new URL()`, qui accepte `javascript:alert(1)` : le champ se retrouverait dans un `href` de page publique, c'est-à-dire un XSS stocké. `docs/PRODUCTION.md` § Checklist Pré-MEP le signale nommément et demande de le corriger « avant le premier formulaire d'édition de l'espace admin », qui est celui-ci. Le schéma pose donc `z.url({ protocol: /^https?$/ })`, et un cas de test le couvre. `src/lib/url.ts` porte bien un `safeExternalUrl`, mais il ne protège que le rendu du case study, pas l'écriture ni les autres points d'affichage.

**L'étiquette invalidée est celle des projets.** Les entreprises apparaissent sur les pages publiques à travers les projets, dont les requêtes portent l'étiquette `projects`. Une modification d'entreprise doit donc invalider `projects` par `updateTag`, et non une étiquette qui lui serait propre.

Rules applicables : `.claude/rules/nextjs/server-actions.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/vitest/setup.md`.

## Acceptance criteria

### Scénario 1 : Création avec secteurs multiples
**GIVEN** le formulaire de création
**WHEN** on saisit un slug, un nom, et qu'on coche deux secteurs
**THEN** l'entreprise est créée avec les deux secteurs enregistrés
**AND** elle apparaît dans la liste

### Scénario 2 : Slug déjà pris
**GIVEN** une entreprise portant le slug `dentsu`
**WHEN** on tente d'en créer une seconde avec ce slug
**THEN** aucune ligne n'est créée
**AND** le message d'erreur apparaît sous le champ slug

### Scénario 3 : Entité légale déjà rattachée
**GIVEN** une entité légale déjà rattachée à une entreprise
**WHEN** on tente de la rattacher à une seconde entreprise
**THEN** l'enregistrement échoue
**AND** le message apparaît sous le champ d'entité légale, et non sous le slug

### Scénario 4 : Champs optionnels vides
**GIVEN** le formulaire de création
**WHEN** on laisse la taille, le site web et l'entité légale vides
**THEN** l'entreprise est créée
**AND** ces trois colonnes valent `null` en base, jamais une chaîne vide

### Scénario 5 : Suppression d'une entreprise sans projet
**GIVEN** une entreprise référencée par aucun projet
**WHEN** on confirme sa suppression
**THEN** elle disparaît de la base et de la liste

### Scénario 6 : Suppression d'une entreprise référencée
**GIVEN** une entreprise référencée par au moins un projet client
**WHEN** on tente de la supprimer
**THEN** la suppression échoue
**AND** un message explique qu'elle est utilisée par des projets

### Scénario 7 : Formulaire monté hors de sa page
**GIVEN** le composant de formulaire monté depuis un contexte autre que l'écran de liste
**WHEN** on crée une entreprise
**THEN** la création aboutit
**AND** le contexte appelant reçoit l'entreprise créée sans rechargement de page

### Scénario 8 : Répercussion sur le site public
**GIVEN** une entreprise dont le nom est modifié
**WHEN** on consulte une page publique affichant un projet client de cette entreprise
**THEN** le nouveau nom y figure, l'étiquette `projects` ayant été invalidée

### Scénario 9 : Action inatteignable sans session
**GIVEN** aucune session valide
**WHEN** la Server Action est appelée directement, sans passer par l'écran
**THEN** l'accès est refusé avant toute validation et toute écriture
**AND** aucune ligne n'est créée, modifiée ni supprimée

### Scénario 10 : URL de site web restreinte à http et https
**GIVEN** le formulaire de création
**WHEN** on soumet `javascript:alert(1)` comme site web
**THEN** la validation le refuse
**AND** aucune ligne n'est créée

### Scénario 11 : Build de production réussi
**GIVEN** `cacheComponents: true` et la lecture Prisma de la page
**WHEN** on exécute `pnpm build`
**THEN** le build aboutit
**AND** aucune erreur « Uncached data was accessed outside of `<Suspense>` » n'est levée

## Tests à écrire

### Unit

- `src/server/actions/companies.test.ts`, avec Prisma mocké :
  - un slug vide est refusé avant toute requête base
  - un nom vide est refusé
  - un slug non conforme au motif attendu est refusé
  - le slug est normalisé en minuscules
  - un secteur absent de `CompanySector` est refusé
  - une liste de secteurs vide est refusée, une entreprise devant en porter au moins un
  - plusieurs secteurs soumis sont tous conservés, ce qui vérifie la lecture par `getAll`
  - une taille absente de `CompanySize` est refusée
  - une taille vide est acceptée et enregistrée en `null`
  - un site web qui n'est pas une URL est refusé
  - un site web en `javascript:` est refusé, `z.url()` nu l'acceptant
  - un site web vide est accepté et enregistré en `null`
  - la création réussie invalide l'étiquette de cache `projects`
  - une violation d'unicité sur le slug est traduite en erreur sous le champ slug
  - une violation d'unicité sur l'entité légale est traduite en erreur sous ce champ, et non sous le slug
  - une violation de clé étrangère à la suppression est traduite en message explicite
  - les valeurs saisies sont retournées dans l'état en cas d'échec
  - un appel sans session est refusé avant toute requête base

Aucun test n'est écrit sur le rendu des composants. Le double montage du formulaire se vérifie manuellement au scénario 7, puis réellement au sub-project `13`.

## Edge cases

- **Distinguer les deux contraintes d'unicité** : le slug et l'entité légale lèvent tous deux un `P2002`. Sans lire `meta.target`, on afficherait « ce slug est déjà pris » alors que le problème vient de l'entité légale, et l'utilisateur chercherait longtemps
- **Secteurs lus avec `get` au lieu de `getAll`** : seul le premier secteur serait enregistré, silencieusement. Les autres disparaîtraient sans erreur
- **Chaînes vides converties en `null`** : `size`, `websiteUrl` et `legalEntityId` sont nullables. Un `FormData` renvoie `''` et non `undefined` : sans conversion, la base stockerait des chaînes vides, et `legalEntityId: ''` violerait la contrainte de clé étrangère
- **Étiquette de cache** : invalider une étiquette propre aux entreprises n'aurait aucun effet, les pages publiques passant par les requêtes de projets. C'est `projects` qu'il faut invalider
- **Logo non éditable ici** : `logoFilename` reste tel quel, et surtout la modification d'une entreprise ne doit pas l'écraser en `null` parce que le formulaire ne porte pas le champ. Le sub-project `13` le rend éditable, en passant un `AssetPicker` optionnel à ce composant
- **`z.url()` accepte `javascript:`** : la validation par `new URL()` ne dit rien du scheme. C'est le défaut le plus dangereux de cet écran, et le seul qui ne se voie pas à l'usage tant que personne ne saisit une URL hostile
- **Requête Prisma hors `<Suspense>`** : le build échoue, il ne dégrade pas
- **Entité légale libérée** : la relation porte `onDelete: SetNull`. Détacher une entité légale d'une entreprise la rend disponible pour une autre, ce qui est le comportement attendu
