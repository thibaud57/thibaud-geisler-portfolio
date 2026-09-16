# Notes de sync du design system

## Les deux projets Claude Design, et ce que chacun fait foi

| Projet | Lien | Rôle |
| --- | --- | --- |
| Thibaud Geisler Design System (`75a17be1-6ed8-4e44-9517-0b3184998c0c`) | https://claude.ai/design/p/75a17be1-6ed8-4e44-9517-0b3184998c0c | Les **composants** : miroir JSX, `.d.ts`, fiche `.prompt.md` et carte par composant, plus tokens, guidelines, assets et le kit du site public (`ui_kits/portfolio/`) |
| Espace Admin (`d2229cd8-49ca-4774-b7c8-0fdc88b83103`) | https://claude.ai/design/p/d2229cd8-49ca-4774-b7c8-0fdc88b83103 | La **maquette** des écrans admin (`Espace admin.dc.html`), construite sur une copie liée du design system (`_ds/`), plus `ecarts-design-system.md` |

**Les deux se lisent ensemble avant d'implémenter un écran admin** : le système dit avec quels
composants, la maquette dit à quoi l'écran ressemble. Un sub-project qui ne consulte que l'un des
deux se trompe, c'est arrivé au 06 : le shell a d'abord été écrit sans la maquette, puis repris.

`ecarts-design-system.md` liste ce que la maquette a dû contourner faute d'un composant adéquat :
à relire avant de changer un composant du système, une correction peut y supprimer un contournement.

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
- **La copie `_ds/` de la maquette est un instantané** du système : elle se rafraîchit côté app, pas
  à la main.
- **Ne jamais modifier la maquette sans demande explicite** : c'est le fichier de design du
  propriétaire, pas un artefact généré.

## Journal

- **Sub-project 06, shell admin** : ajout de `BrandMark` et `AdminPageShell` dans
  `components/patterns/`, fiches `Sidebar`, `Avatar` et `Tooltip` mises à jour (installés en
  production), `readme.md` corrigé sur l'existence de l'admin. Correction de `Sidebar.jsx` :
  `data-collapsible` n'est plus posé que replié, comme dans le registre et comme dans
  `src/components/ui/sidebar.tsx`. C'est l'écart n° 2 d'`ecarts-design-system.md` : la maquette
  peut retirer la `ScrollArea` qui le contournait. `github.md` porte la trace datée du sync et la
  table des écrans, corrigée : `Sidebar`, `Avatar` et `Tooltip` ne sont plus annoncés comme absents
  du dépôt.
- **Reste ouvert** : écart n° 1, `Kanban` n'accepte que trois champs par carte, la maquette propose
  un champ `meta` ou `badges` et un `line-clamp-2`.
