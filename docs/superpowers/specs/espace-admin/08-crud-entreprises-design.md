---
feature: "Feature 1 — Espace admin"
subproject: "crud-entreprises"
goal: "Gérer les entreprises clientes sur un écran plein dédié, poser l'arborescence complète de la barre latérale admin et ajouter le sélecteur de colonnes au DataTable partagé"
status: "implemented"
complexity: "L"
tdd_scope: "full"
depends_on: ["06-shell-admin-design.md", "07-crud-tags-design.md"]
date: "2026-09-03"
---

# CRUD des entreprises

## Scope

Créer, modifier et supprimer des entreprises depuis l'espace admin, sur un écran plein dédié avec fil d'ariane, ouvert uniquement depuis la liste. Le rattachement à une entité légale se fait parmi les entités **existantes** : la création d'une entité légale relève des mentions légales, hors périmètre, et l'édition du logo suppose le sélecteur d'assets du sub-project `10`.

Le périmètre suit le schéma Prisma actuel de `Company` : nom, slug, secteurs, taille, site web et entité légale. Les champs que la maquette montre sans support en base (type, zone, statut de relation, premier contact, entreprise travaillée en tant que champ propre, client final, outils de relevé de temps, notes) et le panneau de détail ouvert au clic sur une ligne restent hors des specs `08` à `13` : ils relèvent de la Feature 3 « Domaine freelance » de `docs/BRAINSTORM.md`, qui les reprendra écrans de la maquette à l'appui.

S'y ajoutent, en premier dans l'epic, deux éléments transverses que les sub-projects suivants réutilisent tels quels : le sélecteur de colonnes du `DataTable` partagé, et la refonte de la barre latérale sur l'arborescence complète de la maquette, entrées sans écran désactivées.

### État livré

À la fin de ce sub-project, on peut : ouvrir « Nouvelle entreprise » depuis la liste et arriver sur un écran dédié avec fil d'ariane, créer une entreprise avec plusieurs secteurs choisis au Combobox, la modifier, constater qu'une entreprise rattachée à un projet ne peut pas être supprimée, basculer entre les vues « Toutes » et « Travaillées » depuis la barre latérale, masquer une colonne secondaire de la liste, et voir la barre latérale afficher toute l'arborescence de la maquette avec ses entrées sans écran désactivées.

## Dependencies

- `06-shell-admin-design.md` (statut: implemented) : fournit le shell admin, `AdminSidebar` et `admin-nav-items.ts`, que ce sub-project étend à toute l'arborescence de la maquette.
- `07-crud-tags-design.md` (statut: draft) : pose le pattern CRUD repris ici (Server Actions, état de formulaire, traitement des erreurs Prisma) et le `DataTable` partagé, que ce sub-project prolonge d'un sélecteur de colonnes.

## Références de design

- **Maquette** : l'écran Entreprises (`isCompanies`), son formulaire (`isCompanyForm`) et la confirmation de suppression (`dlgDeleteCompany`), pour le seul sous-ensemble porté par le schéma `Company`. La barre latérale (`navRef`) fait foi sur l'arborescence complète des 9 groupes et leurs entrées, y compris les sous-entrées de vue de l'écran Entreprises.
- **Design system** : les fiches `.prompt.md` des composants réutilisés du `07`, plus celles de `Breadcrumb` et du Combobox à sélection multiple.
- Règle de lecture et liens des deux projets : `.claude/rules/design/claude-design.md`.

## Files touched

