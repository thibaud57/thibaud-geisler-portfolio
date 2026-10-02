# Notes de sync du design system

## Les deux projets Claude Design, et ce que chacun fait foi

| Projet | Lien | Rôle |
| --- | --- | --- |
| Thibaud Geisler Design System (`75a17be1-6ed8-4e44-9517-0b3184998c0c`) | https://claude.ai/design/p/75a17be1-6ed8-4e44-9517-0b3184998c0c | Les **composants** : miroir JSX, `.d.ts`, fiche `.prompt.md` et carte par composant, plus tokens, guidelines, assets et le kit du site public (`ui_kits/portfolio/`) |
| Espace Admin (`d2229cd8-49ca-4774-b7c8-0fdc88b83103`) | https://claude.ai/design/p/d2229cd8-49ca-4774-b7c8-0fdc88b83103 | La **maquette** des écrans admin (`Espace admin.dc.html`), construite sur une copie liée du design system (`_ds/`), plus `ecarts-design-system.md` |

**Les deux se lisent ensemble avant d'implémenter un écran admin** : le système dit avec quels
composants, la maquette dit à quoi l'écran ressemble. Un sub-project qui ne consulte que l'un des
deux se trompe, c'est arrivé au 06 : le shell a d'abord été écrit sans la maquette, puis repris.
Même chose au 07 : l'écran des tags a été livré depuis la spec, sans la maquette ni les fiches du
système, puis refait entièrement.

`ecarts-design-system.md` liste ce que la maquette a dû contourner faute d'un composant adéquat :
à relire avant de changer un composant du système, une correction peut y supprimer un contournement.

## Lire la maquette

- **`DesignSync` tronque la lecture d'un fichier à 256 Kio** (`get_file`, constaté le 2026-09-17) :
  `Espace admin.dc.html` dépasse cette taille, la fin du fichier ne revient pas et rien ne le signale.
  Au 07, l'écran Tags était lisible, pas les modales, le formulaire entreprise ni l'écran des assets.
- **Lire la maquette depuis son export** : dans Claude Design, menu du projet, Export puis
  ZIP, dézippé dans `.design-sync/maquette/` (ignoré par git : la maquette fait foi, une copie
  versionnée vieillirait). Ré-exporter avant de s'en servir si la maquette a bougé.
- **Lire les fiches du design system depuis son export** : même procédure sur le projet du design
  system, dézippé dans `.design-sync/design-system/` (ignoré par git, comme par ESLint, Prettier et
  TypeScript : il porte des `.jsx` et des `.d.ts`). Chaque composant y a sa fiche
  `components/<groupe>/<Nom>.prompt.md`. Cet export est la copie que `/design-sync` modifie puis
  envoie : il reste aligné sur le projet en ligne sans nouveau ZIP. Seuls `_ds_bundle.js`,
  `_ds_manifest.json` et `_adherence.oxlintrc.json`, que l'app régénère à la recompilation, y gardent
  la date du dernier ZIP. Pour contrôler l'alignement : `list_files` (mêmes chemins des deux côtés),
  puis `get_file` sur un fichier précis, deux lectures sans plan ni écriture. La copie `_ds/` de la
  maquette n'a pas les fiches.
- **Lire un écran, pas le fichier** : l'export porte tous les écrans dans un seul fichier. Repérer
  l'écran par son identifiant (`isTags`, `dlgDeleteTag`…), lire sa plage, puis les valeurs
  calculées qu'il utilise (libellés, colonnes, items) dans le script en fin de fichier.
- **Vérifier qu'un écran est complet avant de s'y fier** : un écran coupé ressemble à un écran
  simple. L'export se termine par `</html>`, une lecture tronquée non.

## Comment ce dépôt se synchronise

- **Le convertisseur de `/design-sync` ne s'applique pas** : app Next.js privée, sans point d'entrée
  de librairie, sans `dist`, sans Storybook. Il n'a rien à empaqueter.
