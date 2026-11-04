---
paths:
  - "src/app/admin/**/*.tsx"
  - "src/components/features/admin/**/*.{ts,tsx}"
  - "src/lib/crm/**/*.ts"
  - "messages/**/*.json"
---

# shadcn/ui : textes d'interface de l'espace admin

## À faire
- **Valeurs métier** : celles de la base (catégories, statuts, formats), jamais des valeurs d'exemple ; l'ordre d'affichage commence à 1
- **Un même mot pour une même donnée** : colonne, vue détail et formulaire lisent la même constante `*_FIELD_LABELS`, sans abréviation en colonne (« Nature » pour client ou perso) ; le titre d'une vue nomme l'entité en entier (« Entreprises de recrutement », « Entreprises prospects »)
- **Libellés bilingues** : en toutes lettres, « Nom (français) », jamais « Nom (FR) »
- **Libellés du CRM** : « Localité » (zones), « Actions » (compte d'un lead), « Jours par semaine »
- **Vocabulaire du domaine** : « opportunité » partout, placeholders des combobox, messages de recherche et de liste vide compris
- **Résumé d'une saisie** : aucun texte ne répète les champs au-dessus (la période sous des dates, par exemple)
- **Apostrophe** : droite (`'`) dans tout texte d'interface

## À éviter
- **« mission »** pour une opportunité
- **Apostrophe typographique** (`’`) dans un texte d'interface
