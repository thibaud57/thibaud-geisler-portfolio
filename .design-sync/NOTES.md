# Notes de sync du design system

- **Projet cible** : « Thibaud Geisler Design System » (`75a17be1-6ed8-4e44-9517-0b3184998c0c`).
- **Le convertisseur de `/design-sync` ne s'applique pas à ce dépôt** : app Next.js privée, sans point
  d'entrée de librairie, sans `dist`, sans Storybook. Il n'a rien à empaqueter.
- **Le projet Claude Design est écrit à la main**, au format attendu par l'app : `components/<groupe>/<Nom>.{jsx,d.ts,prompt.md}`,
  une carte `@dsCard` par dossier, `tokens/`, `guidelines/`, `assets/` et les maquettes `ui_kits/portfolio/`.
  Un sync se fait donc fichier par fichier, via le plan puis `write_files`.
- **Les maquettes ne se touchent pas** sans demande explicite : elles recréent le site public, pas l'admin.
- **Après chaque sub-project** : mettre à jour la fiche des composants touchés, leur statut post-MVP
  s'ils arrivent dans `src/components/ui`, et les passages du `readme.md` que le changement rend faux.
- **Sub-project 06 (shell admin)** : ajout de `BrandMark` et `AdminPageShell` dans `components/patterns/`,
  fiches `Sidebar`, `Avatar` et `Tooltip` mises à jour, `readme.md` corrigé sur l'existence de l'admin.
  Les cartes visuelles n'ont pas bougé : un dossier n'en porte qu'une, et celles en place restent justes.