- **Le design system s'écrit donc fichier par fichier** : `components/<groupe>/<Nom>.{jsx,d.ts,prompt.md}`,
  une carte `@dsCard` par dossier, via `finalize_plan` puis `write_files`.
- **Tenir `github.md` à jour** : c'est le registre de sync du projet Claude Design, il porte la branche
  d'origine, la date, ce qui a changé et la table qui relie chaque dossier du système à ses fichiers
  du dépôt. Un sync qui ne le touche pas laisse le lecteur suivant sur un état faux.
- **Finir par `_ds_needs_recompile`** (`{"by":"design-sync-manual"}`) : c'est lui qui déclenche
  l'auto-contrôle de l'app à l'ouverture du projet, qui relit les `.d.ts`, réenregistre les cartes,
  régénère `_ds_manifest.json` et l'adherence, puis l'efface.
- **Pas de `_ds_sync.json`** : cette ancre décrit un build du convertisseur. Sans elle, le prochain
  sync revérifie tout, ce que le skill appelle le choix honnête hors convertisseur.
- **Ne pas envoyer `_ds_bundle.js`** : l'app le recompile depuis les `.jsx` envoyés, à l'ouverture qui
  suit `_ds_needs_recompile` (le correctif `Sidebar.jsx` du 06 y est arrivé sans bundle envoyé).
- **Travailler dans l'export et vérifier avant l'envoi** : l'export `.design-sync/design-system/` est
  la copie à modifier, en gardant une copie intacte pour calculer ce qui s'écrit et ce qui se
  supprime. Pour voir les cartes, recompiler un bundle local depuis les `.jsx` (un bloc par
  fichier, imports repris depuis `__ds_scope`, noms publiés sur le namespace), servir le dossier en
  HTTP (les icônes se chargent par `fetch`, refusé en `file://`),
  puis capturer chaque carte avec le Chromium de Playwright en headless à son viewport `@dsCard`.
  Comparer au rendu de la copie intacte distingue une régression d'un défaut ancien.
- **Un composant installé quitte `post-mvp/`** : fichiers vers `components/core/`, règles de
  `post-mvp.css` vers `components.css`. Les deux feuilles restent à leur place : la maquette les
  charge directement.
- **La maquette charge `_ds_src/`, pas `_ds/`** : `_ds/` est l'instantané lié que l'app gère,
  `_ds_src/` une copie écrite à la main. Après un sync du système, y recopier depuis l'export les
  feuilles et le readme qui ont changé, et y compiler le bundle depuis les `.jsx` de l'export :
  celui de l'app dépasse les 256 Kio que `get_file` rend, celui de l'export date du dernier ZIP.
  Compilation : un point d'entrée qui importe chaque `.jsx` et publie ses exports sur
  `window.ThibaudGeislerDesignSystem_75a17b`, passé à `esbuild --bundle --format=iife --jsx=transform
  --jsx-factory=React.createElement --tsconfig-raw={} --minify-whitespace` (sans minification, le
  bundle garde en commentaire le chemin local de chaque fichier). Vérifier ensuite que chaque
  composant utilisé par la maquette existe dans le nouveau bundle, puis capturer ses écrans avant et
  après : un écart hors des composants touchés est une régression.
- **Dans la maquette, `style` sur un `x-import` ne garde que la position** (`position`, `inset`,
  `width`, `z-index`…) : le runtime (`support.js`) l'applique à l'hôte, pas au composant. Une
  couleur passe par `dc-props`, qui étale en props un objet calculé dans le script
  (`{ style: { color: … } }`).
- **Ne jamais modifier la maquette sans demande explicite** : c'est le fichier de design du
  propriétaire, pas un artefact généré.
