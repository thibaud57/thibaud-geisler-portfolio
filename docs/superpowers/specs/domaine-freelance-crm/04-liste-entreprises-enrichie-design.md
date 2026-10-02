---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "liste-entreprises-enrichie"
goal: "Afficher et filtrer les entreprises selon leurs champs CRM, avec les vues Toutes, Travaillées et Recrutement et une vue détail alignée sur le formulaire."
status: "draft"
complexity: "M"
tdd_scope: "none"
depends_on: ["02-entreprise-enrichie-donnees-design.md", "03-formulaire-entreprise-enrichi-design.md"]
date: "2026-09-26"
---

# Liste des entreprises enrichie

## Scope

Étend la liste des entreprises avec les colonnes Types, Zones, Statut, Travaillée et Notes, les filtres Statut, Types et Zones, trois vues (Toutes, Travaillées, Recrutement) avec leurs colonnes par défaut et une vue détail reprenant les blocs du formulaire. Active Recrutement dans le menu. Exclut l'édition (`03`), l'entité légale (`05`) et le logo (`06`), dont la liste et le détail affichent seulement la valeur, ainsi que la vue Prospects (`08`) et les colonnes Premier contact (`10`) et Clients finaux (`15`), qui rejoindront ces mêmes emplacements quand leurs dérivés existeront.

### État livré

À la fin de ce sub-project, on peut : ouvrir `/admin/entreprises/recrutement` et n'y voir que les entreprises de type ESN / Recrutement ; filtrer la vue Toutes par zone ; cliquer une ligne et lire tous ses champs CRM, bloc par bloc, dans la vue détail.

## Dependencies

- `02-entreprise-enrichie-donnees-design.md` (statut: draft) : champs, libellés et `AdminCompany` avec ses clients finaux
- `03-formulaire-entreprise-enrichi-design.md` (statut: draft) : `AdminCompany` complété de ses champs de relation, notes et Détails, titres des blocs

## Références de design

- **Maquette** : `isCompanies`, `dlgDetail`
- **Design system** : `patterns/DataTable`, `patterns/OptionsPopover`, `patterns/FacetFilter`, `patterns/SearchInput`, `patterns/PaginationFooter`, `patterns/DetailDialog`, `patterns/BadgeList`, `patterns/TruncateTooltip`, `patterns/CompanyLogoTile`, `patterns/EmptyValue`, `patterns/EmptyState`, `patterns/ExternalUrl`, `patterns/RowActionButton`, `core/Badge`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À créer** : `src/components/features/admin/EnumBadge.tsx` (`EnumBadge`, badge avec glyphe)
- **À modifier** : `src/components/features/admin/BadgeList.tsx` (prop `icons` optionnelle, bascule sur `EnumBadge`)
- **À modifier** : `src/components/features/admin/companies/CompaniesTable.tsx` (prop `view`, colonnes, filtres, vue détail réordonnée, glyphes)
- **À modifier** : `src/components/markdown/MarkdownContent.tsx` (prop `variant`, `"admin"` pour les Détails des fiches)
- **À modifier** : `src/lib/admin-table-widths.ts` (largeurs des colonnes, `CompanyView`, colonnes par défaut par vue, largeurs du squelette par vue)
- **À modifier** : `src/server/queries/companies.ts` (`AdminCompany` gagne le dérivé `worked`, calculé dans `toAdminCompany` depuis les `ClientMeta` liés à un projet `CLIENT`)
- **À modifier** : `src/lib/companies.ts` (`COMPANY_FIELD_LABELS.worked`, absent depuis le `02` qui a retiré le champ stocké)
- **À créer** : `src/components/features/admin/companies/CompaniesViewPage.tsx` (coquille commune aux trois pages : titre, sous-titre, bouton de création, squelette et table de la vue)
- **À modifier** : `src/app/admin/(protected)/entreprises/page.tsx` (vue Toutes)
- **À modifier** : `src/app/admin/(protected)/entreprises/travaillees/page.tsx` (vue Travaillées, nouveau sous-titre)
- **À créer** : `src/app/admin/(protected)/entreprises/recrutement/page.tsx` et `loading.tsx`
- **À modifier** : `src/config/admin-nav-items.ts` (lien Recrutement)

