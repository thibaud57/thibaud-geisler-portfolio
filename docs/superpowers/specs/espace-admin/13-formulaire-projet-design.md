---
feature: "Feature 1 — Espace admin"
subproject: "formulaire-projet"
goal: "Créer et modifier un projet complet depuis un formulaire pleine page"
status: "draft"
complexity: "L"
tdd_scope: "none"
depends_on: ["08-crud-entreprises-design.md", "10-gestion-assets-admin-design.md", "12-ecran-liste-projets-design.md"]
date: "2026-09-03"
---

# Formulaire de projet

## Scope

Les pages `/admin/projets/nouveau` et `/admin/projets/[id]` : un formulaire pleine page couvrant tous les champs d'un projet, la sélection des tags, le choix de l'entreprise avec création possible sans quitter la page, le choix de la couverture parmi les assets, et la saisie du markdown bilingue des case studies. S'y ajoute l'édition du logo d'entreprise, dernier champ de l'epic à n'être encore modifiable nulle part.

C'est le dernier sub-project de la fondation, et celui qui fait converger tout ce qui précède. Il porte aussi le fil d'ariane, reporté du sub-project `06` faute de hiérarchie à représenter à l'époque.

Exclut la prévisualisation rendue du markdown : les case studies s'écrivent en markdown et se relisent sur le site public.

### État livré

À la fin de ce sub-project, on peut : créer un projet client de bout en bout depuis le formulaire, y compris son entreprise si elle n'existait pas, lui choisir une couverture parmi les assets, le passer en publié, et le voir apparaître sur `/projets`.

## Dependencies

- `08-crud-entreprises-design.md` (statut: draft) : fournit `CompanyFormDialog`, monté ici depuis le select d'entreprise.
- `10-gestion-assets-admin-design.md` (statut: draft) : fournit `AssetPicker` pour le choix de la couverture.
- `12-ecran-liste-projets-design.md` (statut: draft) : fournit les deux pages d'attente `/admin/projets/nouveau` et `/admin/projets/[id]` que ce sub-project remplace, et la liste depuis laquelle on arrive.

## Files touched