- **`esbuild` n'est plus une dépendance directe** : retiré au sub-project 14 avec le seed, il reste
  installé en transitif, donc `node_modules/.bin/esbuild` répond toujours. Le chercher dans
  `package.json` ne donne rien, ce qui ne veut pas dire qu'il manque. Compiler tous les `.jsx` en
  un bundle jetable est la façon la moins chère de vérifier qu'aucun import ne casse avant un sync.
- **Sans navigateur piloté, monter les miroirs en SSR** plutôt que de ne rien vérifier : bundler en
  `--format=esm` vers un dossier du dépôt (hors de lui, `react` ne résout pas), poser
  `globalThis.React` avant l'import (les miroirs le supposent global, comme les cartes qui le
  tiennent du script UMD), puis `renderToStaticMarkup` sur chaque composant avec ses props requises.
  Un identifiant manquant ou une prop mal lue échoue là, quand une carte se contenterait de rester
  blanche. Cela ne dit rien de l'apparence, seulement que le composant s'exécute.
- **Capturer les cartes sans le MCP** : `playwright-core` et son Chromium vivent dans le cache npx
  du serveur MCP, utilisables directement depuis un script. Servir l'export en HTTP, rediriger
  `/_ds_bundle.js` vers un bundle compilé à la volée, puis capturer chaque carte et relever erreurs
  console, racine vide et hauteur nulle. Trois réglages sans lesquels rien ne rend : `--jsx=transform`
  avec `React.createElement` en factory (les cartes fournissent React en UMD, le JSX automatique
  réclame un `react/jsx-runtime` absent), `--tsconfig-raw={}` parce qu'esbuild lit sinon le
  `tsconfig.json` du dépôt et réimpose ce JSX automatique, et un alias `react` vers un shim qui
  renvoie le global, faute de quoi le bundle embarque son propre React et entre en conflit.
- **Ce que le rendu a attrapé et que rien d'autre n'aurait vu** : le `Tooltip` de ce système
  enveloppe son déclencheur dans un span `inline-flex`, là où Radix le clone sans wrapper. Deux
  tooltips voisins se posaient donc côte à côte, collant le nom d'un asset à son dossier. Le style
  étant inline, aucune règle CSS ne le bat : c'est la prop `width` du `Tooltip` qui le règle.

## Pas encore dans la maquette

Décisions prises que la maquette ne montre pas, et écrans qu'elle n'a pas. À reporter quand le
propriétaire le demande ; chaque ligne part une fois faite.

- **Écrans à dessiner** : assistant interne (Feature 3), seconde interface du même assistant que le
  bot Telegram, dessinée après lui : fenêtre flottante déplaçable et redimensionnable qui connaît
  la page en cours, fait confirmer chaque écriture et affiche ses propres questions et demandes
  d'accord dans la conversation, plus une page d'historique qui montre aussi les conversations
  commencées sur Telegram ; résultats des jobs à valider (Feature 3 : candidats du sourcing à
  trier, pré-remplissage à accepter) ; Analytics (Feature 9, avec les graphiques du système) ;
  Accueil (`isHome`), à revoir avec la feature Missions (Feature 4).
- **Avant de dessiner l'assistant et le chatbot public** : faire les recherches sur ces deux sujets.

## Journal