## Architecture approach

- **Vues** : même motif que la liste des projets. Un type `CompanyView` (`toutes`, `travaillees`, `recrutement`) ; chaque page passe sa vue à `CompaniesTable`, qui filtre les lignes en mémoire (Travaillées : `worked` ; Recrutement : `types` contient `ESN_RECRUTEMENT`) et reconstruit ses colonnes pour la vue. La prop `workedOnly` et sa présélection de filtre disparaissent. Chaque page garde son `getCurrentUser()` et son `loading.tsx` d'une ligne (`.claude/rules/nextjs/auth.md`)
- **Dérivé travaillée** : `AdminCompany.worked` se calcule dans `toAdminCompany`, la fonction de mapping vers `AdminCompany` (`src/server/queries/companies.ts`), vrai dès que l'entreprise a au moins un `ClientMeta` vers un projet de type `CLIENT`. Un projet `PERSONAL` crée aussi un `ClientMeta` (`src/server/actions/projects.ts`, sans condition de type) et ne doit pas compter ; `_count.clientMetas` reste la source de la colonne Projets, inchangée. Le `15` étendra cette même ligne avec `|| hasAcceptedMission(company)`
- **Pages** :

| Vue | Route | Titre | Sous-titre |
|---|---|---|---|
| Toutes | `/admin/entreprises` | Toutes les entreprises | Clients, intermédiaires et prospects. |
| Travaillées | `/admin/entreprises/travaillees` | Entreprises travaillées | Celles où une mission a été réalisée, en direct ou via une ESN. |
| Recrutement | `/admin/entreprises/recrutement` | Recrutement | ESN et cabinets, avec leur historique de propositions. |

- **Colonnes**, dans l'ordre : Logo, Nom, Types, Secteurs, Zones, Taille, Statut, Travaillée, Entité légale, Site web, Notes, Projets, Actions. Logo, Nom et Actions restent toujours visibles
  - Types, Zones : `BadgeList` (trois badges puis « +N »), Types avec le glyphe `COMPANY_TYPE_ICONS` sur chaque badge
  - Taille : `Badge` `secondary` du nom court de `COMPANY_SIZE_LABELS`, effectif de `COMPANY_SIZE_HEADCOUNTS` en `Tooltip` ; colonne calée sur « Grande entreprise », dans la liste comme dans la vue détail
  - Statut : `EnumBadge` du libellé de `RELATION_STATUS_LABELS` et du glyphe `COMPANY_STATUS_ICONS`
  - Travaillée : « Oui » ou « Non », lu depuis le dérivé
  - Notes : une ligne tronquée, texte entier au survol par `TruncateTooltip`
- **`EnumBadge`** (`src/components/features/admin/EnumBadge.tsx`) : `EnumBadge({ label, icon }: { label: string; icon: IconComponent | null })`, `Badge` `secondary` avec le glyphe en `data-icon="inline-start"` puis le libellé. Créé ici, première liste à badges d'énumération du domaine, réutilisé ensuite par les sub-projects suivants. `BadgeList` gagne une prop `icons?: Partial<Record<string, IconComponent | null>>` : fournie, chaque badge affiché bascule sur `EnumBadge` ; absente, il garde son rendu `Badge` actuel. Fournie pour Types (`COMPANY_TYPE_ICONS`) puis, sans glyphe à ce jour, pour Zones (énumération elle aussi)
- **Colonnes visibles par défaut** (arbitrage « Colonnes par vue ») :

| Vue | Colonnes masquables visibles par défaut |
|---|---|
| Toutes | toutes |
| Travaillées | Types, Secteurs, Zones, Taille, Statut, Projets |
| Recrutement | Types, Zones, Statut, Travaillée |

