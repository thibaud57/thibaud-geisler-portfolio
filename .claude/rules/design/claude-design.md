---
paths:
  - "src/app/admin/**/*.tsx"
  - "src/components/features/admin/**/*.tsx"
  - "src/components/layout/**/*.tsx"
---

# Claude Design — la maquette de l'espace admin

Un second projet Claude Design, « Espace Admin », porte les écrans de l'administration dans `Espace admin.dc.html`. Il fait foi sur **à quoi l'écran ressemble**, quand le design system fait foi sur **avec quels composants** (celui-là est déjà couvert par les rules `shadcn-ui`, qui renvoient à `docs/DESIGN.md`). Les liens des deux projets sont dans [docs/DESIGN.md § Maquette et design system externes](../../../docs/DESIGN.md), la procédure de sync et le journal dans `.design-sync/NOTES.md`.

## À faire

- **Lire l'écran de la maquette** avant d'écrire le composant. La spec du sub-project le nomme dans sa section « Références de design »
- **Lire la maquette depuis son export local** (`.design-sync/maquette/`, procédure dans `.design-sync/NOTES.md`), pas par `DesignSync` : sa lecture s'arrête à 256 Kio sans prévenir, et la maquette dépasse cette taille
- **Lire les fiches du design system depuis son export local** (`.design-sync/design-system/components/<groupe>/<Nom>.prompt.md`) : `DesignSync` est réservé à `/design-sync`, que le propriétaire lance
- **Signaler une divergence** entre la maquette et la spec au lieu de la trancher en silence : les deux ont été écrites séparément, l'écart est une décision à prendre
- **Appliquer les arbitrages avant la maquette** : leur liste, dans `docs/DESIGN.md` § Arbitrages, porte chaque écart tranché une fois par le propriétaire. La décision vaut pour tous les écrans suivants, même si la maquette n'a pas encore été réalignée
- **Consigner un nouvel arbitrage dans cette liste**, pas dans une note du mapping : c'est elle que lisent les commandes et le contrôle de fidélité
- **Relire `ecarts-design-system.md`** (dans le projet de la maquette) après avoir corrigé un composant du design system : la correction peut y rendre un contournement inutile

## À ne pas faire

- **Recopier des valeurs de la maquette** dans une spec, une rule ou un commentaire : elle continue d'évoluer. On nomme son écran, on ne décrit pas son contenu ailleurs qu'en elle
- **Modifier la maquette** : c'est le fichier de design du propriétaire, pas un artefact généré. Sur demande explicite uniquement
- **Éditer le dossier `_ds/` de la maquette** : c'est un instantané du design system, rafraîchi côté application
