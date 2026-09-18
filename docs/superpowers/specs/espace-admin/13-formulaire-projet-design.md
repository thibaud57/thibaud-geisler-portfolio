---
feature: "Feature 1 — Espace admin"
subproject: "formulaire-projet"
goal: "Créer et modifier un projet complet depuis un formulaire pleine page"
status: "draft"
complexity: "L"
tdd_scope: "none"
depends_on: ["08-crud-entreprises-design.md", "10-gestion-assets-admin-design.md", "11-crud-projets-actions-design.md", "12-ecran-liste-projets-design.md"]
date: "2026-09-03"
---

# Formulaire de projet

## Scope

Les pages `/admin/projets/nouveau` et `/admin/projets/[id]` : un formulaire pleine page couvrant tous les champs d'un projet portés par le schéma Prisma, la sélection des tags, le choix d'une entreprise parmi les entreprises existantes, le choix de la couverture parmi les assets, et la saisie du markdown bilingue des case studies.

C'est le dernier sub-project de la fondation, celui qui fait converger les entreprises, les assets, les tags et les Server Actions des projets.

Exclut la prévisualisation rendue du markdown : les case studies s'écrivent en markdown et se relisent sur le site public. Exclut aussi la création d'une entreprise : le champ Entreprise choisit parmi les entreprises existantes, leur formulaire vivant sur son propre écran plein, au sub-project `08`. Exclut enfin l'édition du logo d'entreprise, portée par les sub-projects `08` et `10` sur l'écran des entreprises, pas ici.

Deux champs que la maquette montre sur ce formulaire n'ont pas de colonne Prisma et restent hors périmètre : l'étape de développement et la date de mise en production (`docs/BRAINSTORM.md` § Feature 6, « Suivi du cycle de développement »). Les liens GitHub et démo, eux, existent en base sur `Project` : ils restent des champs ordinaires, sans le conditionnement au type que leur applique la maquette, cette règle n'étant portée par aucun schéma Zod du sub-project `11`.

### État livré

À la fin de ce sub-project, on peut : créer un projet client de bout en bout depuis le formulaire, en lui choisissant une entreprise existante, lui choisir une couverture parmi les assets, le passer en publié, et le voir apparaître sur `/projets`.

## Dependencies

- `08-crud-entreprises-design.md` (statut: draft) : fournit la liste des entreprises existantes, consommée par le champ Entreprise, l'écran plein où elles se créent, et `AdminBreadcrumb`, qu'il crée pour son propre fil d'ariane et que ce formulaire réutilise à l'identique.
- `10-gestion-assets-admin-design.md` (statut: draft) : fournit `AssetPicker` pour le choix de la couverture.
- `11-crud-projets-actions-design.md` (statut: draft) : fournit `createProject`, `updateProject` et les types `AdminProjectDetail` / `AdminProjectListItem`, consommés directement par ce formulaire.
- `12-ecran-liste-projets-design.md` (statut: draft) : fournit les deux pages d'attente `/admin/projets/nouveau` et `/admin/projets/[id]` que ce sub-project remplace, la liste depuis laquelle on arrive, et `src/lib/projects.ts` (`PROJECT_TYPE_LABELS`, `PROJECT_STATUS_LABELS`, `PROJECT_FORMAT_LABELS`, `CONTRACT_STATUS_LABELS`), que ce formulaire réutilise pour ses libellés d'énumération plutôt que de les redéfinir, et complète de `WORK_MODE_LABELS`.

## Références de design

- **Maquette** : l'écran Formulaire projet (`isForm`), son fil d'ariane (`formCrumbs`), sa grille à deux colonnes de `Card`, le Combobox de tags et sa liste réordonnable, les sélecteurs de dates de début et de fin, le champ d'entreprise, l'ouverture du sélecteur d'assets (`openAssetPicker`) et l'avertissement au changement de type (`dlgTypeWarning`).
- **Le formulaire est un écran plein dans la maquette**, pas une modale : cohérent avec les deux routes `/admin/projets/nouveau` et `/admin/projets/[id]` que cette spec remplace. Le formulaire d'entreprise, monté au sub-project `08`, est lui aussi un écran plein indépendant : ce sub-project ne le monte jamais depuis ici.
- **Design system** : les fiches `.prompt.md` du Combobox, des sélecteurs de date, du `Switch` et du `Breadcrumb`.
- Règle de lecture et liens des deux projets : `.claude/rules/design/claude-design.md`.

