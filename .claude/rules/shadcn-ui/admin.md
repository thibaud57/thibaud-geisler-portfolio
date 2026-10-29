---
paths:
  - "src/app/admin/**/*.tsx"
  - "src/components/features/admin/**/*.{ts,tsx}"
  - "src/lib/admin/table-widths.ts"
  - "src/config/admin-nav-items.ts"
---

# shadcn/ui : composants de l'espace admin

## À faire
- **Vues d'une liste** : la vue complète (« Tous », « Toutes », « Journal ») se sert sur la route racine de la section, montre toutes les colonnes et facettes, et reçoit seule les liens de vue détail (`?detail=<id>`), puisqu'elle seule contient toutes les fiches. Chaque autre vue est une sous-route qui rend la même table sur les mêmes lignes, avec un filtre ou aucun, et ne masque que ce que son filtre rend constant ou vide. Le menu les range en sous-entrées sous l'item actif, vues de travail d'abord et vue complète en dernier ; la première est la vue d'arrivée. L'entrée du menu et le raccourci de l'accueil mènent à la vue d'arrivée par `entryHref()` (`src/config/admin-nav-items.ts`). Dans le code, la valeur de la vue complète ou d'un filtre sans restriction est le littéral `"all"`, jamais `"tous"` ni `"toutes"` : seul le libellé affiché reste en français
- **Options d'une énumération dans un `Select`** : `EnumSelectItems` (`src/components/features/admin/form/`), avec `values`, `labels` et la table `*_ICONS` quand l'énumération en a une (DESIGN.md § Icônes). Jamais une boucle de `SelectItem` écrite à la main : seule la sentinelle « Non renseigné » reste un `SelectItem` posé directement
- **Sentinelle `NONE_VALUE`** : elle n'existe que dans `OptionSelect` et `SingleSelectCombobox`, avec deux exceptions : l'identifiant d'un `CommandItem` cmdk (`LegalEntityCard`, `SingleSelectCombobox`) et le `Select` brut « Entreprise » de la ligne du nouveau contact (`InterviewForm`), gardé brut pour que son placeholder ne soit pas remplacé par « Aucune ». Hors de ces cas, `SelectField`, `OptionSelect`, `CompanyCombobox` et `PersonCombobox` exposent `T | null`, jamais la sentinelle
- **Disposition d'une vue détail (`DetailDialog`)** : `fullWidth: true` seulement sur un texte long ou une liste de fiches rattachées, jamais sur des badges, un lien ou une date ; la grille passe seule à deux colonnes (`TitledBlock`) et un dernier champ impair reste seul à gauche. Blocs dans l'ordre champs courts, Notes, Détails, fiches rattachées. En-tête par données seules (`image` pour un logo ou une couverture, `title`, `subtitle`, `badges` construits par `headerBadge`), jamais de JSX d'écran (DESIGN.md § Overlays, « Vue détail »)
- **Largeur d'une colonne de liste (`DataTable`, `<entité>-table-widths.ts` à côté de sa table, constantes communes dans `src/lib/admin/table-widths.ts`)** : un multiple de 8, au plus juste entre l'en-tête (icône de tri comprise) et le contenu des lignes à 95 %, mesurés sur les vraies données de la vue complète. Une colonne de badges prend son badge le plus large, qui ne se tronque ni ne passe à la ligne ; un texte long garde un plafond et se tronque. Un en-tête de plusieurs mots plus long que son contenu passe sur deux lignes (`wrapHeader`) plutôt que d'élargir la colonne
- **Fiches rattachées** (`RelatedLinksList`) : du plus récent au plus ancien, cinq rangées d'abord puis « Voir plus (N restants) » par cinq. En création, `PendingRelatedCard` : vide, « Après l'enregistrement de … », bouton d'ajout désactivé
