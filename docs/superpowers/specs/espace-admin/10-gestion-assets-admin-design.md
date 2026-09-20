---
feature: "Feature 1 — Espace admin"
subproject: "gestion-assets-admin"
goal: "Uploader, lister et supprimer les assets depuis l'espace admin, et fournir le sélecteur qui les rattache aux projets et aux entreprises"
status: "draft"
complexity: "L"
tdd_scope: "full"
depends_on: ["06-shell-admin-design.md", "08-crud-entreprises-design.md", "09-stockage-assets-r2-design.md"]
date: "2026-09-03"
---

# Gestion des assets depuis l'espace admin

## Scope

Écran de gestion des assets : dépôt de fichiers, grille de tuiles filtrable par dossier, suppression, et un composant de sélection réutilisable qui alimentera `Project.coverFilename` et `Company.logoFilename`. L'écran couvre les **deux** buckets, la vitrine et le back-office, ce qui suppose une route authentifiée pour lire le second.

C'est le sub-project qui donne son sens à la bascule R2 du `09` : jusqu'ici les assets ne pouvaient être déposés qu'en copiant des fichiers à la main. Exclut le redimensionnement et la génération de miniatures, `next/image` restant seul responsable de l'optimisation à l'affichage.

Le sélecteur d'assets ajoute aussi la carte « Logo » au formulaire entreprise, que le `08` livre sans elle : ce sub-project ouvre le sélecteur sur `freelance/crm/entreprises/`, sur `portfolio-admin`. Exclut la récupération automatique du logo depuis le domaine de l'entreprise, un sub-project distinct, immédiatement après celui-ci.

### État livré

À la fin de ce sub-project, on peut : déposer une image depuis l'écran d'administration, la voir immédiatement servie par `/api/assets/...`, la sélectionner comme couverture d'un projet ou comme logo d'une entreprise, et constater qu'elle ne peut plus être supprimée tant que ce rattachement existe.

## Dependencies

- `06-shell-admin-design.md` (statut: draft) : fournit le shell et la page d'attente `/admin/assets` que ce sub-project remplace.
- `08-crud-entreprises-design.md` (statut: draft) : pose le formulaire entreprise et sa Server Action de mutation, tous deux sans le logo : ce sub-project leur ajoute la carte Logo, `AssetPicker` et l'écriture de `logoFilename`.
- `09-stockage-assets-r2-design.md` (statut: draft) : fournit le client R2 et le bucket dans lequel écrire.

## Références de design

- **Maquette** : l'écran Assets (`isAssets`), une grille de tuiles avec recherche, facettes et pied de liste, son téléversement (`openUpload`) et sa confirmation de suppression (`dlgDeleteAsset`). Trois écarts assumés : la grille suit des paliers fixes (une colonne par défaut, deux dès `sm`, trois dès `md`, quatre dès `lg`, cinq dès `xl`, tuiles d'environ 200px) plutôt que le `repeat(auto-fill,minmax(200px,1fr))` fluide de la maquette ; le dossier proposé au dépôt et à la facette vient de `ASSET_FOLDERS` (plan) et de l'ADR-011, la maquette listant une arborescence antérieure à la migration du `09` ; l'état d'écrasement de `dlgUpload`, absent de la maquette, se conçoit d'après l'arbitrage transverse (avertissement en `text-sm text-destructive`, sans `Alert`). Le sélecteur d'assets se lit dans le `13` pour la couverture de projet (la maquette l'ouvre depuis le formulaire projet, `openAssetPicker` dans l'écran `isForm`) ; ce sub-project le câble une première fois, pour la carte Logo du formulaire entreprise. La maquette ne montre aucun sélecteur à cet endroit : `openLogoPicker` y déclenche un fetch automatique, hors périmètre ici (cf. Scope).
- **Design system** : les fiches `.prompt.md` de `Dialog` et `Select` (dépôt), `AlertDialog` (suppression), `Popover` et `Checkbox` (facettes), `Pagination` et `Tooltip` (actions de tuile).
- Règle de lecture et liens des deux projets : `.claude/rules/design/claude-design.md`.

