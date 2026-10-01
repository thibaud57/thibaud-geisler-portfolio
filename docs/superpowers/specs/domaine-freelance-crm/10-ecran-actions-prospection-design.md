---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "ecran-actions-prospection"
goal: "Suivre les actions de prospection dans l'espace admin (vues À faire, Connexions, Discussions, Candidatures, Journal, rang des relances, formulaire, « Marquer fait »), montrer leur historique et leurs échéances de conservation côté leads, et le premier contact d'une entreprise."
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: ["09-actions-prospection-donnees-design.md", "08-ecran-leads-design.md", "07-leads-donnees-design.md", "04-liste-entreprises-enrichie-design.md"]
date: "2026-09-29"
---

# Écran des actions de prospection

## Scope

Crée l'écran Actions prospection : cinq vues au menu, liste avec rang « Premier contact / Relance N », recherche, colonnes masquables et filtres (statut, canal, période), bouton « Marquer fait », formulaire en modale avec date et heure, vue détail et suppression. Côté leads : colonne du nombre d'actions, bloc Historique et « Dernier contact de sa part » dans la vue détail, card Actions sur la page du lead (choix de la personne par `findPersonOptions`, `07`), colonne « À conserver jusqu'au » et filtre « échéance dépassée ». Côté entreprises : dérivé `firstContactAt` dans `toAdminCompany` (`04`) et colonne « Premier contact ». Exclut le pipeline (`11`), le calendrier (`12`), toute purge automatique, tout lien d'une action vers une mission (`14`) et la case d'effacement de la confirmation « Ne plus contacter », déjà portée par `OptOutPersonDialog` (`08`).

### État livré

À la fin de ce sub-project, on peut : ouvrir Actions prospection sur « Actions à faire », marquer faite une connexion LinkedIn et la retrouver dans Connexions, créer l'action suivante depuis la card Actions de la page du lead et la voir « Relance 1 », lire les deux dans l'historique du lead ; dans Leads > Tous, faire ressortir un lead à l'échéance dépassée ; ouvrir la fiche de l'entreprise de ce lead et y lire sa date de premier contact.

## Dependencies

- `09-actions-prospection-donnees-design.md` (statut: draft) : modèle, règles de statut, actions (`changeProspectingActionStatus` compris), `erasePersonExchanges` étendue, `lastReplyAt`
- `08-ecran-leads-design.md` (statut: draft) : écran des leads étendu ici (table, vue détail, page du lead)
- `07-leads-donnees-design.md` (statut: draft) : `findPersonOptions()`, `PersonOption`, `personDisplayName` (`@/lib/persons`)
- `04-liste-entreprises-enrichie-design.md` (statut: draft) : `toAdminCompany`, `COMPANY_COLUMN_WIDTHS`, `CompaniesTable`, dérivé `worked`, étendus ici de `firstContactAt`

## Références de design

