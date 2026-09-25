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
  `components/<groupe>/<Nom>.prompt.md`. `DesignSync` est réservé à `/design-sync` : ré-exporter
  après chaque sync plutôt que lire en ligne. La copie `_ds/` de la maquette n'a pas les fiches.
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
  fichiers qui ont changé, vérifier que chaque composant utilisé par la maquette existe dans le
  nouveau bundle, puis capturer ses écrans avant et après : un écart hors des composants touchés
  est une régression.
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

## Journal

- **Clôture de l'epic espace-admin (préparé le 2026-09-25, sync à lancer)** : les sub-projects 08 à
  14 n'avaient donné lieu à aucun sync, le système en était resté au 07. Seize patterns admin y
  entrent (`RowActionButton`, `TruncateTooltip`, `BadgeList`, `ConfirmDeleteDialog`, `DetailDialog`,
  `OptionsPopover`, `SearchInput`, `FacetFilter`, `PaginationFooter`, `EmptyState`, `TitledBlock`,
  `NameSlugCell`, `EmptyValue`, `ExternalUrl`, `CompanyLogoTile`, `AssetPreview`), avec `core/Empty`
  qui leur manquait et cinq cartes `patterns-admin-*`. `Breadcrumb`, `RadioGroup` et `Calendar`
  quittent `post-mvp/` pour `core/`, règles CSS comprises, et `post-mvp/navigation/` disparaît,
  vidé. Le readme, `github.md` et les fiches `DataTable`, `Combobox`, `AlertDialog`, `Tooltip`,
  `Badge`, `Table`, `Checkbox`, `DropdownMenu`, `Avatar` sont réalignés sur ce que le produit fait
  vraiment. Deux glyphes Lucide ajoutés (`file-text`, `image`), que `AssetPreview` réclamait.
  Vérifié par compilation : 81 miroirs, bundle jetable, aucun import cassé. **Non vérifié : le
  rendu.** Aucune carte n'a été capturée, le navigateur piloté n'était pas disponible ce jour-là.
  `ecarts-design-system.md` perd son patron « trois badges puis un compteur », que `BadgeList` règle.
- **Reste ouvert après ce sync** : le `_ds_src/` de la maquette est resté au 19 septembre, donc elle
  tourne encore sur le système d'avant et ne voit ni les patrons admin, ni `Empty`, ni les
  composants sortis de `post-mvp/`. Le resynchroniser n'a d'intérêt qu'au prochain écran admin, et
  demande d'abord que le projet du système ait été ouvert une fois, pour que son bundle soit
  recompilé : le recopier depuis un bundle jamais rendu reviendrait à propager une erreur inconnue.

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