## Files touched

- **À modifier** : `src/app/admin/(protected)/projets/nouveau/page.tsx` (remplacement de la page d'attente)
- **À modifier** : `src/app/admin/(protected)/projets/[id]/page.tsx` (remplacement de la page d'attente)
- **À créer** : `src/components/features/admin/projects/ProjectForm.tsx`
- **À créer** : `src/components/features/admin/projects/ProjectTagsField.tsx`
- **À créer** : `src/components/features/admin/projects/ClientMetaFields.tsx`
- **À modifier** : `src/lib/projects.ts` (ajout de `WORK_MODE_LABELS`, les autres libellés du `12` sont réutilisés tels quels)
- **À créer** : `src/components/layout/AdminBreadcrumb.tsx`, **sauf s'il existe déjà** : le sub-project `08` en a besoin en premier pour son propre écran plein d'entreprise, vérifier avant d'en écrire un second
- **À installer** : `src/components/ui/breadcrumb.tsx` par le CLI shadcn, **s'il n'est pas déjà posé par le `08`** ; `src/components/ui/switch.tsx` et `src/components/ui/calendar.tsx`, tous deux encore absents à ce stade. `dialog`, `select`, `alert-dialog`, `pagination`, `checkbox`, `popover` et `command` sont posés par le sub-project `07`, dont celui-ci dépend transitivement : vérifier leur présence et ne rien réinstaller
- **À modifier** : `docs/DESIGN.md` (§ Mapping Composants) : `Switch` et `Popover + Calendar` rejoignent Formulaires, `Breadcrumb` rejoint Navigation s'il n'a pas déjà quitté le post-MVP au `08`

## Architecture approach

**Formulaire pleine page, pas modale.** Repris du pattern retenu pendant la décomposition pour les entités riches : une quinzaine de champs, deux zones de markdown et plusieurs sélecteurs ne tiennent pas dans une modale utilisable au téléphone.

**Un seul composant pour la création et la modification.** Les deux pages montent le même formulaire, qui reçoit un projet ou `null`. L'action liée diffère, `createProject` ou `updateProject` avec l'identifiant, mais la structure des champs est identique et la dupliquer garantirait qu'elle diverge.

**Le titre et les boutons « Annuler » et « Enregistrer » vivent dans une rangée d'en-tête à même le formulaire, juste sous le fil d'ariane**, exactement comme la maquette les place à côté du titre. Ce composant reprend le motif posé par `CompanyForm` au sub-project `08` : `AdminPageShell` ne convient pas à un formulaire pleine page, son emplacement d'actions ne pouvant pas porter l'état `pending` du bouton d'enregistrement, propre au formulaire qu'il faudrait alors faire remonter jusqu'à la page. Les deux pages ne rendent donc que `AdminBreadcrumb` puis `ProjectForm`, sans `h1` séparé.

**Deux colonnes de `Card`, comme la maquette.** La grille se replie sur une seule colonne en mobile, dans l'ordre du DOM (contenu entier, puis latérale entière) ; au-delà, la colonne de contenu occupe la plus grande part, la colonne latérale reste `sticky` pendant le défilement. Chaque `Card` regroupe les champs par nature, pas par section technique :

Colonne de contenu, dans l'ordre :
- **Identité** : slug, ordre d'affichage, titre (français), titre (anglais), puis en pleine largeur le type de projet (`formats`, six `Checkbox`)
- **Description** : description (français), description (anglais)
- **Tags** : le champ d'ajout et la liste retenue, détaillés plus bas
- **Case study** : contenu (français), contenu (anglais), en `Textarea` `font-mono` redimensionnable

Colonne latérale, dans l'ordre :
- **Publication** : statut, type (`Switch`), dates de début et de fin
- **Avancement** : lien GitHub, lien démo
- **Couverture** : vignette et bouton d'ouverture du sélecteur d'assets
- **Méta client** : entreprise, mode de travail, statut de contrat, taille d'équipe, nombre de livrables (toujours montée, détaillée plus bas)

**Le champ « Type de projet » porte `formats`, pas `type`.** La grille de six cases coche des `ProjectFormat` (Web App, App Mobile, Desktop App, API, CLI, IA). `type` (`ProjectType`, client ou personnel) est un champ séparé, le `Switch` de la card Publication : les deux se nomment « type » dans la maquette, jamais dans ce formulaire.

**Les libellés viennent de `prisma/schema.prisma`, pas de la maquette, et de `src/lib/projects.ts` posé par le `12`.** `PROJECT_TYPE_LABELS`, `PROJECT_STATUS_LABELS`, `PROJECT_FORMAT_LABELS` et `CONTRACT_STATUS_LABELS` y sont déjà écrits pour l'écran de liste : ce formulaire les importe plutôt que de les redéfinir, et complète le fichier de `WORK_MODE_LABELS`, absent du `12` faute de colonne « Mode de travail » sur cet écran-là. Deux écarts assumés, sans changement de schéma : « CLI » et « IA » restent tels quels là où la maquette montre « Automatisation » et « Data / IA », et le statut de contrat garde « Stage » là où elle montre « CDD », l'enum `ContractStatus` n'ayant pas cette valeur.

| Champ | Valeurs Prisma → libellé |
|---|---|
| `formats` (`ProjectFormat`) | `API` → API, `WEB_APP` → Web App, `MOBILE_APP` → App Mobile, `DESKTOP_APP` → Desktop App, `CLI` → CLI, `IA` → IA |
| `status` (`ProjectStatus`) | `DRAFT` → Brouillon, `PUBLISHED` → Publié, `ARCHIVED` → Archivé |
| `type` (`ProjectType`) | `CLIENT` → Projet client, `PERSONAL` → Projet perso |
| `workMode` (`WorkMode`) | `REMOTE` → Remote, `HYBRIDE` → Hybride, `PRESENTIEL` → Sur site |
| `contractStatus` (`ContractStatus`) | `FREELANCE` → Freelance, `CDI` → CDI, `STAGE` → Stage, `ALTERNANCE` → Alternance |

**La carte Méta client reste montée en permanence.** Ses champs passent `disabled` quand le type vaut `PERSONAL`, elle ne se démonte ni ne se masque jamais. Un contrôle `disabled` n'entre pas dans le `FormData` soumis : pour un projet personnel, l'absence de ces champs à la soumission est exactement ce qu'attend le schéma conditionnel du sub-project `11`, sans logique supplémentaire côté formulaire.

**La bascule vers personnel avertit par une `AlertDialog`, sans texte persistant.** Passer un projet client en personnel supprime sa méta à l'enregistrement, et le sub-project `11` l'assume côté action. Le `Switch` de type ne bascule pas directement l'état quand il quitte `CLIENT` sur un projet existant : il ouvre une `AlertDialog` qui nomme ce qui sera perdu, et seule sa confirmation fait passer le type sur `PERSONAL` et désactive la carte. Annuler laisse le type inchangé. Aucun `<p className="text-sm text-destructive">` persistant sous le champ : la maquette ne porte que la modale, et un texte permanent doublonnerait le même message.

**Les tags s'ajoutent par un Combobox groupé, se réordonnent par glisser-déposer.** Le champ d'ajout est un Combobox (`Popover` + `Command`) dont les options sont groupées par `TagKind`, dans le même registre que le sélecteur d'icône des tags du sub-project `07` : la coche se pilote par l'attribut `data-checked` sur `CommandItem`, contournement déjà validé et documenté (`docs/DESIGN.md` § Champ de recherche). Un tag choisi rejoint la liste des tags retenus et disparaît du Combobox. Cette liste est rendue séparément, chaque ligne portant son rang, un bouton de retrait, et un geste de glisser-déposer pour la réordonner : la position dans le tableau, pas une position saisie, détermine l'ordre. `ProjectTag.displayOrder` vaut `index + 1` au moment de la soumission, porté par un `<input type="hidden" name="tagIds" />` par tag, dans l'ordre de la liste. Le retrait recalcule aussitôt les rangs affichés.

**L'entreprise se choisit parmi les entreprises existantes, sans bouton de création.** Le champ Entreprise est un Combobox de recherche sur les entreprises déjà créées (`docs/DESIGN.md` § Champ de recherche : au-delà d'une dizaine d'options, la recherche vaut mieux que la liste déroulante). Aucun bouton n'ouvre de formulaire de création depuis cet écran : une entreprise manquante se crée depuis son propre écran, au sub-project `08`, puis redevient disponible ici au rechargement.

**Trois `Select` restent soumis par `onSubmit` et `startTransition`, jamais par `<form action>`.** Statut, mode de travail et statut de contrat sont chacun un `Select` : React réinitialise un formulaire à `action` après chaque envoi, et Radix Select répond à ce reset en rappelant `onValueChange` avec sa valeur du premier rendu, ce qui effacerait ces trois choix à la première erreur de validation. Le formulaire soumet donc par `startTransition(() => formAction(new FormData(event.currentTarget)))` après `event.preventDefault()`, comme `TagFormDialog` (`.claude/rules/shadcn-ui/components.md`).

**La couverture rejoint le `FormData` par un champ caché.** `AssetPicker` est contrôlé, sa valeur n'atteint pas l'action toute seule : `<input type="hidden" name="coverFilename" value={selected ?? ''} />` à côté de lui, comme les tags le font avec `tagIds`. Le sélecteur est restreint au dossier `projets/` des assets (sub-project `10`).

**L'ordre d'affichage se pré-remplit à n+1, sans logique d'insertion ici.** Le champ « Ordre d'affichage » de la card Identité s'initialise à `projects.length + 1` en création, à la valeur du projet en modification. Décaler les projets suivants à une position occupée, renuméroter à la suppression : c'est la règle complète que porte le sub-project `11`, qui l'applique à `Project.displayOrder` comme le `07` le fait pour les tags. Ce formulaire ne fait que proposer la valeur suivante.

**`deliverablesCount` porte `defaultValue={1}`.** Validé par `min(1)` au sub-project `11`, un champ numérique vidé produit `Number('')`, soit `0`, refusé avec un message qui n'oriente pas vers la cause.

**Le markdown reste du texte.** Deux zones de saisie, une par langue, sans éditeur enrichi ni prévisualisation. Le rendu existe déjà sur le site public, et un éditeur riche pour un contenu écrit deux ou trois fois par an ne se justifie pas.

**Le fil d'ariane vit dans la page, déclaré par elle.** Chaque page déclare son chemin plutôt qu'un composant ne le dérive du `pathname` : deux routes ne justifient pas une logique de dérivation, qui supposerait en plus de résoudre un identifiant en titre de projet.

**Aucun test.** Les Server Actions sont couvertes par le sub-project `11`, et le reste est de l'assemblage de composants que la règle no-lib-test exclut.

Rules applicables : `.claude/rules/shadcn-ui/components.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/react/hooks.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/tailwind/conventions.md`.

## Acceptance criteria

### Scénario 1 : Création d'un projet personnel
**GIVEN** le formulaire de création
**WHEN** on renseigne les champs requis avec le type personnel et qu'on enregistre
**THEN** le projet est créé
**AND** on est redirigé vers la liste, où il figure

### Scénario 2 : Champs de méta client actifs selon le type
**GIVEN** le formulaire avec le type personnel sélectionné, la card Méta client visible et désactivée
**WHEN** on bascule le type sur client
**THEN** les champs d'entreprise, de mode de travail, de statut de contrat, de taille d'équipe et de nombre de livrables deviennent actifs
**AND** la card reste affichée dans les deux cas

### Scénario 3 : Avertissement de perte à la bascule vers personnel
**GIVEN** un projet client existant en cours de modification
**WHEN** on bascule son type sur personnel
**THEN** une `AlertDialog` signale que la méta client sera supprimée
**AND** l'enregistrement n'a lieu qu'après confirmation
**AND** annuler dans la boîte laisse le type inchangé

### Scénario 4 : Sélection d'une entreprise existante
**GIVEN** le formulaire d'un projet client
**WHEN** on cherche puis choisit une entreprise dans le champ Entreprise
**THEN** son identifiant est retenu
**AND** aucun formulaire de création ne s'ouvre depuis cet écran

### Scénario 5 : Erreurs de validation
**GIVEN** un projet client sans entreprise
**WHEN** on enregistre
**THEN** l'erreur apparaît sous le champ d'entreprise
**AND** toutes les autres valeurs saisies sont conservées

### Scénario 6 : Choix de la couverture
**GIVEN** le formulaire
**WHEN** on ouvre le sélecteur de couverture
**THEN** les assets du dossier `projets/` sont proposés en vignettes
**AND** la sélection renseigne le champ correspondant

### Scénario 7 : Ajout, réordonnancement et retrait des tags
**GIVEN** le formulaire
**WHEN** on ajoute trois tags par le Combobox, qu'on en glisse un à une autre position, puis qu'on en retire un
**THEN** la liste des tags retenus reflète ces trois opérations
**AND** l'ordre visible au moment de l'enregistrement devient `ProjectTag.displayOrder`

### Scénario 8 : Modification préservant les champs non touchés
**GIVEN** un projet complet
**WHEN** on modifie uniquement son titre français et qu'on enregistre
**THEN** tous les autres champs sont inchangés, couverture et markdown compris

### Scénario 9 : Fil d'ariane
**GIVEN** la page d'édition d'un projet
**WHEN** on la consulte
**THEN** le fil indique le chemin depuis l'espace admin jusqu'au projet
**AND** ses maillons intermédiaires sont cliquables

### Scénario 10 : Publication visible
**GIVEN** un projet en brouillon
**WHEN** on le passe en publié et qu'on enregistre
**THEN** il apparaît sur `/projets` du site public

### Scénario 11 : Nombre de livrables par défaut
**GIVEN** le bloc Méta client d'un nouveau projet client
**WHEN** on ne touche pas au champ du nombre de livrables
**THEN** il vaut 1 et l'enregistrement aboutit
**AND** vider le champ produit un message de validation compréhensible, non une erreur technique

## Edge cases

- **Garde par page** : les pages appellent `await getCurrentUser()` avant tout rendu et gardent le `loading.tsx` de leur segment, posés au sub-project `12` (cf. `.claude/rules/nextjs/auth.md`)
- **Repeuplement après erreur** : un formulaire de cette taille rejeté sans conserver les valeurs saisies serait pénible au point d'être inutilisable. L'état retourné par les Server Actions porte `values` précisément pour ça
- **Bascule de type sans avertissement** : la suppression de la méta client est irréversible et silencieuse côté base ; c'est ce que l'`AlertDialog` empêche
- **Champs `disabled` absents du `FormData`** : un contrôle désactivé n'est jamais soumis par le navigateur. C'est voulu pour la carte Méta client d'un projet personnel, à ne pas reproduire par erreur ailleurs dans le formulaire
- **Markdown long** : les case studies peuvent faire plusieurs milliers de caractères. Les zones de saisie doivent rester redimensionnables et le formulaire navigable
- **Sélecteur de couverture et préfixe** : proposer tous les assets, y compris les CV, rendrait le choix confus. Le sélecteur reste restreint au dossier `projets/`
- **Identifiant inexistant** : `/admin/projets/<id-inconnu>` doit produire une 404 propre, pas une erreur de rendu
- **`deliverablesCount` vidé** : `Number('')` vaut `0`, que le `min(1)` refuse. Sans `defaultValue={1}`, le message d'erreur n'oriente pas vers la cause
- **Étape de développement et date de mise en production absentes** : aucune colonne Prisma ne les porte. `docs/BRAINSTORM.md` § Feature 6 les garde pour plus tard, ce formulaire ne les affiche pas
- **GitHub et démo non conditionnés au type** : la maquette les réserve à un projet personnel, mais `githubUrl` et `demoUrl` sont des champs ordinaires de `Project`, sans distinction de type portée par le sub-project `11`. Les masquer pour un projet client cacherait un champ que rien n'empêche de renseigner