- **À créer** : `src/lib/schemas/company.ts`
- **À créer** : `src/server/actions/companies.ts`
- **À créer** : `src/server/actions/companies.test.ts`
- **À créer** : `src/server/actions/companies.types.ts`
- **À créer** : `src/server/queries/companies.ts`
- **À modifier** : `src/app/admin/(protected)/entreprises/page.tsx` (remplacement de la page d'attente, devient la liste de la vue « Toutes »)
- **À créer** : `src/app/admin/(protected)/entreprises/travaillees/page.tsx` (liste de la vue « Travaillées »)
- **À créer** : `src/app/admin/(protected)/entreprises/nouvelle/page.tsx`
- **À créer** : `src/app/admin/(protected)/entreprises/[id]/page.tsx`
- **À créer** : `src/components/features/admin/companies/CompanyForm.tsx`
- **À créer** : `src/components/features/admin/companies/CompaniesTable.tsx`
- **À créer** : `src/components/features/admin/companies/DeleteCompanyDialog.tsx`
- **À créer** : `src/components/features/admin/MultiSelectCombobox.tsx` (Combobox à sélection multiple et badges retirables, partagé)
- **À modifier** : `src/components/features/admin/DataTable.tsx` (sélecteur de colonnes générique)
- **À modifier** : `src/components/features/admin/tags/TagsTable.tsx` (colonnes masquables de l'écran des tags, toutes visibles par défaut)
- **À modifier** : `src/components/layout/AdminSidebar.tsx` (arborescence complète, groupes désactivables, sous-entrées)
- **À modifier** : `src/components/layout/AdminNavLink.tsx` (état actif d'une entrée à sous-entrées)
- **À créer** : `src/components/layout/AdminNavSubLink.tsx` (sous-entrée cliquable, ex. « Toutes » / « Travaillées »)
- **À créer** : `src/components/layout/AdminNavDisabledItem.tsx` (entrée ou groupe sans écran, non cliquable)
- **À créer** : `src/components/layout/AdminBreadcrumb.tsx` (fil d'ariane partagé, réutilisé par le `13`)
- **À modifier** : `src/config/admin-nav-items.ts` (9 groupes de la maquette, entrées et sous-entrées)
- **À créer** : `src/components/ui/breadcrumb.tsx`, installé par le CLI shadcn s'il est absent
- **Vérifier la présence avant d'installer, n'installer que ce qui manque** : `popover`, `command`, `checkbox`, `select`, `alert-dialog`, `pagination`, posés au sub-project `07`
- **À modifier** : `docs/DESIGN.md` (§ Mapping Composants) : `Breadcrumb` rejoint Navigation, le choix des colonnes rejoint Cards et grilles, tous deux sortant du post-MVP

## Architecture approach

**Le pattern du sub-project `07` est repris tel quel** pour les Server Actions et l'état de formulaire : signature `(prevState, formData)` compatible `useActionState`, retour d'un état typé portant `ok`, `errors`, `message`, messages de validation en français dans le schéma. Ce qui suit ne décrit que ce qui diffère.

**Chaque Server Action vérifie la session elle-même.** `await getCurrentUser()` ouvre chaque mutation, hors de tout `try/catch`. Le layout protège l'affichage des pages, il ne protège pas l'exécution des actions : une Server Action exportée est un endpoint HTTP que quiconque connaît l'identifiant peut appeler sans jamais charger l'écran. C'est la défense en profondeur qu'impose `.claude/rules/nextjs/server-actions.md`. L'appel précède le `try`, sinon le `catch` avalerait l'interruption `unauthorized()` et la présenterait comme une erreur technique.

**Le formulaire vit sur son propre écran, avec fil d'ariane, exactement comme le montre la maquette.** Le `13` choisit une entreprise parmi celles qui existent déjà, il n'en crée pas à la volée : ce formulaire n'a donc qu'un seul point de montage à servir, l'écran plein de la maquette s'applique sans réserve. `CompanyForm` est un composant client unique, monté par deux routes, `entreprises/nouvelle` et `entreprises/[id]`, chacune précédée du même `AdminBreadcrumb` (« Entreprises » vers la liste, puis « Nouvelle entreprise » ou le nom de l'entreprise éditée). `AdminBreadcrumb` est un composant partagé (`src/components/layout/AdminBreadcrumb.tsx`), créé ici et réutilisé tel quel par le formulaire projet du `13` : il reçoit une liste `{ label, href? }`, rend un maillon cliquable pour chaque entrée avec `href`, un `BreadcrumbPage` pour la dernière. Le titre de l'écran et les boutons « Annuler » et « Enregistrer » vivent dans une rangée d'en-tête à même le formulaire, juste sous le fil d'ariane, comme la maquette les place à côté du titre : `AdminPageShell` ne convient pas ici, son emplacement d'actions ne pouvant pas porter l'état `pending` du bouton d'enregistrement, propre au formulaire. À l'enregistrement réussi, le formulaire redirige vers la liste par `useRouter().push`, comme le fait `saveCompany` dans la maquette.

**Le formulaire tient en une seule colonne de `Card`** (Identité, Classification, Entité légale) : les cartes Relation, Logo et Notes de la maquette portent des champs hors périmètre (secteurs d'activité mis à part) ou une fonctionnalité que ce sub-project n'implémente pas. Rien ne justifie ici la disposition à deux colonnes de la maquette, pensée pour un formulaire bien plus riche.

**Les secteurs sont une sélection multiple, au Combobox à badges retirables**, pas en `Checkbox`. C'est le composant que montre la maquette pour ce champ, et `docs/DESIGN.md` § Formulaires documente déjà le motif générique (« une sélection multiple s'affichera en badges retirables sous le champ »). `MultiSelectCombobox` est écrit ici comme composant partagé : `Popover` + `Command` sur le modèle de `IconCombobox` (`TagFormDialog`), généralisé pour prendre une liste d'options et une sélection multiple plutôt qu'une seule valeur, et pour rendre chaque choix en `Badge variant="secondary"` retirable sous le champ, avec un `input type="hidden"` par valeur choisie. Un `FormData` renvoyant plusieurs valeurs pour la clé `sectors`, la lecture côté serveur passe par `getAll` et non `get`.

**Les badges de secteurs sont en `variant="secondary"`, pas `outline meta`.** Un arbitrage du propriétaire écarte ici la convention « métadonnée » habituelle de `docs/DESIGN.md` : un secteur d'activité reste un intitulé qu'on lit normalement, sans majuscules espacées, contrairement à un statut ou un compteur.

**Toute soumission passe par `onSubmit` et `startTransition`, jamais par `<form action>`.** Le formulaire porte deux `Select` (Taille, Entité légale) en plus du Combobox de secteurs : React réinitialise un formulaire à action après chaque envoi, et Radix Select répond à ce reset en rappelant `onValueChange` avec sa valeur du premier rendu, ce qui effacerait la sélection à la première erreur de validation (`.claude/rules/shadcn-ui/components.md`).

**La suppression reste une confirmation en `AlertDialog`**, déclenchée depuis la colonne Actions de la liste : seul le formulaire de création et de modification quitte la modale, pas la confirmation de suppression.

**`Company` vit dans le schema `freelance`.** Le sub-project `03` l'y a déplacée : c'est une entité du CRM, que la vitrine ne lit qu'à travers `ClientMeta`. Rien ne change dans le code, le client Prisma exposant toujours `prisma.company`.

**La lecture des données de chaque page vit sous `<Suspense>`.** Avec `cacheComponents: true`, une requête Prisma sans `'use cache'` est un accès dynamique et fait échouer le build hors d'une frontière `<Suspense>`. Les trois pages (liste, création, modification) montent un sous-composant async, sur le modèle posé au `07`.

**La liste réutilise le `DataTable` du sub-project `07` et lui ajoute son sélecteur de colonnes**, écrit ici de façon générique pour que l'écran des projets du `12` le réutilise. Chaque colonne du `DataTable` gagne deux propriétés optionnelles, `hideable` et `defaultVisible` : un second `Popover` dans la barre d'outils, intitulé « Colonnes » et placé entre la recherche et « Filtres » comme le montre la maquette, liste les colonnes `hideable` avec une `Checkbox` chacune et un pied Réinitialiser / Appliquer identique à celui des filtres. Une colonne masquée sort aussi de la recherche, pour qu'une ligne ne remonte jamais sur un critère invisible à l'écran ; si elle portait le tri actif, le tri revient à l'ordre d'affichage. Le `Popover` ne s'affiche que si au moins une colonne est `hideable`, comme « Filtres » ne s'affiche que si des facettes sont fournies. Pour les entreprises, Secteurs, Taille et Entité légale sont `hideable` (visibles par défaut) ; Nom, Projets et Actions restent toujours affichées. La liste des entreprises n'a en revanche aucune facette : les seuls axes que la maquette propose (statut de relation, type, zone) n'ont pas de colonne en base, donc pas de `Popover` « Filtres » sur cet écran.

**Le sélecteur de colonnes s'applique aussi à l'écran des tags, déjà livré.** `TagsTable` déclare à son tour ses colonnes masquables : Nom (EN), Catégorie, Icône et Projets sont `hideable` (visibles par défaut) ; Slug, Nom (FR) et Actions restent toujours affichées. C'est la même mécanique que pour les entreprises, appliquée à un écran existant plutôt qu'introduite avec lui.

**Les vues « Toutes » et « Travaillées » filtrent la même liste, sans nouveau champ, chacune sur sa propre route.** « Travaillées » retient les entreprises dont `_count.clientMetas` est supérieur à zéro, déjà nécessaire à la colonne Projets. Comme les vues Tous / Client / Perso des projets que pose le `12`, changer de vue est une navigation, pas un état local : `/admin/entreprises` (Toutes) et `/admin/entreprises/travaillees` (Travaillées), chacune une page fine qui charge `findAllCompaniesForAdmin()` et délègue à `CompaniesTable`. Les deux routes sont statiques et se résolvent avant la route dynamique `entreprises/[id]`, Next.js préférant toujours un segment littéral à un segment dynamique de même niveau : aucune collision. La route `[id]` est en outre keyée par l'identifiant UUID de l'entreprise, jamais par son slug, donc aucun slug d'entreprise ne peut se substituer au nom d'une vue. Deux routes distinctes remontent naturellement `CompaniesTable` au changement de vue, sans recherche ni tri ni page conservés de la vue précédente : pas de `key` à poser à la main pour l'obtenir.

**La barre latérale porte toute l'arborescence de la maquette**, neuf groupes (dont celui d'Accueil, sans libellé, comme dans la maquette), chacun avec ses entrées. `/admin` (le tableau de bord) existe déjà depuis le shell admin : Accueil, Projets, Tags, Entreprises et Assets ouvrent donc un écran ; les autres entrées sont rendues par `AdminNavDisabledItem`, sans `href`, avec `aria-disabled` et un curseur par défaut, exactement le mécanisme que la maquette applique déjà à ses entrées « à venir ». Le groupe « Suivi mission » n'a pas d'entrées fixes dans la maquette : il en génère une par mission client active, une donnée que le schéma ne porte pas. Ce sub-project le représente par une entrée générique unique portant le libellé du groupe, désactivée comme le reste. Entreprises quitte le groupe Portfolio pour le groupe CRM, et porte deux sous-entrées actives, « Toutes » et « Travaillées » (`AdminNavSubLink`, pointant vers `/admin/entreprises` et `/admin/entreprises/travaillees`), plus « Recrutement » et « Prospects » en `AdminNavDisabledItem`, qui attendent le statut de relation de la Feature 3.

**La sous-entrée active se détermine avec `usePathname()` seul**, une route par vue rendant inutile toute lecture de paramètre de recherche.

**La taille est optionnelle**, `size` étant nullable. La chaîne vide du formulaire est convertie en `null`, comme l'icône des tags.

**Le rattachement à une entité légale est un select des entités existantes.** `legalEntityId` porte une contrainte d'unicité : une entité légale ne peut être rattachée qu'à une seule entreprise. Une tentative de rattachement à une entité déjà prise lève un `P2002` sur ce champ, à traduire en message de formulaire au même titre que le slug.

**La suppression est bloquée par `ClientMeta`.** La relation porte `onDelete: Restrict`, donc une entreprise référencée par un projet client ne peut pas être supprimée. La colonne Projets de la liste et le refus affiché dès l'ouverture de la confirmation reprennent le motif déjà livré pour les tags (`_count`, `DeleteTagDialog`).

**`websiteUrl` n'accepte que `http` et `https`.** `z.url()` valide par `new URL()`, qui accepte `javascript:alert(1)` : le champ se retrouverait dans un `href` de page publique, c'est-à-dire un XSS stocké. `docs/PRODUCTION.md` § Checklist Pré-MEP le signale nommément et demande de le corriger « avant le premier formulaire d'édition de l'espace admin », qui est celui-ci. Le schéma pose donc `z.url({ protocol: /^https?$/ })`.

**L'étiquette invalidée est celle des projets.** Les entreprises apparaissent sur les pages publiques à travers les projets, dont les requêtes portent l'étiquette `projects`. Une modification d'entreprise doit donc invalider `projects` par `updateTag`, et non une étiquette qui lui serait propre.

Rules applicables : `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/vitest/setup.md`.

## Acceptance criteria

### Scénario 1 : Création avec secteurs multiples
**GIVEN** l'écran de création
**WHEN** on saisit un slug et un nom, qu'on choisit deux secteurs au Combobox puis qu'on retire l'un des deux badges avant d'enregistrer
**THEN** l'entreprise est créée avec le seul secteur restant
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
**GIVEN** l'écran de création
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
**AND** un message explique qu'elle est utilisée par des projets, affiché dès l'ouverture de la confirmation

### Scénario 7 : Répercussion sur le site public
**GIVEN** une entreprise dont le nom est modifié
**WHEN** on consulte une page publique affichant un projet client de cette entreprise
**THEN** le nouveau nom y figure, l'étiquette `projects` ayant été invalidée

### Scénario 8 : Action inatteignable sans session
**GIVEN** aucune session valide
**WHEN** la Server Action est appelée directement, sans passer par l'écran
**THEN** l'accès est refusé avant toute validation et toute écriture
**AND** aucune ligne n'est créée, modifiée ni supprimée

### Scénario 9 : URL de site web restreinte à http et https
**GIVEN** l'écran de création
**WHEN** on soumet `javascript:alert(1)` comme site web
**THEN** la validation le refuse
**AND** aucune ligne n'est créée

### Scénario 10 : Build de production réussi
**GIVEN** `cacheComponents: true` et les lectures Prisma des trois pages
**WHEN** on exécute `pnpm build`
**THEN** le build aboutit
**AND** aucune erreur « Uncached data was accessed outside of `<Suspense>` » n'est levée

### Scénario 11 : Écran plein depuis la liste
**GIVEN** la liste des entreprises
**WHEN** on clique sur « Nouvelle entreprise »
**THEN** on arrive sur un écran dédié dont le fil d'ariane affiche « Entreprises > Nouvelle entreprise »
**AND** enregistrer un formulaire valide ramène à la liste, où l'entreprise créée apparaît sans rechargement manuel

### Scénario 12 : Vue « Travaillées »
**GIVEN** une entreprise rattachée à au moins un projet client et une autre qui ne l'est à aucun
**WHEN** on ouvre la vue « Travaillées » depuis la barre latérale
**THEN** seule l'entreprise rattachée apparaît
**AND** revenir à la vue « Toutes » réaffiche les deux, sans conserver la recherche ni la page de la vue précédente

### Scénario 13 : Colonnes masquables
**GIVEN** la liste des entreprises avec sa colonne Taille visible
**WHEN** on décoche « Taille » dans le `Popover` Colonnes et qu'on clique sur « Appliquer »
**THEN** la colonne disparaît de la table
**AND** elle reste masquée après un tri sur une autre colonne ou une recherche

### Scénario 14 : Entrées sans écran désactivées
**GIVEN** la barre latérale affichant les neuf groupes de la maquette
**WHEN** on regarde une entrée sans écran livré, par exemple « Leads »
**THEN** elle apparaît désactivée, sans curseur ni action au clic
**AND** seules Accueil, Projets, Tags, Entreprises et Assets, plus les sous-entrées Toutes et Travaillées d'Entreprises, restent cliquables

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

Aucun test n'est écrit sur le rendu des composants (`CompanyForm`, `MultiSelectCombobox`, le sélecteur de colonnes du `DataTable`, la barre latérale) : ces scénarios se vérifient manuellement, comme pour les tags.

## Edge cases

- **Garde par page** : chacune des trois pages appelle `await getCurrentUser()` avant tout rendu et garde le `loading.tsx` de son segment (cf. `.claude/rules/nextjs/auth.md`)
- **Distinguer les deux contraintes d'unicité** : le slug et l'entité légale lèvent tous deux un `P2002`. Sans lire `meta.target`, on afficherait « ce slug est déjà pris » alors que le problème vient de l'entité légale
- **Secteurs lus avec `get` au lieu de `getAll`** : seul le premier secteur serait enregistré, silencieusement
- **Chaînes vides converties en `null`** : `size`, `websiteUrl` et `legalEntityId` sont nullables. Un `FormData` renvoie `''` et non `undefined` : sans conversion, la base stockerait des chaînes vides, et `legalEntityId: ''` violerait la contrainte de clé étrangère
- **Étiquette de cache** : invalider une étiquette propre aux entreprises n'aurait aucun effet, les pages publiques passant par les requêtes de projets. C'est `projects` qu'il faut invalider
- **Logo non éditable ici** : `logoFilename` reste tel quel, la modification d'une entreprise ne doit pas l'écraser en `null` parce que le formulaire ne porte pas le champ. Le sub-project `10` le rend éditable
- **`z.url()` accepte `javascript:`** : la validation par `new URL()` ne dit rien du scheme, c'est le défaut le plus dangereux de cet écran
- **Requête Prisma hors `<Suspense>`** : le build échoue, il ne dégrade pas
- **Entité légale libérée** : la relation porte `onDelete: SetNull`. Détacher une entité légale d'une entreprise la rend disponible pour une autre, comportement attendu
- **Aucune collision de route** : `/admin/entreprises/travaillees` est un segment statique, résolu avant le segment dynamique `entreprises/[id]` par Next.js. La route `[id]` est en plus keyée par l'identifiant UUID de l'entreprise, jamais par son slug : aucun slug d'entreprise ne peut donc entrer en collision avec le nom d'une vue, même si la résolution de segment ne l'exigeait pas déjà
- **Colonne masquée qui portait le tri actif** : la laisser triée afficherait un `aria-sort` sur une colonne invisible ; le tri doit revenir à l'ordre d'affichage
- **Colonne masquée toujours cherchée** : sans l'exclure de `searchValue`, une ligne remonterait sur un critère que rien à l'écran n'explique
- **Groupe « Suivi mission » sans donnée** : la maquette génère une entrée par mission cliente active, une donnée hors du schéma actuel. Une entrée par mission fictive laisserait croire à un écran qui n'existe pas ; l'entrée générique unique documente l'emplacement, pas une mission réelle
