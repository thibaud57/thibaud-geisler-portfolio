---
paths:
  - "src/app/admin/**/*.tsx"
  - "src/components/features/admin/**/*.tsx"
  - "src/components/layout/Admin*.tsx"
---

# Claude Design — la maquette de l'espace admin

La maquette « Espace Admin » (`Espace admin.dc.html`) fait foi sur **à quoi l'écran ressemble**, le design system sur **avec quels composants** (rules `shadcn-ui` et `docs/DESIGN.md`). Liens des deux projets : [docs/DESIGN.md § Maquette et design system externes](../../../docs/DESIGN.md), procédure de sync : `.design-sync/NOTES.md`.

## À faire
- **Lire l'écran de la maquette** avant d'écrire le composant. La spec du sub-project le nomme dans sa section « Références de design »
- **Lire la maquette depuis son export local** (`.design-sync/maquette/`), pas par `DesignSync`
- **Lire les fiches du design system depuis son export local** (`.design-sync/design-system/components/<groupe>/<Nom>.prompt.md`) : `DesignSync` est réservé à `/design-sync`, que le propriétaire lance
- **Signaler une divergence** entre la maquette et la spec au lieu de la trancher en silence : l'écart est une décision à prendre
- **Appliquer les arbitrages avant la maquette** : `docs/DESIGN.md` § Arbitrages porte chaque écart tranché par le propriétaire, valable pour tous les écrans suivants même si la maquette n'a pas été réalignée
- **Consigner un nouvel arbitrage dans cette liste**, pas dans une note du mapping : c'est elle que lisent les commandes et le contrôle de fidélité
- **Relire `ecarts-design-system.md`** (dans le projet de la maquette) après avoir corrigé un composant du design system : la correction peut y rendre un contournement inutile

## À éviter
- **Recopier des valeurs de la maquette** dans une spec, une rule ou un commentaire : elle continue d'évoluer. On nomme son écran, on ne décrit pas son contenu ailleurs qu'en elle
- **Modifier la maquette** : c'est le fichier de design du propriétaire, pas un artefact généré. Sur demande explicite uniquement
- **Éditer le dossier `_ds/` de la maquette** : c'est un instantané du design system, rafraîchi côté application

## Gotchas
- **`DesignSync` tronque la lecture à 256 Kio sans prévenir** : la maquette dépasse cette taille, une lecture par lui renvoie un écran incomplet qui a l'air entier
- La maquette et les specs ont été écrites séparément : une différence entre les deux n'est pas une erreur de l'une, c'est un arbitrage en attente