- **Filtres** : Statut (une valeur), Types et Zones (plusieurs valeurs par ligne, déjà gérées par `Facet.value`, `ZONES` dans l'ordre canonique du `02`). L'ancien filtre « Travaillée » disparaît, la vue Travaillées le remplace
- **Vue détail** (arbitrage « Blocs d'une vue détail ») : en-tête avec le nom, le slug, le nombre de projets en sous-titre et le statut de la relation en badge, avec son glyphe `COMPANY_STATUS_ICONS` ; blocs dans l'ordre des cards du formulaire du `03`, moins le nom déjà porté par l'en-tête : Identité (site web, zones), Classification (types, secteurs), Détails en pleine largeur, rendu par le composant existant `MarkdownContent` en variante `admin`, à l'échelle de l'éditeur (`ADMIN_MARKDOWN_CLASS` du `03`, prop `variant` ajoutée ici) (`src/components/markdown/MarkdownContent.tsx`), Relation (taille, travaillée ; le statut est déjà en tête, arbitrage « sous-titre d'une vue détail »), Logo, Notes (la ligne), Entité légale. Les blocs Notes et Détails disparaissent chacun quand ils sont vides (arbitrage « bloc sans donnée ») ; les listes y montrent tous leurs badges, avec leur glyphe
- **Menu** : la sous-entrée Recrutement du groupe CRM > Entreprises reçoit son `href`, ce qui suffit à l'activer ; Prospects reste sans `href`, le `08` l'activera
- **Squelette de chargement** : largeurs dérivées des colonnes visibles de la vue, comme pour les projets
- **Rules** : `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`

## Acceptance criteria

### Scénario 1 : vue Recrutement
**GIVEN** des entreprises dont certaines ont le type ESN / Recrutement
**WHEN** on ouvre `/admin/entreprises/recrutement` depuis le menu
**THEN** seules ces entreprises s'affichent, avec les colonnes Types, Zones, Statut et Travaillée
**AND** l'entrée Recrutement du menu est active

### Scénario 2 : vue Travaillées
**GIVEN** une entreprise liée à un projet `CLIENT` et une entreprise liée seulement à un projet `PERSONAL`
**WHEN** on ouvre `/admin/entreprises/travaillees`
**THEN** la première apparaît, la seconde non

### Scénario 3 : filtres
**GIVEN** la vue Toutes
**WHEN** on filtre sur la zone Luxembourg
**THEN** seules les entreprises qui ont Luxembourg parmi leurs zones restent, et le compteur de chaque option compte une entreprise à plusieurs zones dans chacune

### Scénario 4 : vue détail
**GIVEN** une ESN avec des zones, une ligne de notes et des détails
**WHEN** on clique sa ligne
**THEN** la vue détail montre les blocs Identité, Classification, Détails, Relation, Logo, Notes et Entité légale, dans cet ordre, la case Travaillée lue depuis le dérivé et le statut de la relation en tête
**AND** pour une entreprise sans notes, le bloc Notes n'apparaît pas ; pour une entreprise sans détails, le bloc Détails n'apparaît pas

## Edge cases

- **Vue sans ligne** : l'état vide générique s'affiche, avec le texte de la base vide propre à la liste des entreprises

## Architectural decisions

### Décision : « travaillée » stockée ou déduite des projets

**Options envisagées :**
- **A. Case stockée** : cochée à la main sur la fiche entreprise, indépendante des projets publiés
- **B. Déduite** : vraie dès qu'un projet `CLIENT` cite l'entreprise, calculée à la lecture dans `toAdminCompany`

**Choix : B**

**Rationale :**
- Révision validée par le propriétaire (brief v2, décision 4) : une entreprise travaillée se déduit, elle ne se stocke pas
- Supprime le risque de divergence entre une case oubliée et les projets réellement liés
- Le filtre par type `CLIENT` exclut les projets `PERSONAL`, qui créent eux aussi un `ClientMeta` (`src/server/actions/projects.ts`) : la société du propriétaire ne doit pas apparaître travaillée
- Le `15` étendra le dérivé aux opportunités `ACCEPTEE` en complétant la même ligne de `toAdminCompany` ; à ce stade, seuls les projets `CLIENT` comptent

### Décision : filtrer une vue ou présélectionner un filtre

**Options envisagées :**
- **A. Présélectionner un filtre** (motif actuel de Travaillées) : l'utilisateur peut le décocher et retomber sur toute la base
- **B. Filtrer la vue** (motif de la liste des projets) : chaque page ne montre que son objet, les filtres affinent à l'intérieur

**Choix : B**

**Rationale :**
- Une page Recrutement qui laisse voir des prospects en décochant un filtre ne tient pas sa promesse
- Même comportement que les vues Client et Perso des projets