- **Revue de la maquette par le propriétaire (synchronisée le 2026-10-02)** : formulaires, modales et
  vues détail passés au crible, deux colonnes sans champ orphelin, ordre logique, vue détail dans
  l'ordre de son formulaire hors champs placés en tête ; la personne partagée ne se voit plus (lead
  toujours nouveau, contact « Depuis un lead », correspondant créé en ligne comme contact du type
  choisi) ; fiches rattachées en `RelatedLinksList`, nouveau composant du système, cliquables vers
  l'autre fiche, cards rattachées sous Détails ; « Missions » du CRM devenues « Opportunités », menu
  dans l'ordre du pipeline ; glyphes sur les énumérations (55 glyphes Lucide ajoutés au système) ;
  `MonthField` en sélecteur de mois ; panneaux de `Popover`, `Select` et `Tooltip` placés sur leur
  cible dans une modale ; sélecteur d'asset par contexte. Reporté le même jour dans les specs et
  plans `domaine-freelance-crm` (modèle `Opportunity`, sub-projects `14-opportunites-donnees` et
  `15-ecran-opportunites`, route `/admin/opportunites`), dans `DESIGN.md` (vue détail, lignes et
  fiches rattachées, glyphes d'énumération, mois de démarrage) et dans `BRAINSTORM.md`.
- **Audit de cohérence code, doc, système et maquette (synchronisé le 2026-10-02)** : `DESIGN.md`
  corrigé sur neuf points que le code dément (ordre de `LABEL_CLASS`, `leading-none` de
  `DialogTitle`, rayons des lignes à cocher, `LocationLine` sur `/contact` seul, formulaire de
  contact en onglets, logo du badge entreprise, taille maximale d'un dépôt, troisième `!important`,
  retrait de page admin) ; le système suit le code (pager à cinq emplacements, Malt, lien de langue
  du footer, bouton CV, logo du badge entreprise) et son readme liste chaque écart d'API assumé ;
  la maquette applique les arbitrages aux écrans sans spec et ses pieds de liste passent par des
  clés `*Pager`, les `*Foot` portant déjà des totaux ; les plans 10, 18 et 19 donnent à leurs
  modales un titre qui nomme l'élément et une description qui dit l'action.
- **Maquette réalignée sur l'ADR-026 (synchronisée le 2026-10-02)** : le Kanban (Dev) passe en
  cartes stockées en base, liées à une spec ou à un plan du dépôt, avec l'état du run en badge et
  « Lancer » dans la vue détail, sans issues GitHub ni cron. Les Audits (Dev) lancent leurs runs à
  la demande avec les mêmes états ; Telegram prévient quand un run attend une réponse ou se
  termine ; un constat retenu devient une carte du Kanban.
- **Audits du design system et de la maquette (synchronisé le 2026-10-01)** : les quatre
  composants CRM non installés (`DateTimeField`, `OptionalDateField`, `MonthField`,
  `RelatedLinksCard`) passent sous `post-mvp/`, comme `DESIGN.md` les range ; `GoogleSignInButton`
  entre avec la carte `patterns-admin-login` et le glyphe Google ; les fiches `Sidebar`, `Avatar`,
  `AssetPreview` et `Footer` nomment les fichiers du code qui les composent ; `DetailDialog` prend
  un `onEdit` facultatif (plan `08`) ; readme et `github.md` corrigés (rayons, comptes, arbitrages).
  Maquette : écarts visibles corrigés (actions de ligne, tailles de page, recherche, badges, rail,
  connexion). Puis `DataTable` mis à l'API du code et `ConfirmDeleteDialog` rendu pilotable :
  listes livrées et du CRM sur `DataTable`, chaque écran dans `AdminPageShell`, pieds sur
  `PaginationFooter`, suppressions sur `ConfirmDeleteDialog`. Les en-têtes triables trop étroits
  ont révélé des largeurs fausses dans les plans 08, 10, 13, 17 et 18, corrigées. Restent composés
  à la main : les tables des écrans sans spec et le pied des CRA, voir
  `maquette/ecarts-design-system.md`.
- **Composants des plans CRM ajoutés au système (synchronisé le 2026-10-01)** : sept
  composants que les plans `domaine-freelance-crm` emploient et que le système n'avait pas, chacun
  avec miroir, `.d.ts`, fiche et carte : `DateTimeField`, `OptionalDateField`, `MonthField`,
  `RelatedLinksCard`, `MultiSelectCombobox` (patterns), `MarkdownContent` (core) et `Editor`
  (post-MVP, mock de Pages CMS Editor, ADR-024). Échelle compacte du markdown de l'admin, décidée
  par le propriétaire le même jour : `MarkdownContent` en variante `admin` et l'éditeur partagent
  « # » 18 px, « ## » 16 px, « ### » 14 px, texte 14 px. Le mock de l'éditeur ne crée plus de
  paragraphe vide pour une ligne blanche du markdown. `_ds_src/` recompilé (151 exports), puis la
  maquette branchée dessus : Détails (éditeur et lecture), étude de cas des projets, cards de fiches
  rattachées, date de rencontre, date et heure d'une action et d'un entretien, date d'un signal,
  démarrage d'une mission, zones, secteurs et correspondants. Les champs date du système gardent
  sous eux le conteneur d'erreur vide de `FormField`, comme le code : 8 px de plus qu'un champ fait
  main, voulu.
- **Audit des plans, specs et maquette contre les arbitrages (2026-10-01)** : cinq contrôles
  indépendants. Corrigés : valeurs d'énumération en badge dans les vues détail des plans (19
  occurrences) et de la maquette, ordre du bloc Pipeline du lead, aide de la card Notes passée par
  `FormField`, vue Journal des entretiens et des revues qui montre toutes ses colonnes, taux de revue
  absent rendu par `EmptyValue`, type de signal en badge, champs RCS sur leur propre rangée,
  `OptionalDateField` créé au plan 05 (date d'assujettissement à la TVA) puis réutilisé par 08 et 19.
  L'état posé à droite du titre d'une vue détail garde le `Badge` `outline` `meta`, comme dans l'app :
  l'arbitrage « Valeur d'énumération » le nomme parmi ses exceptions.
- **Maquette réalignée sur le CRM (synchronisée le 2026-10-01)** : écrans CRM refaits sur
  les specs `domaine-freelance-crm` (entreprises, leads, contacts, missions, entretiens, actions de
  prospection, revues hebdo, signaux), arbitrages transverses de `docs/DESIGN.md` appliqués aussi aux
  tags, projets et assets, couche IA retirée (« Pré-remplir », score calculé). `_ds_src/`
  resynchronisé : bundle compilé depuis l'export (144 exports, les 72 composants de la maquette
  présents), `components.css`, `post-mvp.css`, readme. Contrôle par 78 captures : rendu identique au
  bundle de test, écarts avec la référence limités aux changements voulus. Le rendu a révélé un
  défaut du système : `NameSlugCell` donnait au nom la police mono du slug, corrigé dans le
  `components.css` de l'export, envoyé avec le sync des composants le même jour (écart n° 4
  d'`ecarts-design-system.md`, réglé ; le fichier gagne aussi les écarts 2 et 3). Un audit ligne à ligne des
  arbitrages de `docs/DESIGN.md` contre la maquette a ensuite fait reprendre ce que le premier
  passage avait manqué (badges d'énumération des vues détail, état vide filtré commun à toutes les
  listes, pied de pagination et état vide des assets), puis les écrans Projets et Assets ont été
  réalignés sur le code livré (nature en boutons radio, card Liens, libellés bilingues en toutes
  lettres, tags en badges, table au téléphone, tuiles d'asset, titre de suppression qui nomme
  l'élément) : tous les arbitrages portent leur date de réalignement. Deux logos d'exemple pointent
  vers des PNG de `branding/logos/` dans le dossier de la maquette, pour que la grille d'assets
  montre un aperçu réel à côté d'un aperçu manquant.
- **Clôture de l'epic espace-admin (synchronisé le 2026-09-25)** : les sub-projects 08 à
  14 n'avaient donné lieu à aucun sync, le système en était resté au 07. Seize patterns admin y
  entrent (`RowActionButton`, `TruncateTooltip`, `BadgeList`, `ConfirmDeleteDialog`, `DetailDialog`,
  `OptionsPopover`, `SearchInput`, `FacetFilter`, `PaginationFooter`, `EmptyState`, `TitledBlock`,
  `NameSlugCell`, `EmptyValue`, `ExternalUrl`, `CompanyLogoTile`, `AssetPreview`), avec `core/Empty`
  qui leur manquait et cinq cartes `patterns-admin-*`. `Breadcrumb`, `RadioGroup` et `Calendar`
  quittent `post-mvp/` pour `core/`, règles CSS comprises, et `post-mvp/navigation/` disparaît,
  vidé. Le readme, `github.md` et les fiches `DataTable`, `Combobox`, `AlertDialog`, `Tooltip`,
  `Badge`, `Table`, `Checkbox`, `DropdownMenu`, `Avatar` sont réalignés sur ce que le produit fait
  vraiment. Deux glyphes Lucide ajoutés (`file-text`, `image`), que `AssetPreview` réclamait.
  Vérifié par compilation (81 miroirs), par montage SSR (21 composants) et **par capture : 28 des
  29 cartes rendent sans anomalie**, la dernière ne portant que les deux 404 volontaires qui
  démontrent l'aperçu manquant. Le rendu a corrigé ce que le reste avait laissé passer : nom et
  dossier collés sur une tuile d'asset, un panneau de filtres ouvert qui recouvrait deux pieds de
  pagination, un cadre de vue détail trop court qui coupait ses deux dernières lignes.
  `ecarts-design-system.md` perd son patron « trois badges puis un compteur », que `BadgeList` règle.
- **Resté ouvert après ce sync, réglé le 2026-10-01** : le `_ds_src/` de la maquette était resté au
  19 septembre. Resynchronisé une fois le projet du système recompilé par l'app.

- **Sub-project 06, shell admin** : ajout de `BrandMark` et `AdminPageShell` dans
  `components/patterns/`, fiches `Sidebar`, `Avatar` et `Tooltip` mises à jour (installés en
  production), `readme.md` corrigé sur l'existence de l'admin. Correction de `Sidebar.jsx` :
  `data-collapsible` n'est plus posé que replié, comme dans le registre et comme dans
  `src/components/ui/sidebar.tsx`. C'est l'écart n° 2 d'`ecarts-design-system.md` : la maquette
  peut retirer la `ScrollArea` qui le contournait. `github.md` porte la trace datée du sync et la
  table des écrans, corrigée : `Sidebar`, `Avatar` et `Tooltip` ne sont plus annoncés comme absents
  du dépôt.
- **Sub-project 07, tags (sync du 2026-09-19)** : treize composants installés passent de
  `post-mvp/` à `components/core/`, fiches au statut installé ; arbitrages du propriétaire portés
  dans le readme et les fiches `Dialog`, `AlertDialog` et `Input` (`AlertDialogMedia` sans tuile) ;
  `Command` réaligné sur le registre plus récent installé au 07 ; `AdminPageShell` reçoit
  `actions` et son sous-titre de 14px ; motif `DataTable` ajouté avec la carte `patterns-admin` ;
  cartes de guidelines palette des graphiques et drapeaux ; taille `xs` du fil d'ariane, qui
  n'avait pas de règle. `Dialog size="lg"` et `DialogBody` restent (la maquette s'en sert) et sont
  écrits comme raccourcis du système, le code élargissant par classe. Détail dans `github.md`.
- **Maquette réalignée (2026-09-19)** : sur le code du 07 et les huit arbitrages de `docs/DESIGN.md`
  (six catégories de tag, formulaire de tag du code, refus de suppression dans le texte, 16px entre
  champs en modale, formats et contrats de la base). Sa copie `_ds_src/` resynchronisée depuis
  l'export du système (bundle, manifeste, `components.css`, `post-mvp.css`, readme), après contrôle
  que les 60 composants utilisés existent et capture des 23 écrans avant et après : seules les
  modales changent. Écart n° 2 réglé, `ScrollArea` de la sidebar retirée. Détail dans le
  `github.md` de la maquette.
- **Reste ouvert** : écart n° 1, `Kanban` n'accepte que trois champs par carte, la maquette propose
  un champ `meta` ou `badges` et un `line-clamp-2`.