- **À modifier** : `src/app/admin/(protected)/projets/nouveau/page.tsx` (remplacement de la page d'attente)
- **À modifier** : `src/app/admin/(protected)/projets/[id]/page.tsx` (remplacement de la page d'attente)
- **À modifier** : `src/components/features/admin/companies/CompanyFormDialog.tsx` (prop `assetPicker` optionnelle, pour rendre `logoFilename` éditable)
- **À modifier** : `src/app/admin/(protected)/entreprises/page.tsx` (passe l'`AssetPicker` au dialogue, sur le bucket admin)
- **À créer** : `src/components/features/admin/projects/ProjectForm.tsx`
- **À créer** : `src/components/features/admin/projects/ProjectTagsField.tsx`
- **À créer** : `src/components/features/admin/projects/ClientMetaFields.tsx`
- **À créer** : `src/components/layout/AdminBreadcrumb.tsx`
- **À installer** : `src/components/ui/breadcrumb.tsx` par le CLI shadcn, seul composant encore absent à ce stade. `dialog`, `select`, `alert-dialog`, `pagination` et `checkbox` sont posés par le sub-project `07`, dont celui-ci dépend transitivement : vérifier leur présence et ne rien réinstaller

## Architecture approach

**Formulaire pleine page, pas modale.** C'est le pattern retenu pendant la décomposition pour les entités riches : une quinzaine de champs, deux zones de markdown et trois sélecteurs ne tiennent pas dans une modale utilisable au téléphone. Les entités légères, tags et entreprises, gardent leur modale.

**Un seul composant pour la création et la modification.** Les deux pages montent le même formulaire, qui reçoit un projet ou `null`. L'action liée diffère, `createProject` ou `updateProject` avec l'identifiant, mais la structure des champs est identique et la dupliquer garantirait qu'elles divergent.

**Le bloc de méta client apparaît selon le type.** Entreprise, mode de travail, statut de contrat, taille d'équipe et nombre de livrables ne s'affichent que pour un projet `CLIENT`. C'est la traduction visuelle de la règle portée par le schéma Zod du sub-project `11`.

**La bascule vers personnel avertit avant de perdre des données.** Passer un projet de `CLIENT` à `PERSONAL` supprime sa méta client, et le sub-project `11` l'assume côté action. L'interface doit le dire au moment du choix, pas le laisser découvrir après enregistrement.

**Un seul composant à installer, `breadcrumb`.** Tout le reste est en place : `dialog`, `select`, `alert-dialog`, `pagination` et `checkbox` viennent du sub-project `07`, dont celui-ci dépend par la chaîne `13 → 12 → 11 → 07` comme par `13 → 08 → 07`. Vérifier avant d'installer, une réinstallation écrasant les composants existants.

`alert-dialog` sert au scénario 3, l'enregistrement d'une bascule destructrice n'ayant lieu qu'après confirmation ; l'avertissement lui-même est un `<p className="text-sm text-destructive">`, comme les erreurs de champ, `Alert` restant non installé.

Les cases à cocher des formats et des tags sont le composant **`Checkbox` du registry**, pas des cases natives : `docs/DESIGN.md` § Formulaires admin le prescrit pour tout l'espace admin.

Les deux pages chargent leurs données sous `<Suspense>`, `cacheComponents: true` refusant une lecture dynamique hors frontière de suspension.

**Le logo d'entreprise devient éditable ici.** Aucun sub-project ne le rendait modifiable : le `08` l'excluait faute d'`AssetPicker`, le `10` écrivait l'`AssetPicker` « pour le `13` », et le `13` ne branchait que la couverture de projet. À la fin de l'epic, `Company.logoFilename` serait resté non éditable. `CompanyFormDialog` reçoit donc une prop `assetPicker` optionnelle, et les deux points de montage la fournissent : l'écran des entreprises et le select d'entreprise de ce formulaire. L'`AssetPicker` y parcourt `freelance/crm/entreprises/` sur le bucket **admin**, contrairement à celui de la couverture qui parcourt `projets/` sur le bucket de la vitrine.

**`deliverablesCount` porte `defaultValue={1}`.** Le champ est validé par `min(1)` au sub-project `11`, et un champ numérique vidé produit `Number('')`, soit `0`, refusé avec un message qui n'oriente pas vers la cause.

**Les tags se cochent, ils ne se cherchent pas.** Des cases à cocher groupées par catégorie plutôt qu'un champ de recherche : le composant `Command` de shadcn rend `CommandItem` toujours en état sélectionné dans le style `radix-nova`, la faute à un sélecteur Tailwind mal formé (`data-selected:` au lieu de `data-[selected=true]:`). C'est l'issue shadcn-ui#9228, ouverte, avec une PR de correction #9254 en attente. Le regroupement par `TagKind` rend de toute façon la liste navigable sans recherche, donc ce choix tient même une fois l'issue close.

**L'ordre des tags suit l'ordre de sélection.** `ProjectTag.displayOrder` détermine leur affichage sur le site public. Plutôt qu'une interface de réordonnancement, la liste des tags retenus s'affiche dans l'ordre où ils ont été cochés, et se réorganise en décochant puis recochant. Une poignée de tags par projet rend ce geste acceptable, là où un système de glisser-déposer serait disproportionné.

**L'entreprise se crée sans quitter la page.** Le select est accompagné d'un bouton qui ouvre `CompanyFormDialog`, écrit au sub-project `08` précisément pour ce double montage. Son rappel de succès sélectionne l'entreprise créée. Sans ce mécanisme, créer un projet pour un nouveau client imposerait d'abandonner la saisie en cours.

**Le markdown reste du texte.** Deux zones de saisie, une par langue, sans éditeur enrichi ni prévisualisation. Le rendu existe déjà sur le site public, et un éditeur riche pour du contenu écrit deux ou trois fois par an ne se justifie pas.

**Le fil d'ariane arrive maintenant, il est déclaré, et il vit dans la page.** Il prend son sens ici, où `/admin/projets/[id]` crée la première hiérarchie réelle. Chaque page déclare son chemin plutôt qu'un composant ne le dérive du `pathname` : deux routes ne justifient pas une logique de dérivation, qui supposerait en plus de résoudre un identifiant en titre de projet. Il est rendu en tête du contenu et non dans le header, parce que le header est monté par le layout : lui faire porter le fil imposerait un contexte ou un slot pour qu'une page lui transmette ses maillons, alors que la page a déjà chargé le projet dont elle affiche le titre.

**Aucun test.** Les Server Actions sont couvertes par le sub-project `11`, et le reste est de l'assemblage de composants que la règle no-lib-test exclut.

Rules applicables : `.claude/rules/shadcn-ui/components.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/react/hooks.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/tailwind/conventions.md`.

## Acceptance criteria

### Scénario 1 : Création d'un projet personnel
**GIVEN** le formulaire de création
**WHEN** on renseigne les champs requis avec le type personnel et qu'on enregistre
**THEN** le projet est créé
**AND** on est redirigé vers la liste, où il figure

### Scénario 2 : Bloc client conditionnel
**GIVEN** le formulaire avec le type personnel sélectionné
**WHEN** on bascule le type sur client
**THEN** les champs d'entreprise, de mode de travail, de statut de contrat, de taille d'équipe et de nombre de livrables apparaissent

### Scénario 3 : Avertissement de perte
**GIVEN** un projet client existant en cours de modification
**WHEN** on bascule son type sur personnel
**THEN** un avertissement signale que la méta client sera supprimée
**AND** l'enregistrement n'a lieu qu'après confirmation

### Scénario 4 : Création d'entreprise sans quitter la page
**GIVEN** le formulaire d'un projet client, partiellement rempli
**WHEN** on crée une entreprise depuis le select
**THEN** elle est créée et sélectionnée
**AND** les champs déjà saisis du projet sont intacts

### Scénario 5 : Erreurs de validation
**GIVEN** un projet client sans entreprise
**WHEN** on enregistre
**THEN** l'erreur apparaît sous le champ d'entreprise
**AND** toutes les autres valeurs saisies sont conservées

### Scénario 6 : Choix de la couverture
**GIVEN** le formulaire
**WHEN** on ouvre le sélecteur de couverture
**THEN** les assets disponibles sont proposés en vignettes
**AND** la sélection renseigne le champ correspondant

### Scénario 7 : Ordre des tags
**GIVEN** trois tags cochés dans un ordre donné
**WHEN** on enregistre puis qu'on rouvre le projet
**THEN** les tags apparaissent dans le même ordre

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

### Scénario 11 : Logo d'entreprise éditable
**GIVEN** le formulaire d'une entreprise, ouvert depuis son écran ou depuis le select de ce formulaire
**WHEN** on choisit un logo par le sélecteur d'assets
**THEN** `logoFilename` est enregistré
**AND** le sélecteur ne propose que les fichiers de `freelance/crm/entreprises/`, sur le bucket admin
**AND** l'espace admin affiche ce logo, le site public continuant de n'afficher que le nom

### Scénario 12 : Nombre de livrables par défaut
**GIVEN** le bloc client d'un nouveau projet
**WHEN** on ne touche pas au champ du nombre de livrables
**THEN** il vaut 1 et l'enregistrement aboutit
**AND** vider le champ produit un message de validation compréhensible, non une erreur technique

## Edge cases

- **Perte de saisie à la création d'entreprise** : c'est le scénario que le double montage de `CompanyFormDialog` sert à éviter. Si l'ouverture de la modale démontait le formulaire ou provoquait une navigation, tout le travail en cours serait perdu
- **Repeuplement après erreur** : un formulaire de cette taille rejeté sans conserver les valeurs saisies serait pénible au point d'être inutilisable. L'état retourné par les Server Actions porte `values` précisément pour ça
- **Bascule de type sans avertissement** : la suppression de la méta client est irréversible et silencieuse côté base
- **Composant `Command` en `radix-nova`** : son état sélectionné est incorrect, issue shadcn-ui#9228. C'est ce qui écarte un champ de recherche pour les tags
- **Markdown long** : les case studies peuvent faire plusieurs milliers de caractères. Les zones de saisie doivent être redimensionnables et le formulaire rester navigable
- **Sélecteur de couverture et préfixe** : proposer tous les assets, y compris les CV, rendrait le choix confus. Le sélecteur doit être restreint aux dossiers de projets
- **Identifiant inexistant** : `/admin/projets/<id-inconnu>` doit produire une 404 propre, pas une erreur de rendu
- **Deux `AssetPicker`, deux buckets** : celui de la couverture parcourt `projets/` sur `portfolio-assets`, celui du logo `freelance/crm/entreprises/` sur `portfolio-admin`. Confondre les deux ferait pointer un logo vers un bucket qui ne le contient pas, sans erreur immédiate
- **Logo jamais éditable** : c'est le trou que ce sub-project ferme. Le `08` renvoyait au `10`, le `10` au `13`, et le `13` ne branchait que la couverture. Sans cette correction, `Company.logoFilename` resterait modifiable uniquement par le seed
- **`deliverablesCount` vidé** : `Number('')` vaut `0`, que le `min(1)` refuse. Sans `defaultValue={1}`, le message d'erreur n'oriente pas vers la cause