## Files touched

- **À modifier** : `next.config.ts` (relèvement de `serverActions.bodySizeLimit`)
- **À créer** : `src/lib/schemas/asset.ts`
- **À créer** : `src/server/actions/assets.ts`
- **À créer** : `src/server/actions/assets.test.ts`
- **À créer** : `src/server/actions/assets.types.ts`
- **À créer** : `src/server/queries/assets.ts` (listing et détection des rattachements)
- **À créer** : `src/server/queries/assets.test.ts` (boucle sur le jeton de continuation)
- **À modifier** : `src/lib/r2.ts` (second client, sur le bucket `portfolio-admin`)
- **À modifier** : `src/env.ts` et `.env.example` (variables du bucket admin)
- **À créer** : `src/app/admin/(protected)/api/assets/[...path]/route.ts` ou équivalent : route **authentifiée** servant `portfolio-admin`, la route publique ne détenant pas son token
- **À modifier** : `src/app/admin/(protected)/assets/page.tsx` (remplacement de la page d'attente)
- **Aucun composant shadcn à installer** : `dialog`, `select`, `alert-dialog`, `popover`, `checkbox`, `pagination`, `command` sont déjà en place depuis le `07`
- **À créer** : `src/components/features/admin/assets/AssetsBrowser.tsx`
- **À créer** : `src/components/features/admin/assets/AssetUploadDialog.tsx`
- **À créer** : `src/components/features/admin/assets/DeleteAssetDialog.tsx`
- **À créer** : `src/components/features/admin/assets/AssetPicker.tsx` (sélecteur réutilisable)
- **À modifier** : le formulaire entreprise posé par le `08`, qui gagne sa carte Logo (bouton « Choisir un logo » branché sur `AssetPicker`, préfixe `freelance/crm/entreprises/`), et sa Server Action de mutation, à qui le champ `logoFilename` est ajouté : le `08` livre le formulaire sans le logo
- **À modifier** : `docs/PRODUCTION.md` (mention de la limite de taille retenue)
- **À modifier** : `.claude/rules/nextjs/assets.md` (documentation du dossier `branding/`, absent de la rule alors qu'il est utilisé, et des cinq emplacements valides avec leur bucket)

## Architecture approach

**Le fichier transite par une Server Action, dont la limite est relevée à 8 Mo.** Next.js la fixe à 1 Mo par défaut, ce qui suffirait à un CV texte mais pas à une capture PNG non optimisée. La documentation précise que la limite porte sur le corps HTTP brut, overhead multipart compris, et qu'il faut prévoir 10 à 20 Ko de marge. Huit mégaoctets laissent un facteur trois à quatre sur le plus gros cas réaliste : une image de projet en webp pèse 100 à 300 Ko, une capture PNG 1 à 3 Mo, un CV rarement plus de 2 Mo.

La mise en garde de Next sur cette limite (consommation de ressources et déni de service) ne s'applique pas : l'action est derrière l'authentification, seul le compte autorisé peut l'atteindre.

**Chaque Server Action vérifie la session elle-même.** `await getCurrentUser()` ouvre chaque mutation, hors de tout `try/catch`. Le layout protège l'affichage des pages, il ne protège pas l'exécution des actions : une Server Action exportée est un endpoint HTTP que quiconque connaît l'identifiant peut appeler sans jamais charger l'écran. C'est la défense en profondeur qu'impose `.claude/rules/nextjs/server-actions.md`, qui écrit aussi bien « vérifier l'authentification dans chaque Server Action, même si le proxy protège déjà la route » que « ne pas dépendre uniquement du proxy : un matcher modifié peut supprimer la couverture ». L'appel précède le `try`, sinon le `catch` avalerait l'interruption `unauthorized()` et la présenterait comme une erreur technique.

**L'upload par URL présignée est écarté.** C'est la pratique standard des applications dont le dépôt de fichiers est une fonctionnalité centrale, parce que le transit par le serveur applicatif ne passe pas à l'échelle. Ici, un utilisateur unique dépose quelques fichiers par mois, et la Server Action offre un avantage que l'URL présignée fait perdre : **le serveur voit le fichier**, donc il peut valider son extension et sa taille avant écriture. Avec une URL présignée, le navigateur écrirait directement dans le bucket sans contrôle possible, au prix d'une configuration CORS et d'un échange en deux étapes.

**Deux buckets, deux clients, deux routes de lecture.** Le sub-project `09` a réparti les fichiers selon ce qu'une route publique a le droit de servir. `portfolio-assets` porte la vitrine et se lit sans authentification par `/api/assets/[...path]`. `portfolio-admin` porte le back-office et n'est jamais servi par cette route : son client détient un autre token, et sa lecture passe par une route sous `/admin`, gardée comme le reste de l'arbre. C'est cette séparation qui donne son sens au cloisonnement des tokens : même si la route publique était détournée, elle ne pourrait pas lire le second bucket.

**Le formulaire demande un emplacement, un slug et un nom de fichier.** L'arborescence issue du `09` porte des profondeurs différentes :

| Bucket | Structure | Segments | Exemple |
|---|---|---|---|
| assets | `branding/<fichier>` | 2 | `branding/portrait.jpg` |
| assets | `documents/cv/<fichier>` | 3 | `documents/cv/cv-thibaud-geisler-fr.pdf` |
| assets | `projets/{client,personal}/<slug-projet>/<fichier>` | 4 | `projets/client/webapp-gestion-sinistres/cover.webp` |
| admin | `freelance/crm/entreprises/<slug>/<fichier>` | 5 | `freelance/crm/entreprises/foyer/logo.png` |

Trois contrôles, donc, et non deux : un **emplacement** choisi dans une liste fermée (`branding`, `documents/cv`, `projets/client`, `projets/personal`, `freelance/crm/entreprises`), qui détermine aussi le bucket ; un **slug**, demandé seulement quand l'emplacement en attend un ; le **nom du fichier**. Formuler « un dossier et un sous-dossier conditionnel » ne suffirait pas : un asset de projet demande deux niveaux intermédiaires, `client` puis le slug, et c'est le cas le plus fréquent.

`MAX_SEGMENTS` vaut 5 dans `validateAssetPath`, ce qui couvre la clé la plus profonde sans modification.

**La modale de dépôt soumet par `onSubmit` et `startTransition`, jamais par `<form action>`.** Son `Select` d'emplacement subirait le même reset que celui des tags et des entreprises : React réinitialise un formulaire à `action` après chaque envoi, et Radix Select rappelle `onValueChange` avec sa valeur du premier rendu, ce qui effacerait l'emplacement choisi à la première erreur de validation (`.claude/rules/shadcn-ui/components.md`).

**`branding/` est absent de la rule.** Il est pourtant utilisé par le logo de la navbar, le portrait de la page à propos et le JSON-LD, mais `.claude/rules/nextjs/assets.md` ne décrit que `projets/` et `documents/`. Cet écart est comblé par ce sub-project, faute de quoi la prochaine personne à lire la rule croirait cette structure interdite.

**Le type MIME annoncé doit correspondre à l'extension.** La rule des Server Actions impose de valider taille **et** type MIME côté serveur. Un type vide est toléré, certains navigateurs ne le renseignant pas, mais un type renseigné qui contredit l'extension trahit un fichier renommé : l'accepter reviendrait à servir plus tard un `Content-Type` qui ne décrit pas le contenu, puisque la route déduit ce dernier de l'extension seule.

**Le nom de fichier passe par la même validation que la lecture.** `validateAssetPath` s'applique au chemin complet avant écriture : mêmes segments, même liste blanche d'extensions, même profondeur maximale. Un fichier qu'on ne pourrait pas relire n'a aucune raison d'être écrit.

**La suppression est refusée si l'asset est référencé, et il l'est de trois façons.** `Project.coverFilename` et `freelance.Company.logoFilename` stockent la clé complète, ce sont deux égalités. Mais les captures de case study ne vivent dans aucune colonne dédiée : elles sont écrites en dur dans `caseStudyMarkdownFr` et `caseStudyMarkdownEn`, et rendues par `MarkdownContent`. Une recherche qui les ignore laisse supprimer une image pourtant affichée sur une page publique, et le défaut ne se voit qu'à l'œil, plus tard, sur la page concernée. La vérification ajoute donc `{ caseStudyMarkdownFr: { contains: key } }` et son équivalent anglais au `findMany` des projets, avec un cas de test.

C'est le comportement déjà retenu pour les tags et les entreprises : dans tout l'espace admin, on ne supprime pas ce qui est utilisé.

**Le listing est paginé dès le départ.** `ListObjectsV2` renvoie au maximum mille objets par appel et se paie en opération Class A, la plus chère. Le volume actuel est très en deçà, mais consommer le jeton de continuation dès l'écriture évite une liste silencieusement tronquée le jour où le nombre d'assets grandit.

**Le sélecteur est un composant à part, et il prend son bucket en paramètre.** `AssetPicker` sert deux usages qui ne visent pas le même bucket, d'où un paramètre plutôt qu'un chemin figé : la carte Logo du formulaire entreprise, câblée ici même avec `freelance/crm/entreprises/` sur `portfolio-admin`, et la couverture de projet, câblée au sub-project `13` avec `projets/` sur `portfolio-assets`. L'écrire au moment où l'on connaît la forme des données évite de le bricoler dans un formulaire déjà chargé.

**Le listing est une grille plate filtrée par une facette « Dossier », pas une liste groupée par préfixe.** Aucune ligne de section ne sépare les dossiers : la barre d'outils porte une recherche et un `Popover` de facettes (Dossier, Nature), sur le motif déjà posé au `07`. La grille de tuiles suit des paliers fixes, une colonne par défaut, deux dès `sm`, trois dès `md`, quatre dès `lg`, cinq dès `xl`, pour des tuiles d'environ 200px.

**Chaque tuile porte une action « copier le chemin »**, en plus de la suppression : elle copie `/api/assets/<clé>` dans le presse-papiers. Aucune date de dernière modification n'apparaît sur la tuile, la maquette n'en montrant pas.

**Le pied de la grille n'a pas de sélecteur « lignes par page ».** Compteur et résumé des facettes à gauche, `Pagination` à droite : l'écran Assets n'est pas une instance de `DataTable`, une grille de tuiles n'a pas de colonnes à paginer par lot variable.

**L'avertissement d'écrasement n'a pas de représentation dans la maquette**, qui ne modélise que le dépôt nominal. Il prend la forme retenue pour tout avertissement inline de l'admin : un texte `text-sm text-destructive` dans le corps de `dlgUpload`, sans bandeau `Alert` séparé, et une confirmation explicite avant l'envoi.

**Le blocage de suppression suit le motif déjà posé pour les tags et les entreprises**, pas le pied à bouton unique `Fermer` que la maquette dessine pour ce cas précis : le refus remplace la description en `text-destructive` dès l'ouverture, le bouton `Annuler` reste, et `Supprimer` est désactivé plutôt que retiré. Le message suit le gabarit que `dlgDeleteAsset` montre pour une couverture de projet, décliné pour les deux autres rattachements possibles : le logo d'une entreprise et une capture de case study.

**Aucune écriture en base.** Un asset n'a pas d'existence en base : il est un objet dans le bucket, référencé par sa clé depuis `Project` ou `Company`. Ce sub-project n'ajoute donc aucun modèle Prisma, conformément à l'ADR-011.

Rules applicables : `.claude/rules/nextjs/assets.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/configuration.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/vitest/setup.md`.

## Acceptance criteria

### Scénario 1 : Dépôt et disponibilité immédiate
**GIVEN** l'écran des assets
**WHEN** on dépose une image dans un dossier de projet
**THEN** elle apparaît dans le listing
**AND** elle est servie par `/api/assets/...` à l'URL correspondant à sa clé

### Scénario 1 bis : Logo d'entreprise sélectionné
**GIVEN** le formulaire entreprise et sa carte Logo
**WHEN** on clique sur « Choisir un logo »
**THEN** le sélecteur d'assets s'ouvre sur `freelance/crm/entreprises/`, sur le bucket `portfolio-admin`
**AND** le logo choisi s'affiche dans l'aperçu de la carte

### Scénario 2 : Fichier trop volumineux
**GIVEN** la limite de taille configurée
**WHEN** on tente de déposer un fichier qui la dépasse
**THEN** un message indique la taille maximale acceptée
**AND** aucun objet partiel n'est écrit dans le bucket

### Scénario 3 : Extension refusée
**GIVEN** l'écran des assets
**WHEN** on tente de déposer un fichier dont l'extension n'est pas dans la liste blanche
**THEN** le dépôt est refusé avant tout appel à R2

### Scénario 4 : Nom de fichier invalide
**GIVEN** un fichier dont le nom comporte des espaces ou des caractères hors du motif attendu
**WHEN** on tente de le déposer
**THEN** soit le nom est normalisé, soit le dépôt est refusé, selon la règle retenue
**AND** la clé écrite est toujours relisible par la route

### Scénario 5 : Suppression d'un asset libre
**GIVEN** un asset référencé par aucun projet ni entreprise
**WHEN** on confirme sa suppression
**THEN** il disparaît du bucket et du listing

### Scénario 6 : Suppression d'un asset référencé
**GIVEN** un asset utilisé comme couverture d'un projet
**WHEN** on tente de le supprimer
**THEN** la suppression échoue
**AND** le message nomme le projet qui l'utilise
**AND** l'objet est toujours présent dans le bucket

### Scénario 6 bis : Suppression d'une capture de case study
**GIVEN** un asset cité dans le markdown de case study d'un projet, sans être sa couverture
**WHEN** on tente de le supprimer
**THEN** la suppression échoue
**AND** le message nomme le projet dont le case study l'affiche

### Scénario 6 ter : Séparation des deux buckets
**GIVEN** un logo déposé dans `freelance/crm/entreprises/<slug>/`
**WHEN** on tente de le charger par la route publique `/api/assets/...`
**THEN** la réponse est une erreur, cette route ne détenant que le token de la vitrine
**AND** la route authentifiée de l'espace admin le sert correctement, session valide

### Scénario 7 : Listing complet
**GIVEN** un bucket contenant plus d'objets qu'un appel ne peut en retourner
**WHEN** on affiche le listing
**THEN** tous les objets sont présentés, la pagination ayant été suivie

### Scénario 8 : Écrasement signalé
**GIVEN** un asset existant
**WHEN** on dépose un fichier portant exactement la même clé
**THEN** l'utilisateur est averti avant écrasement
**AND** l'opération n'aboutit qu'après confirmation

### Scénario 9 : Action inatteignable sans session
**GIVEN** aucune session valide
**WHEN** la Server Action est appelée directement, sans passer par l'écran
**THEN** l'accès est refusé avant toute validation et toute écriture
**AND** aucune ligne n'est créée, modifiée ni supprimée

## Tests à écrire

### Unit

- `src/server/actions/assets.test.ts`, avec le client R2 et Prisma mockés :
  - une extension hors liste blanche est refusée avant tout appel à R2
  - un nom de fichier hors du motif attendu est refusé ou normalisé, selon la règle retenue
  - un dossier de destination hors des emplacements valides est refusé
  - un fichier dépassant la taille maximale est refusé
  - un fichier vide est refusé
  - un fichier dont le type MIME contredit son extension est refusé
  - un fichier au type MIME vide est accepté, tous les navigateurs ne le renseignant pas
  - la clé écrite correspond exactement à la concaténation du dossier et du nom
  - la suppression d'un asset référencé comme couverture de projet échoue et nomme le projet
  - la suppression d'un asset référencé comme logo d'entreprise échoue et nomme l'entreprise
  - la suppression d'un asset cité dans `caseStudyMarkdownFr` ou `caseStudyMarkdownEn` échoue et nomme le projet
  - l'emplacement choisi détermine le bucket visé : `freelance/crm/entreprises` écrit dans `portfolio-admin`, les autres dans `portfolio-assets`
  - la suppression d'un asset libre appelle bien la commande de suppression R2
  - le listing suit le jeton de continuation lorsque la réponse est tronquée
  - un appel sans session est refusé avant tout appel à R2, la garde précédant la validation

Aucun test n'est écrit sur les composants ni sur le comportement du navigateur lors du dépôt.

## Edge cases

- **Garde par page** : la page appelle `await getCurrentUser()` avant tout rendu et garde le `loading.tsx` de son segment, posés au sub-project `06` (cf. `.claude/rules/nextjs/auth.md`)
- **Limite de taille silencieuse** : au-delà de `bodySizeLimit`, la requête est rejetée par le framework avant d'atteindre l'action. Le message par défaut n'est pas explicite, il faut donc valider la taille côté client avant l'envoi pour donner un retour compréhensible
- **Écrasement involontaire** : R2 remplace un objet de même clé sans avertissement. C'est le seul geste destructeur de cet écran, d'où l'avertissement du scénario 8
- **Nom de fichier issu du système de l'utilisateur** : espaces, accents et majuscules sont fréquents. Sans normalisation ou refus explicite, on écrirait une clé que `validateAssetPath` refuserait ensuite de relire, et l'asset serait perdu tout en occupant de l'espace
- **Fichier SVG** : le format est dans la liste blanche et peut porter du script. Servi en `image/svg+xml` et ouvert directement, il s'exécuterait dans le contexte du domaine. Le risque reste théorique ici puisque seul le compte autorisé peut déposer, mais il mérite d'être connu
- **Listing tronqué** : mille objets par appel. Sans suivre le jeton de continuation, la liste paraîtrait complète tout en masquant des fichiers
- **Capture de case study supprimable** : c'est le trou le plus discret de cet écran. La clé n'apparaît dans aucune colonne dédiée, seulement dans le markdown, donc une vérification limitée à `coverFilename` et `logoFilename` autorise la suppression d'une image affichée en production. Le défaut se découvre à l'œil, sur une page de case study, longtemps après
- **Mauvais bucket** : déposer un logo d'entreprise dans `portfolio-assets` le rendrait lisible sans authentification, ce que le sub-project `09` vient précisément de défaire. L'emplacement choisi doit déterminer le bucket, jamais l'inverse
- **Vidéos** : `CONTENT_TYPE_MAP` ne porte que `png`, `jpg`, `jpeg`, `webp`, `svg` et `pdf`. Déposer une démo filmée demanderait d'y ajouter `mp4` ou `webm`, et la limite de 8 Mo deviendrait vite courte. Hors périmètre tant qu'aucun projet n'en a besoin
- **Coût des opérations** : chaque affichage du listing consomme une opération Class A, la plus chère. Sur un usage d'administration, le volume reste négligeable au regard du million mensuel offert
- **Bucket de développement** : les dépôts locaux vont dans `portfolio-assets-dev`. Un asset déposé en local n'apparaîtra donc pas en production, ce qui est le comportement voulu mais peut surprendre