- **Maquette** : `isActions` (mode table), `dlgActionForm`, `dlgDeleteAction`, `dlgDetail`, `isLeads` (colonne Relances)
- **Design system** : `patterns/DataTable`, `patterns/OptionsPopover`, `patterns/FacetFilter`, `patterns/SearchInput`, `patterns/PaginationFooter`, `patterns/DetailDialog`, `patterns/ConfirmDeleteDialog`, `patterns/TruncateTooltip`, `patterns/RowActionButton`, `patterns/EmptyState`, `patterns/EmptyValue`, `patterns/CompanyLogoTile`, `core/Card`, `core/Dialog`, `core/AlertDialog`, `core/Select`, `core/Combobox`, `core/Calendar`, `core/Popover`, `core/Input`, `core/Textarea`, `core/Checkbox`, `core/Badge`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À créer** : `src/lib/action-views.ts` et `src/lib/action-views.test.ts` (appartenance, tri et titres des vues)
- **À créer** : `src/lib/action-rank.ts` et `src/lib/action-rank.test.ts` (rang « Premier contact / Relance N », par personne)
- **À créer** : `src/lib/person-retention.ts` et `src/lib/person-retention.test.ts` (`RETENTION_YEARS`, `retentionEndOf`, `isRetentionOver`, date « À conserver jusqu'au »)
- **À créer** : `src/app/admin/(protected)/actions-prospection/page.tsx` et `loading.tsx` (À faire), puis `connexions/`, `discussions/`, `candidatures/`, `journal/`, chacun `page.tsx` et `loading.tsx`
- **À créer** : `src/components/features/admin/prospection/ActionsViewPage.tsx`, `ProspectingActionsTable.tsx`, `ProspectingActionFormDialog.tsx`, `DeleteProspectingActionDialog.tsx`, `MarkActionDoneButton.tsx`
- **À modifier** : `src/lib/admin-table-widths.ts` (largeurs des colonnes des actions, colonnes visibles par vue, colonnes ajoutées aux leads et aux entreprises)
- **À modifier** : `src/server/queries/leads.ts` (nombre d'actions de la personne, `createdAt` du rôle)
- **À modifier** : `src/server/queries/prospecting-actions.ts` (actions d'une personne, pour la page de son lead)
- **À modifier** : `src/components/features/admin/leads/LeadsViewPage.tsx`, `LeadsTable.tsx`, `DeleteLeadDialog.tsx`
- **À créer** : `src/components/features/admin/leads/LeadActionsCard.tsx`
- **À modifier** : `src/app/admin/(protected)/leads/[id]/page.tsx` (card Actions sous le formulaire)
- **À modifier** : `src/config/admin-nav-items.ts` (entrée Actions prospection et ses cinq sous-entrées)
- **À créer** : `src/lib/company-first-contact.ts` et `src/lib/company-first-contact.test.ts` (plus ancienne action envoyée des personnes d'une entreprise)
- **À modifier** : `src/server/queries/companies.ts` (dérivé `firstContactAt` dans `toAdminCompany`, `04`)
- **À modifier** : `src/lib/companies.ts` (`COMPANY_FIELD_LABELS.firstContactAt`)
- **À modifier** : `src/components/features/admin/companies/CompaniesTable.tsx` (colonne et ligne de détail « Premier contact »)

## Architecture approach

- **Vues** (`src/lib/action-views.ts`, fonctions pures, motif des vues de leads du `08`) : chaque page passe sa vue à `ProspectingActionsTable`, qui filtre en mémoire les actions de `findAllProspectingActionsForAdmin` et fournit l'ordre par défaut

| Vue | Route | Titre (maquette) | Actions | Tri par défaut |
|---|---|---|---|---|
| À faire | `/admin/actions-prospection` | Actions à faire | statut À faire | date croissante |
| Connexions | `/admin/actions-prospection/connexions` | Connexions | Connexion LinkedIn, statut Fait | date croissante |
| Discussions | `/admin/actions-prospection/discussions` | Discussions | DM LinkedIn, Email ou SMS/WhatsApp, statut Fait | date croissante |
| Candidatures | `/admin/actions-prospection/candidatures` | Candidatures | Candidature, statut Fait | date croissante |
| Journal | `/admin/actions-prospection/journal` | Journal des actions | toutes | À faire d'abord, puis date décroissante |

  Sous-titres : ceux de la maquette (`actViewHint`). Les entrées Pipeline (`11`) et Calendrier (`12`) s'ajouteront au même menu
- **Rang** (`src/lib/action-rank.ts`, fonction pure) : pour chaque personne, une action est « Premier contact » si aucune action déjà envoyée (tout statut sauf À faire) de la même personne ne la précède, sinon « Relance N », N étant le nombre de ces actions antérieures ; règle Notion (« une relance se reconnaît par chronologie »), absente de la maquette, ajoutée par décision du propriétaire. Calculé sur toutes les actions, quelle que soit la vue
- **Liste** (`DataTable`) : recherche sur le titre et le nom de la personne. Colonnes : Action (toujours affichée), Rang, Canal (`Badge` `secondary`), Statut (`Badge` `secondary`), Date et heure (triable), Personne (tuile `CompanyLogoTile` de son entreprise et nom, `personDisplayName`, `07`), Actions de ligne. Colonnes visibles par défaut : celles de la maquette (`ACT_VIEW_COLS`) plus Rang ; Journal les montre toutes
- **Filtres** : Statut, Canal et Période (« 7 jours », « 30 jours » autour d'aujourd'hui, passés ou à venir, comme la maquette)
- **« Marquer fait »** (`MarkActionDoneButton`) : bouton de ligne sur une action À faire, appelle `changeProspectingActionStatus(id, "FAIT")` (`09`), dont les règles posent l'heure réelle d'envoi ; toast de confirmation
- **Formulaire** (`ProspectingActionFormDialog`, `Dialog` à 640 px, saisie courte en modale selon l'arbitrage « Page ou modale d'édition » de DESIGN.md) : ouvert depuis l'écran des actions ou depuis la card Actions de la page d'un lead, sa personne alors déjà choisie. Action, Personne (combobox des personnes non opposées, `findPersonOptions`, `07`, avec leur entreprise), Canal, Statut, Date (`Calendar` en français) et heure (`Input` `type="time"`), « Réponse reçue le » (date et heure) affiché quand le statut est Répondu ou Converti, Message (`Textarea`, texte simple : le texte exact envoyé, pas une fiche mise en forme). Une nouvelle action s'ouvre à la date et l'heure courantes. Les champs cachés envoient des instants ISO complets, calculés dans le fuseau du navigateur (`09`)
- **Vue détail** (`DetailDialog`) : titre de l'action, rang et personne en sous-titre, statut en badge ; blocs Action (Canal, Date et heure, Réponse reçue le), Message (retours à la ligne conservés), bloc sans donnée retiré ; « Modifier » ouvre la modale
- **Suppression** (`DeleteProspectingActionDialog`) : « Supprimer « <titre> » ? » et « Elle disparaît du journal et de l'historique du lead. Une action sans réponse se garde plutôt avec le statut « Ignoré ». »
- **Côté leads** (écran du `08`) :
  - colonne « Actions » : le nombre d'actions de la personne (`AdminLead.actionsCount`, en-tête « Relances » dans la maquette : le nombre comprend le premier contact, d'où le libellé), triable
  - colonne « À conserver jusqu'au » (`src/lib/person-retention.ts`, `retentionEndOf`) : personne active, 3 ans après la plus tardive entre la date de création de son rôle Lead (`AdminLead.createdAt`) et sa dernière réponse (`lastReplyAt`) ; personne opposée, 3 ans après `optedOutAt` (liste d'opposition, `01`). Visible par défaut dans Tous seulement, filtre « Échéance » (option « Dépassée ») dans toutes les vues. Purge à la main, aucun automatisme
  - vue détail : ligne « Dernier contact de sa part » (`lastReplyAt`) dans le bloc Pipeline, et bloc « Historique » en pleine largeur, pour une personne active comme pour une personne opposée : ses actions par date croissante, chacune en une ligne (date et heure, rang, canal, statut, titre) ; le bloc Entretiens s'y ajoutera au `17`
  - page du lead (`08`) : card Actions sous le formulaire (arbitrage « Élément rattaché à une fiche »), ses actions par date croissante avec leur rang, chacune avec Modifier et Supprimer, et un bouton « Nouvelle action » (sa personne déjà choisie) ; la card reste affichée sans action, avec « Aucune action pour ce lead. »
- **Premier contact des entreprises** (`src/lib/company-first-contact.ts`, fonction pure testée, appelée par `toAdminCompany`, `04`, `src/server/queries/companies.ts`) : `firstContactAt` est la plus ancienne `occurredAt` des actions hors À faire des personnes de l'entreprise (`persons.prospectingActions`, sélection minimale ajoutée à l'`include` du `08`) ; colonne « Premier contact » dans `CompaniesTable` (largeur dans `COMPANY_COLUMN_WIDTHS`), visible par défaut dans Toutes (arbitrage « Colonnes par vue »), Recrutement et Prospects, masquée par défaut dans Travaillées ; ligne « Premier contact » dans le bloc Relation de la vue détail, à côté de Travaillée
- **Lectures** : la page lit une fois toutes les actions et les regroupe par personne pour l'historique ; `findAllLeadsForAdmin` gagne le nombre d'actions de la personne ; `findPersonOptions()` (`07`, personnes non opposées) sert le formulaire. Sans `'use cache'`, comme les autres lectures admin
- **Menu** : l'entrée Actions prospection reçoit son `href` et ses cinq sous-entrées, dans l'ordre des vues
- **Rules** : `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : À faire et « Marquer fait »
**GIVEN** une connexion LinkedIn À faire planifiée hier
**WHEN** on ouvre Actions prospection et clique « Marquer fait » sur sa ligne
**THEN** elle quitte À faire, apparaît dans Connexions avec l'heure du clic, et le toast le confirme

### Scénario 2 : rang des relances
**GIVEN** un lead dont la connexion est Fait
**WHEN** on crée une action DM LinkedIn sur ce lead
**THEN** la nouvelle action s'affiche « Relance 1 », la connexion « Premier contact »

### Scénario 3 : formulaire
**GIVEN** le formulaire « Nouvelle action »
**WHEN** on passe le statut à Répondu
**THEN** le champ « Réponse reçue le » apparaît ; laissé vide, l'action enregistrée reçoit l'heure courante comme date de réponse

### Scénario 4 : historique du lead
**GIVEN** un lead avec trois actions dont une répondue
**WHEN** on ouvre sa vue détail
**THEN** le bloc Historique liste les trois actions par date avec leur rang, et « Dernier contact de sa part » donne la date de la réponse

### Scénario 5 : échéance de conservation
**GIVEN** un lead créé il y a plus de 3 ans, sans réponse depuis, et un lead opposé il y a plus de 3 ans
**WHEN** on ouvre Leads > Tous et filtre sur « Échéance : Dépassée »
**THEN** les deux ressortent, avec leur date « À conserver jusqu'au » passée

### Scénario 6 : premier contact d'une entreprise
**GIVEN** une entreprise avec deux personnes, l'une ayant une action Fait la semaine dernière, l'autre une seule action À faire demain
**WHEN** on ouvre sa fiche
**THEN** « Premier contact » affiche la date de l'action Fait, jamais celle de l'action encore À faire

## Tests à écrire

### Unit
- `src/lib/action-views.test.ts` :
  - keeps only to-do actions in the to-do view, soonest first
  - keeps only sent LinkedIn connections in the connections view
  - keeps sent LinkedIn messages, emails and texts in the discussions view
  - puts to-do actions first in the journal, then the most recent
- `src/lib/action-rank.test.ts` :
  - ranks a person's first sent action as the first contact
  - counts only earlier sent actions of the same person
  - ranks a planned action after the actions already sent before its date
  - keeps a stable rank for two actions at the same time
- `src/lib/person-retention.test.ts` :
  - keeps an active person three years after its creation when it never replied
  - keeps an active person three years after its creation when its reply predates it
  - keeps an active person three years after its last reply
  - keeps an opted-out person three years after the stop
- `src/lib/company-first-contact.test.ts` :
  - keeps the earliest sent action across the company's persons
  - ignores to-do actions
  - returns null when no action was ever sent

## Edge cases

- **Deux actions à la même heure** sur une personne : l'ordre de création les départage, le rang reste stable
- **Action d'une personne opposée** : visible dans le Journal et l'historique du lead, la personne ne figurant plus parmi les choix du formulaire (`findPersonOptions`, `07`)
- **Personne opposée dont les actions sont gardées** (opposition simple, sans effacement demandé) : son historique reste lisible dans la vue détail de son lead
- **Heure changée d'heure d'été** : l'instant envoyé porte son décalage, l'heure affichée reste celle saisie
- **Entreprise sans aucune action envoyée** : « Premier contact » vide (`EmptyValue`), colonne et ligne de détail comprises

## Architectural decisions

### Décision : rang des relances

**Options envisagées :**
- **A. Champ stocké** (« Relance 2 » saisi) : lisible sans calcul, mais faux dès qu'une action est ajoutée, supprimée ou redatée
- **B. Calculé** d'après la chronologie des actions envoyées du lead

**Choix : B**

**Rationale :**
- Règle Notion (« pas de champ dédié, une relance se reconnaît par chronologie ») et toujours juste

### Décision : « Marquer fait » en un clic

**Options envisagées :**
- **A. Passer par le formulaire** : un seul chemin d'écriture, mais une modale à chaque envoi
- **B. Bouton de ligne** qui change le statut seul, sous les règles de date du `09`

**Choix : B**

**Rationale :**
- Le passage de À faire à Fait est le geste le plus fréquent de la journée de prospection
- Les règles de date restent au même endroit (`changeProspectingActionStatus`)
