---
feature: "Feature 2 : Domaine freelance CRM"
subproject: "alignement-regles-crm"
goal: "Aligner le CRM sur les règles de prospection : statut Refusé et statuts permis par canal, opposition qui clôt les actions, huit compteurs de revue, RDV planifié et dernier contact déduits du journal, statut Dormante d'une entreprise déduit."
status: "implemented"
complexity: "XL"
tdd_scope: "partial"
execution: "subagent-driven"
model: "opus"
effort: "high"
depends_on: ["02-entreprise-enrichie-donnees-design.md", "03-formulaire-entreprise-enrichi-design.md", "04-liste-entreprises-enrichie-design.md", "07-leads-donnees-design.md", "08-ecran-leads-design.md", "09-actions-prospection-donnees-design.md", "10-ecran-actions-prospection-design.md", "11-pipeline-actions-kanban-design.md", "12-calendrier-actions-design.md", "14-opportunites-donnees-design.md", "16-entretiens-donnees-design.md", "18-revues-hebdo-design.md", "21-reponse-action-design.md"]
date: "2026-11-18"
---

# Alignement du CRM sur les règles de prospection

## Scope

Aligne le CRM sur les règles de prospection en trois volets : actions et revue (statut Refusé, statuts permis par canal, call sans réponse et daté au jour du RDV, Ignoré réservé à un envoi ou à un call non tenu, opposition qui clôt les actions de la personne, revue à huit compteurs et taux de réponse corrigé) ; leads (RDV planifié déduit aussi d'un call à venir, dernier contact déduit du journal, pipeline et leads actifs nommés distinctement) ; entreprises (Dormante déduite de douze mois sans interaction, statut saisi réduit à Active et Archivée). Exclut tout statut du lead écrit par l'app (les bumps restent un jugement des agents), les commandes des agents (hors dépôt), le tri manuel des anciennes actions Ignoré jamais envoyées et des refus enregistrés en Répondu (aucun critère fiable), les revues déjà enregistrées (compteurs figés, `18`) et le site public, qui ne lit aucune de ces données.

### État livré

À la fin de ce sub-project, on peut : glisser un DM Fait dans la colonne Refusé du pipeline et lire ce refus dans « Refus reçus » de la revue de la semaine ; voir refusé le glisser d'un DM À faire vers Ignoré mais accepté celui d'un call planifié non tenu ; planifier un call sur un lead Nouveau et le voir « RDV planifié » ; marquer ce call Fait et lire son jour dans « Dernier contact de sa part » et dans « Entretiens » ; poser une opposition et constater que les actions À faire de la personne ont disparu et que son message en attente est Refusé ; ouvrir la liste des entreprises et voir Dormante sur une entreprise Active sans interaction depuis plus de douze mois.

## Dependencies

- `02-entreprise-enrichie-donnees-design.md` (statut: implemented) : `RelationStatus` et propriétés dérivées d'`AdminCompany`
- `03-formulaire-entreprise-enrichi-design.md` (statut: implemented) : `CompanyRelationCard` et ses statuts saisissables
- `04-liste-entreprises-enrichie-design.md` (statut: implemented) : colonne, facette et badge du statut ; précédent de « travaillée » déduite
- `07-leads-donnees-design.md` (statut: implemented) : modèle Lead, statut affiché, opposition
- `08-ecran-leads-design.md` (statut: implemented) : vues des leads et entreprise prospect, inchangées
- `09-actions-prospection-donnees-design.md` (statut: implemented) : modèle `ProspectingAction`, `applyStatusRules`, schéma Zod et domaine des actions
- `10-ecran-actions-prospection-design.md` (statut: implemented) : formulaire, vue détail, suppression d'une action et échéance de conservation
- `11-pipeline-actions-kanban-design.md` (statut: implemented) : colonnes du pipeline et `changeProspectingActionStatus`
- `12-calendrier-actions-design.md` (statut: implemented) : couleur d'une action par statut
- `14-opportunites-donnees-design.md` (statut: implemented) : mission acceptée, `startMonth` et `durationMonths`
- `16-entretiens-donnees-design.md` (statut: implemented) : entretiens, RDV planifié déduit d'un entretien
- `18-revues-hebdo-design.md` (statut: implemented) : modèle WeeklyReview, compteurs et taux
- `21-reponse-action-design.md` (statut: implemented) : texte de la réponse, qui suit la date de réponse

## Références de design

- **Maquette** : `isActions` (mode table, mode Kanban `actBoardColumns`, mode Calendrier `actEvents`), `dlgActionForm`, `dlgDeleteAction`, `isRevue` (colonnes `REV_COLUMNS`), `dlgReviewForm`, `isLeads`, `isCompanies`, `isCompanyForm` (`CompanyRelationCard`), `dlgDetail`. La maquette n'a ni colonne Refusé, ni compteur Refus reçus, ni ligne « Dernière interaction » : ajouts par décision du propriétaire, glyphe et couleur de Refusé tranchés par arbitrage visuel
- **Design system** : `post-mvp/kanban/Kanban`, `post-mvp/calendar/EventCalendar`, `patterns/DataTable`, `patterns/FacetFilter`, `patterns/DetailDialog`, `patterns/ConfirmDeleteDialog`, `patterns/EmptyValue`, `core/AlertDialog`, `core/Select`, `core/Input`, `core/Badge`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À modifier** : `prisma/schema.prisma` (valeur `REFUSE` avant `IGNORE`, `WeeklyReview.refusalsReceived` après `conversationsEngaged`, `RelationStatus` réduit à `ACTIVE` et `ARCHIVEE`, commentaires de `reply` et `respondedAt`)
- **À créer** : `prisma/migrations/<horodatage>_action_status_refuse/migration.sql` (ajout de la valeur seule)
- **À créer** : `prisma/migrations/<horodatage>_action_rules_and_refusals/migration.sql` (colonne `refusalsReceived`, rattrapage des calls et des connexions)
- **À créer** : `prisma/migrations/<horodatage>_relation_status_dormancy_derived/migration.sql` (Dormante saisie repassée Active, enum recréé)
- **À modifier** : `src/lib/crm/prospecting-action-status.ts` et `src/lib/crm/prospecting-action-status.test.ts` (statuts de réponse et engagés, statuts permis par canal, transitions, jour d'un call, contact établi)
- **À modifier** : `src/lib/crm/prospecting-actions.ts` (libellé et glyphe de Refusé)
- **À modifier** : `src/lib/crm/action-board.ts` et `src/lib/crm/action-board.test.ts` (colonne Refusé avant Ignoré)
- **À modifier** : `src/lib/crm/action-calendar.ts` (couleur de Refusé)
- **À modifier** : `src/lib/crm/action-views.ts` (sous-titres Connexions et Candidatures sans consigne de délai)
- **À modifier** : `src/lib/crm/company-first-contact.ts` et `src/lib/crm/company-first-contact.test.ts` (un call non tenu n'est pas un contact)
- **À modifier** : `src/lib/schemas/prospecting-action.ts` (statuts permis par canal)
- **À modifier** : `src/server/crm/prospecting-actions.ts` et `src/server/crm/prospecting-actions.integration.test.ts` (contrôles sur le canal et le statut enregistrés, nouvelles erreurs du domaine)
- **À modifier** : `src/server/actions/prospecting-actions.ts`, `src/server/actions/prospecting-actions.test.ts` et `src/server/actions/prospecting-actions.integration.test.ts` (changement de statut par le domaine, erreurs du domaine rendues au pipeline)
- **À modifier** : `src/server/actions/persons.ts` et `src/server/actions/persons.integration.test.ts` (l'opposition supprime les actions À faire et passe Refusé l'action en attente)
- **À modifier** : `src/server/actions/interviews.ts` (commentaire sur le RDV planifié et le pipeline)
- **À modifier** : `src/server/mcp/crm/entities/prospecting-action.ts` (descriptions du canal, du statut, de la date et du texte de réponse, règle de saisie d'un RDV, messages des nouvelles erreurs)
- **À modifier** : `src/server/mcp/crm/entities/interview.ts` (règle de saisie d'un RDV dans les descriptions)
- **À modifier** : `src/components/features/admin/prospecting-actions/ActionsBoard.tsx` (classe d'icône de la colonne Refusé)
- **À modifier** : `src/components/features/admin/prospecting-actions/ProspectingActionFormDialog.tsx` (statuts filtrés par canal, date et texte de réponse masqués pour un call)
- **À modifier** : `src/components/features/admin/prospecting-actions/action-detail.tsx` (réponse masquée pour un call)
- **À modifier** : `src/components/features/admin/prospecting-actions/DeleteProspectingActionDialog.tsx` (texte : une action jamais envoyée se supprime)
- **À modifier** : `src/components/features/admin/persons/OptOutPersonDialog.tsx` (texte : actions À faire supprimées, message en attente passé Refusé)
- **À modifier** : `src/lib/crm/review-counters.ts` et `src/lib/crm/review-counters.test.ts` (refus, RDV décrochés, entretiens tenus, `ACTIVE_LEAD_STATUSES`, calls planifiés des leads)
- **À modifier** : `src/lib/crm/weekly-reviews.ts` et `src/lib/crm/weekly-reviews.test.ts` (huitième clé, libellé, taux de réponse)
- **À modifier** : `src/lib/schemas/weekly-review.ts` (compteur `refusalsReceived`)
- **À modifier** : `src/server/queries/weekly-reviews.ts` (colonne dans `weeklyReviewRowSelect`, calls planifiés des leads, commentaire)
- **À modifier** : `src/server/crm/weekly-reviews.ts` (passe `now` à `findWeekCounterSources`)
- **À modifier** : `src/server/crm/weekly-reviews.integration.test.ts` et `src/server/actions/weekly-reviews.test.ts` (huit compteurs)
- **À modifier** : `src/server/mcp/crm/entities/weekly-review.ts` (compteur, définitions, « eight counters »)
- **À modifier** : `src/testing/prisma.ts` (`CLOSED_WEEK_COUNTS` et `seedClosedWeek` avec un refus, une candidature convertie et un call tenu)
- **À modifier** : `src/components/features/admin/weekly-reviews/ReviewsTable.tsx` et `src/components/features/admin/weekly-reviews/review-table-widths.ts` (colonne Refus reçus)
- **À modifier** : `src/components/features/admin/weekly-reviews/ReviewFormDialog.tsx` (disposition à huit compteurs, vérifiée au rendu)
- **À modifier** : `src/lib/crm/lead-display-status.ts` et `src/lib/crm/lead-display-status.test.ts` (calls planifiés dans `LeadStatusSource`, commentaire)
- **À modifier** : `src/lib/crm/lead-views.ts` et `src/lib/crm/lead-views.test.ts` (`PIPELINE_STATUSES`, `isInPipeline`)
- **À créer** : `src/lib/crm/person-last-contact.ts` et `src/lib/crm/person-last-contact.test.ts` (dernier contact déduit du journal)
- **À modifier** : `src/lib/crm/person-retention.ts` et `src/lib/crm/person-retention.test.ts` (`lastContactAt`)
- **À modifier** : `src/lib/crm/leads.ts` (clé `lastContactAt` de `LEAD_FIELD_LABELS`, libellé inchangé)
- **À modifier** : `src/server/queries/leads.ts` (actions lues pour le dernier contact et les calls planifiés, `toAdminLead(row, now)`, `lastContactAt`)
- **À modifier** : `src/server/mcp/crm/entities/lead.ts` (`lastContactAt` au jour, calls planifiés non exposés)
- **À modifier** : `src/components/features/admin/leads/LeadsTable.tsx` (`PIPELINE_STATUSES`, échéance)
- **À modifier** : `src/components/features/admin/leads/lead-detail.tsx` (`lastContactAt`)
- **À créer** : `src/lib/crm/company-relation-status.ts` et `src/lib/crm/company-relation-status.test.ts` (dernière interaction, statut affiché, liste des statuts affichés, seuil de douze mois)
- **À modifier** : `src/lib/crm/companies.ts` (libellés et glyphes indexés par le statut affiché, libellé « Dernière interaction »)
- **À modifier** : `src/server/queries/companies.ts` (sources de la dernière interaction, calls planifiés des leads rattachés, `lastInteractionAt` et `displayRelationStatus`, lecture et filtre de `crm_fetch` et `crm_query`)
- **À modifier** : `src/components/features/admin/companies/CompaniesTable.tsx` (colonne et facette sur le statut affiché)
- **À modifier** : `src/components/features/admin/companies/company-detail.tsx` (badge sur le statut affiché, ligne « Dernière interaction »)
- **À modifier** : `src/components/features/admin/companies/CompanyRelationCard.tsx` et `src/components/features/admin/companies/CompanyForm.tsx` (statuts saisissables)
- **À modifier** : `src/server/mcp/crm/entities/company.ts` (champ saisi Active ou Archivée, filtre et sortie sur le statut affiché, `lastInteractionAt`)
- **À modifier** : `src/server/crm/companies.integration.test.ts`, `src/server/actions/companies.test.ts` et `src/server/queries/projects.integration.test.ts` (plus de Dormante saisie)
- **À modifier** : `src/server/mcp/crm/tools-list.snapshot.json` et `src/server/mcp/crm/tools.integration.test.ts` (contrat régénéré, statuts interdits, `lastContactAt`, `lastInteractionAt`, filtre Dormante)
- **À modifier** : `docs/DESIGN.md` (couleur et glyphe de Refusé, sixième colonne du Kanban)
- **À modifier** : `docs/registre-traitements.md` (Traitement 7, Conservation : ce qui fait un dernier contact émanant de la personne)
- **À modifier** : `docs/BRAINSTORM.md` (statut Dormante parmi les propriétés déduites de la fiche entreprise)
- **À modifier** : `.claude/skills/verify/SKILL.md` (recette mise à jour par `/verify` : huit compteurs, statuts par canal, rattrapage des migrations sur un état ancien)

## Architecture approach

### Actions de prospection

- **Statuts par canal** (`src/lib/crm/prospecting-action-status.ts`, fonctions pures) : `RESPONSE_STATUSES` (Répondu, Converti, Refusé) portent une date et un texte de réponse ; `ENGAGED_STATUSES` (Répondu, Converti) font une conversation ; `ALLOWED_STATUSES: Record<ActionChannel, readonly ActionStatus[]>` retire Converti et Refusé à une connexion LinkedIn, Répondu et Refusé à un call, les autres canaux gardant tous les statuts ; `isStatusAllowed(channel, status)` les lit. Le canal Autre garde tous les statuts mais n'entre dans aucun compteur de la revue. `hasResponseDate(channel, status)` vaut vrai pour un statut de réponse hors call : un call n'attend pas de réponse. `isRepliedStatus` disparaît, remplacé par ces fonctions dans chacun de ses usages
- **Transitions** : `isTransitionAllowed(channel, from, to)` refuse À faire vers Ignoré, sauf pour un call : un call planifié qui n'a pas eu lieu (pas décroché, annulé, manqué) passe directement Ignoré. Créer une action directement Ignorée reste permis, pour journaliser après coup un envoi resté sans réponse
- **Contact établi** : `isContactMade(channel, status)` vaut vrai pour une action sortie d'À faire, sauf un call Ignoré, qui n'a pas eu lieu. Le premier contact (`firstContactAtOf`) et la dernière interaction d'une entreprise le lisent ; les compteurs d'envoi gardent `isSentStatus` (un message Refusé ou Ignoré est un message envoyé)
- **Règle de statut** (`applyStatusRules`, `09`, `21`) : `ActionTiming` gagne `channel`. La date et le texte de réponse ne sont gardés que si `hasResponseDate`, sinon ils deviennent `null`. Un call qui quitte À faire garde son jour planifié, jour du RDV, au lieu de prendre l'heure du changement : un call noté Fait le lundi pour un RDV tenu le vendredi reste compté le vendredi. Le reste ne change pas : passer de Répondu à Converti garde la date déjà posée, une date non saisie vaut aujourd'hui, un message qui quitte À faire prend l'heure de l'envoi réel, un changement de jour dans le même patch garde la saisie
- **Domaine** (`src/server/crm/prospecting-actions.ts`, `.claude/rules/nextjs/server-actions.md`) : `createProspectingAction` contrôle le couple canal et statut soumis ; `updateProspectingAction` lit le canal et le statut enregistrés (`TIMING_SELECT` gagne `channel`), contrôle le couple effectif après le patch (un patch MCP peut ne porter que le canal ou que le statut) puis la transition. Deux erreurs rejoignent `ProspectingActionWriteError` : `status_not_allowed` (« Statut impossible pour ce type d'action ») et `unsent_action_ignored` (« Une action jamais envoyée se supprime au lieu d'être ignorée ») ; les `switch` exhaustifs de `mapDomainError` et du MCP les traitent. `crm_create` et `crm_update` passent par ces fonctions : leurs schémas MCP ne portent pas le contrôle croisé (`.claude/rules/modelcontextprotocol-server/input-schema.md`)
- **Pipeline** : `changeProspectingActionStatus` délègue à `updateProspectingAction(id, { status })` au lieu d'appliquer `applyStatusRules` dans sa propre transaction : les règles, la garde d'opposition et le rôle Lead n'ont qu'un seul point d'entrée. Toute erreur du domaine revient en `errors.status`, seule forme lue par `ActionsBoard` (toast puis resynchronisation des colonnes) : `status_not_allowed` et `unsent_action_ignored` par leur message, `person_conflict` par `personConflictMessage`, `not_found` par le message d'action supprimée avec `revalidatePersonLists`. Les événements de log `prospecting_action:status_*` sont gardés
- **Validation du formulaire** (`.claude/rules/zod/schemas.md`) : `prospectingActionSchema` contrôle le couple canal et statut par `superRefine`, issue posée sur `["status"]` pour que le formulaire l'affiche sous le Statut ; `prospectingActionSchema.shape.status`, lu par le pipeline, reste disponible
- **Formulaire** (`ProspectingActionFormDialog`) : `SelectField` du Statut reçoit `options={ALLOWED_STATUSES[channel]}` ; changer de Type vers un canal qui interdit le statut choisi le ramène à Fait, statut permis partout. « Réponse reçue le » et Réponse ne s'affichent que si `hasResponseDate(channel, status)`
- **Vue détail** (`buildActionDetail`) : la ligne de date de réponse et le bloc Réponse sont omis pour un call
- **Suppression** : la fenêtre dit qu'une action envoyée restée sans réponse se garde en Ignoré comme un call non tenu ; une action jamais envoyée se supprime. Le MCP reste sans suppression (`.claude/rules/modelcontextprotocol-server/tools.md`) : un agent signale l'action jamais envoyée, le propriétaire la supprime dans l'admin
- **Opposition** (`optOutPerson`, `07`) : dans sa transaction, avant de poser `optedOutAt`, elle supprime les actions À faire de la personne et passe Refusé, datée du jour, la plus récente de ses actions Fait sur un canal message ou candidature, s'il y en a une ; une connexion ou un call ne change pas. Une opposition reçue sur un message reste un refus compté dans Refus reçus, une candidature refusée n'entre dans aucun compteur ; une fois posée, les actions de la personne restent verrouillées (`assertProspectionAllowed`). La fenêtre `OptOutPersonDialog` annonce ces deux effets
- **Sous-titres des vues** (`action-views.ts`) : Connexions et Candidatures perdent leur consigne de délai, fausse pour une connexion (sans acceptation à J+14, le lead passe Perdu, pas Stand-by) ; les délais et les bumps relèvent des agents, l'écran ne les recopie pas
- **Glyphe et couleur de Refusé** : tranchés par arbitrage visuel du propriétaire avant l'écran, puis écrits dans `docs/DESIGN.md` § Palette de Couleurs ; `ACTION_STATUS_ICONS`, `COLUMN_ICON_CLASSES` et `STATUS_COLORS` les lisent. Refusé n'est pas mis en avant dans les fiches rattachées (`toActionLink`), comme Ignoré
- **Saisie d'un RDV** : un RDV lié à une opportunité est un entretien ; un call hors opportunité (qualification, discovery, réseau) est une action Call ; un call qui fait naître une opportunité passe Converti et la suite se tient en entretiens. Écrite dans les descriptions MCP de l'action (`prospecting-action.ts`) et de l'entretien (`interview.ts`), la règle évite tout double comptage

### Revue hebdo

- **Compteurs** (`countWeek`, fonction pure, `18`) : une réponse se date à `respondedAt`, un envoi et un call à `occurredAt`, un entretien à `scheduledAt`. Connexions envoyées et Messages envoyés : connexions et messages sortis d'À faire, Refusé et Ignoré compris ; Connexions acceptées : connexions Répondu ; Conversations engagées : messages Répondu ou Converti ; Refus reçus : messages Refusé ; RDV décrochés : messages et candidatures Convertis ; Entretiens : entretiens Faits et calls Faits ou Convertis
- **Taux** (`reviewRates`) : taux de réponse = (conversations + refus) / messages envoyés, toute réponse comptée ; la conversion RDV peut dépasser 100 % une semaine où un RDV vient d'une candidature. Libellé « Refus reçus » dans `REVIEW_FIELD_LABELS`
- **Sources** : `findWeekCounterSources(bounds, now)` charge déjà les deux dates des actions ; il lit en plus les calls planifiés des leads pour le compteur Leads actifs (volet Leads). `computeWeekCounts` lui passe `now`
- **Écrans** : colonne Refus reçus après Conversations engagées, largeur multiple de 8 mesurée (`.claude/rules/shadcn-ui/admin.md`) ; le formulaire passe à huit compteurs et les taux prennent toute la largeur après les compteurs, sous leur libellé commun, en trois cases en lecture seule (une par taux), choix du propriétaire par arbitrage visuel
- **MCP** : descriptions des compteurs (définitions, « eight counters »)

### Leads

- **RDV planifié** (`leadDisplayStatus`, fonction pure, `16`) : `LeadStatusSource` gagne `plannedCalls: readonly { occurredAt: Date }[]`, champ requis pour que le typage signale chaque source oubliée. Un call À faire est à venir si `occurredAt >= zonedDayStartOf(now)` (`src/lib/date-time.ts`) : il se date au jour (minuit à Paris) et reste à venir toute la journée prévue, alors qu'un entretien se compare à son heure. L'ordre ne change pas : opposition, puis Deal, puis RDV planifié (entretien ou call), puis statut saisi. Un call dont le jour est passé sans mise à jour n'affiche plus RDV planifié et reste listé dans la vue À faire des actions
- **Chargement des calls planifiés** (`.claude/rules/nextjs/data-fetching.md`) : chaque requête élargit sa sélection `prospectingActions` existante (une relation ne se sélectionne qu'une fois) par un `OR` qui ajoute les calls À faire datés de `zonedDayStartOf(now)` ou plus tard, puis classe les lignes en mémoire. `findWeekCounterSources`, qui ne lisait aucune action des leads, gagne cette seule sélection. `leadDisplayStatus` refait le tri avec son propre `now` : la liste des leads le calcule côté client
- **Pipeline et leads actifs** : `IN_PROGRESS` devient `PIPELINE_STATUSES` et `isActiveLead` devient `isInPipeline` (`lead-views.ts`), pour les vues En cours et Chauds et l'entreprise prospect, Nouveau compris (`08`) ; `ACTIVE` devient `ACTIVE_LEAD_STATUSES` dans `review-counters.ts` (Suspect, Discussion, RDV planifié), définition du KPI Leads actifs. Les libellés et sous-titres des vues ne changent pas
- **Dernier contact** (`src/lib/crm/person-last-contact.ts`, fonction pure) : `lastContactAtOf(actions, interviews, now)` rend la plus tardive des dates qui viennent de la personne, aucune n'étant retenue si elle est dans le futur : `respondedAt` de ses actions (réponses, refus, connexions acceptées), `occurredAt` de ses calls Faits ou Convertis, `scheduledAt` de ses entretiens Faits dont elle est correspondante ; `null` sans aucune. Les messages envoyés restés sans réponse n'y entrent pas. `lastReplyAt` devient `lastContactAt` dans `AdminLead`, `RetentionPerson` et la sortie MCP ; le libellé reste « Dernier contact de sa part »
- **Requête des leads** (`src/server/queries/leads.ts`) : la sélection `prospectingActions` lit les actions qui ont une date de réponse, les calls Faits ou Convertis et les calls planifiés (`channel`, `status`, `occurredAt`, `respondedAt`), sans limite ; `person.interviews` porte déjà statut et date. `toAdminLead` reçoit `now`, passé par `findAllLeadsForAdmin` et `findLeadByIdForAdmin`
- **Conservation** (`person-retention.ts`, registre, Traitement 7) : `retentionEndOf` lit `lastContactAt`, sans autre changement (une activité antérieure à la création, venue d'une reprise, ne compte pas). Le registre précise que le dernier contact émanant de la personne est une réponse, un call ou un entretien qu'elle a tenu
- **MCP** : `crm_fetch` d'un lead rend `lastContactAt` au jour de Paris (`ZONED_DAY`) et retire `plannedCalls` de sa sortie, comme `interviews`

### Entreprises

- **Statut affiché** (`src/lib/crm/company-relation-status.ts`, fonctions pures) : `CompanyRelationDisplayStatus = RelationStatus | "DORMANTE"`, sur le modèle de `LeadDisplayStatus`, avec la liste `COMPANY_RELATION_DISPLAY_STATUSES` que lisent la facette et le filtre MCP. `relationDisplayStatus(stored, lastInteractionAt, now)` rend Archivée si elle est saisie, Dormante si la dernière interaction précède `now` de plus de `DORMANCY_MONTHS = 12` mois civils, Active sinon, Active aussi sans aucune interaction (une entreprise jamais contactée n'est pas en sommeil)
- **Dernière interaction** : `lastInteractionAtOf` rend la plus tardive de ces dates, aucune n'étant retenue si elle est dans le futur : `occurredAt` des actions de ses personnes où `isContactMade` et leur `respondedAt` ; `metAt` de ses personnes ; `scheduledAt` des entretiens Faits de ses opportunités, comme client ou intermédiaire ; pour ses projets clients, `endedAt`, ou aujourd'hui pour un projet commencé et sans fin ; pour ses opportunités acceptées, la fin de mission (`startMonth` plus `durationMonths`), ou aujourd'hui tant qu'elle court, ou `startMonth` sans durée connue. Les projets personnels, les signaux, les dates de création ou de modification, les actions À faire, les calls non tenus et les entretiens Planifiés ou Annulés n'y entrent pas
- **Requête de l'admin** (`toAdminCompany`, seul point de calcul des propriétés dérivées, `02`) : la sélection des actions des personnes perd sa limite et son tri pour porter `channel`, `status`, `occurredAt` et `respondedAt` des actions sorties d'À faire, plus les calls planifiés des leads ; celle des entretiens Faits perd aussi sa limite ; les projets clients portent `startedAt` et `endedAt` ; les opportunités acceptées `startMonth` et `durationMonths`. `AdminCompany` gagne `lastInteractionAt` et `displayRelationStatus`, `relationStatus` restant la valeur saisie que le formulaire édite
- **Écrans** : la colonne Statut, sa facette et le badge de la vue détail lisent `displayRelationStatus`, avec les libellés et glyphes existants ; le bloc Relation de la vue détail affiche « Dernière interaction » à côté de « Premier contact » ; le formulaire ne propose que Active et Archivée
- **MCP** (`company.ts`) : `crm_create` et `crm_update` n'acceptent que `ACTIVE` ou `ARCHIVEE`, la description disant que Dormante se déduit. En lecture, `relationStatus` porte le statut affiché et `lastInteractionAt` un jour de Paris (`ZONED_DAY`, ajouté aux clés de jour des tests). `crm_fetch` (`findCompanyWithLinks`) charge les mêmes sources que `toAdminCompany` pour cette seule entreprise. Le filtre `relationStatus` de `crm_query` prend les statuts affichés : `findCompaniesPage` charge toutes les entreprises avec leurs sources, calcule leur statut, filtre, trie comme aujourd'hui (nom, création ou modification, id pour départager) puis pagine en mémoire, `total` compté après le filtre. Un seul chemin, au coût négligeable d'un CRM mono-utilisateur de quelques centaines de fiches

### Migrations

- **Mécanique** (`.claude/rules/prisma/schema-migrations.md`) : trois migrations créées une à une par `prisma migrate dev --create-only` sur un schéma modifié par étapes, puis complétées à la main ; `prisma migrate diff` confirme ensuite l'absence d'écart avec le schéma. Le rattrapage efface des données : la sauvegarde du jour de la checklist de `docs/PRODUCTION.md` précède la release
- **Valeur Refusé** : `ALTER TYPE "freelance"."ActionStatus" ADD VALUE 'REFUSE' BEFORE 'IGNORE'`, écrit à la main (Prisma ajoute en fin d'enum), seul dans sa migration (précédent `20261107005537_processing_kind_ai_assistant`) : PostgreSQL refuse d'utiliser une valeur ajoutée dans la même transaction. L'ordre de l'enum donne celui des colonnes du pipeline, des options, des facettes et de l'enum MCP ; `boardColumns` suit le même ordre
- **Règles et refus** : colonne `refusalsReceived INTEGER NOT NULL DEFAULT 0` ; rattrapage : un call perd sa date et son texte de réponse, un call Répondu passe à Fait, une connexion Convertie passe à Répondu. Les revues enregistrées gardent leurs compteurs (`refusalsReceived` à 0, taux inchangés) ; les actions Ignoré existantes restent telles quelles
- **Statut de relation** : `UPDATE` des entreprises Dormante vers Active, écrit à la main avant la recréation du type que génère Prisma (nouveau type, conversion de `Company.relationStatus`, seule colonne concernée, défaut `ACTIVE` reposé)

## Acceptance criteria

### Scénario 1 : refus d'un message
**GIVEN** un DM LinkedIn au statut Fait
**WHEN** on le glisse dans la colonne Refusé du pipeline
**THEN** l'action porte une date de réponse au jour même et garde son texte de réponse s'il existe
**AND** la revue de la semaine compte ce refus dans Refus reçus et pas dans Conversations engagées

### Scénario 2 : statut interdit par le canal
**GIVEN** un call au statut Fait
**WHEN** on le glisse dans la colonne Répondu, ou qu'un agent envoie `crm_update` avec `status: "REPONDU"` ou `crm_create` d'un call Répondu
**THEN** l'opération est refusée avec « Statut impossible pour ce type d'action »
**AND** le formulaire de ce call ne propose ni Répondu ni Refusé

### Scénario 3 : action jamais envoyée et call non tenu
**GIVEN** un DM au statut À faire et un call au statut À faire dont le jour est passé
**WHEN** on passe chacun à Ignoré, depuis le formulaire, le pipeline ou `crm_update`
**THEN** le DM est refusé avec « Une action jamais envoyée se supprime au lieu d'être ignorée »
**AND** le call passe Ignoré, ne compte pas dans Entretiens et n'est pas un contact de l'entreprise

### Scénario 4 : call tenu, noté en retard
**GIVEN** un call À faire planifié le vendredi
**WHEN** on le passe à Converti le lundi suivant
**THEN** il garde le vendredi comme date, sans date ni texte de réponse
**AND** la revue de la semaine de ce vendredi le compte dans Entretiens

### Scénario 5 : compteurs de la semaine
**GIVEN** une semaine avec 10 messages envoyés, 3 réponses dont 1 convertie, 2 refus, 1 candidature convertie, 1 entretien Fait et 1 call Fait
**WHEN** on clique « Calculer depuis le CRM » sur la revue de son vendredi
**THEN** Messages envoyés vaut 10, Conversations engagées 3, Refus reçus 2, RDV décrochés 2 et Entretiens 2
**AND** le taux de réponse affiche 50 % et la conversion RDV 67 %

### Scénario 6 : revue déjà enregistrée
**GIVEN** une revue enregistrée avant la migration
**WHEN** on l'ouvre
**THEN** ses sept compteurs et ses taux sont inchangés et Refus reçus vaut 0

### Scénario 7 : opposition
**GIVEN** un lead avec un DM Fait en attente, un DM À faire et un call À faire
**WHEN** on pose son opposition depuis sa fiche
**THEN** le DM Fait est Refusé daté du jour et compte dans Refus reçus
**AND** le DM À faire et le call À faire sont supprimés

### Scénario 8 : call de qualification planifié
**GIVEN** une personne au rôle Lead au statut Nouveau, sans entretien
**WHEN** on lui ajoute un call À faire daté de demain
**THEN** la liste des leads et sa vue détail affichent « RDV planifié »
**AND** le calcul de la revue la compte dans Leads actifs

### Scénario 9 : call du jour et call dépassé
**GIVEN** un lead Suspect avec un call À faire daté d'aujourd'hui ; un autre lead Suspect avec un call À faire daté d'hier
**WHEN** on ouvre la liste des leads
**THEN** le premier affiche « RDV planifié » et le second « Suspect »

### Scénario 10 : dernier contact déduit du journal
**GIVEN** un lead créé le 1er janvier 2026 dont la dernière réponse date du 2 mars 2026, avec un call Fait le 10 mai 2026, un entretien Fait le 15 juin 2026 et un DM envoyé sans réponse le 1er juillet 2026
**WHEN** on ouvre sa vue détail
**THEN** « Dernier contact de sa part » affiche le 15 juin 2026
**AND** l'échéance de conservation tombe le 15 juin 2029

### Scénario 11 : pipeline inchangé
**GIVEN** un lead au statut Nouveau sans call ni entretien planifié
**WHEN** on ouvre la vue En cours puis on calcule la revue de la semaine
**THEN** il figure dans En cours
**AND** il n'est pas compté dans Leads actifs

### Scénario 12 : entreprise en sommeil
**GIVEN** une entreprise Active dont la dernière action envoyée à l'une de ses personnes date de quatorze mois, sans autre interaction
**WHEN** on ouvre la liste des entreprises
**THEN** elle affiche Dormante
**AND** sa vue détail affiche cette date dans « Dernière interaction »

### Scénario 13 : client en cours de mission, archivée, jamais contactée
**GIVEN** une entreprise sans action depuis deux ans, cliente d'un projet commencé et sans fin ; une entreprise saisie Archivée dont la dernière interaction a trois mois ; une entreprise Active sans personne, projet ni opportunité, avec un signal
**WHEN** on ouvre la liste des entreprises
**THEN** la première affiche Active, la deuxième Archivée et la troisième Active avec une « Dernière interaction » vide

### Scénario 14 : saisie et MCP d'une entreprise
**GIVEN** une entreprise affichée Dormante et une entreprise affichée Active
**WHEN** on ouvre le formulaire de la première, puis un agent appelle `crm_query` avec `relationStatus: "DORMANTE"`, puis avec `relationStatus: "ACTIVE"`
**THEN** le formulaire ne propose que Active et Archivée
**AND** la première requête ne rend que l'entreprise Dormante avec sa dernière interaction ; la seconde ne rend que l'entreprise Active

### Scénario 15 : rattrapage des données
**GIVEN** avant les migrations, un call Converti avec une date de réponse, un call Répondu, une connexion Convertie et une entreprise saisie Dormante dont la dernière interaction a deux mois
**WHEN** les migrations s'appliquent
**THEN** le call Converti n'a plus de date ni de texte de réponse, le call Répondu est Fait et la connexion est Répondu
**AND** l'entreprise est saisie Active et affiche Active

## Tests à écrire

### Unit
- `src/lib/crm/prospecting-action-status.test.ts` :
  - keeps the response date and the reply of a refused message
  - clears the response date and the reply of a call whatever its status
  - allows each channel only its statuses
  - refuses to ignore a message that was never sent
  - allows ignoring a planned call that did not take place
  - allows creating an action already ignored
  - keeps the planned day when a call leaves to do
- `src/lib/crm/company-first-contact.test.ts` :
  - ignores a call that did not take place
- `src/lib/crm/review-counters.test.ts` :
  - counts refusals apart from conversations
  - counts a refused message as sent
  - counts converted applications as booked meetings
  - counts held calls with held interviews, on the day of the call
  - counts a new lead with a planned call as active
- `src/lib/crm/weekly-reviews.test.ts` :
  - computes the response rate with refusals
- `src/lib/crm/action-board.test.ts` :
  - places the refused column before the ignored one
- `src/lib/crm/lead-display-status.test.ts` :
  - shows a scheduled meeting for a call planned today or later
  - keeps the entered status once the planned call day has passed
- `src/lib/crm/person-last-contact.test.ts` :
  - takes the latest of replies, held calls and held interviews
  - ignores sent messages without reply, calls not held and future dates
  - returns null without any contact from the person
- `src/lib/crm/lead-views.test.ts` :
  - keeps new leads in the pipeline
- `src/lib/crm/company-relation-status.test.ts` :
  - takes the latest of contacts, replies, meetings and held interviews
  - counts an ongoing client project and a running accepted mission as today
  - ignores personal projects, planned interviews, actions to do, calls not held and future dates
  - stays active on the exact twelve-month day and turns dormant the day after
  - ignores an accepted mission without start month
  - keeps an archived company archived whatever its activity
  - keeps a company without any interaction active
- `src/server/actions/prospecting-actions.test.ts` :
  - returns each domain refusal as a status error when a move is not allowed
  - returns the deleted-action message when a moved action no longer exists

### Integration
- `src/server/crm/prospecting-actions.integration.test.ts` :
  - rejects a status the channel forbids, on create and from a patch carrying only the channel or only the status
  - rejects ignoring a message that was never sent
  - stores no response date when a call is converted
- `src/server/actions/prospecting-actions.integration.test.ts` :
  - refuses moving a call to replied from the board
- `src/server/actions/persons.integration.test.ts` :
  - deletes planned actions and refuses the latest pending message when opting out
  - deletes planned actions without refusing anything when no message awaits, a pending connection or call staying untouched
- `src/server/crm/weekly-reviews.integration.test.ts` :
  - computes the eight counters when absent
- `src/server/mcp/crm/tools.integration.test.ts` :
  - rejects creating or updating a call with a replied status
  - returns the last contact day of a lead from its held call
  - filters companies on the displayed status, dormant and active
  - rejects a dormant status sent to crm_update

## Edge cases

- **Patch MCP qui ne change que le canal** : le couple contrôlé est le nouveau canal avec le statut enregistré ; un call Converti changé en connexion est refusé
- **Refus corrigé en Répondu** : la date de réponse est gardée, comme entre Répondu et Converti
- **Personne qui revient après un refus** : sa réponse fait une nouvelle action, celle du refus reste figée (une action décrit le sort d'un message)
- **Opposition reçue en réponse à une connexion ou un call** : aucune action ne passe Refusé, ces canaux ne l'admettent pas ; les actions À faire sont supprimées
- **Opposition sans message en attente** (réponse à un échange déjà Répondu) : aucune action ne passe Refusé
- **RDV convenu une semaine après la réponse** : Converti garde la date de la réponse ; le compteur RDV décrochés se corrige dans le formulaire de la revue de la semaine du RDV, jamais sur une revue close
- **Glisser vers une colonne interdite** : la carte s'affiche dans la colonne visée jusqu'au retour du serveur, puis revient avec le toast, comme pour les refus existants
- **Action dont la personne a perdu le rôle Lead** : le pipeline rend désormais le refus du domaine (`no_lead_role`), qu'il ne contrôlait pas
- **Lead Stand-by, Perdu ou Hors ICP avec un call planifié** : RDV planifié l'emporte, comme pour un entretien (`16`) : un RDV existe, c'est un fait et non un bump du statut saisi
- **Date future saisie par erreur** (réponse, call ou entretien Fait) : ignorée du dernier contact et de la dernière interaction tant qu'elle n'est pas passée
- **Call repassé de Fait à À faire par un patch MCP sans date** : il garde son heure d'envoi ; la comparaison au début du jour le traite comme un call du jour
- **Opposition ou effacement des échanges d'une personne** : l'opposition vide son entreprise et sa date de rencontre, l'effacement supprime ses actions ; la dernière interaction de son entreprise recule et l'entreprise peut passer Dormante : cohérent, l'échange n'est plus rattaché
- **Mission acceptée sans date de démarrage** : ignorée, ses entretiens Faits comptent à leur place
- **Interaction datée du jour exact des douze mois** : encore Active, Dormante dès le lendemain

## Architectural decisions

### Décision : représenter le refus

**Options envisagées :**
- **A. Statut Refusé** : une valeur de plus partout où les statuts s'énumèrent, mais un refus ne peut pas être aussi une conversion ; chaque compteur se lit sur le statut
- **B. Case « refus » sur une action Répondu** : aucune nouvelle colonne, mais l'état « refus converti » devient représentable et chaque lecture doit croiser deux champs

**Choix : A**

**Rationale :**
- Un état illégal ne doit pas pouvoir s'écrire ; le statut décrit déjà le sort du message
- Les règles de prospection du propriétaire posent Refusé comme statut à part entière

### Décision : où vivent les règles de statut

**Options envisagées :**
- **A. Domaine seul, le pipeline lui déléguant** : un point d'entrée, mais rien n'empêche une écriture directe en base
- **B. Domaine, doublé de contraintes CHECK** : erreur lisible au domaine et invariant garanti par la base, au prix de la règle écrite deux fois
- **C. Règles recopiées dans l'action du pipeline** : comme aujourd'hui, au risque de diverger du domaine

**Choix : A**

**Rationale :**
- Le pipeline appliquait déjà la règle de date dans sa propre transaction : chaque nouvelle règle aurait dû y être recopiée
- Une fois le pipeline rebranché, l'admin et le MCP écrivent tous deux par le domaine : une contrainte SQL recopierait la règle pour un chemin d'écriture qui n'existe plus

### Décision : action jamais envoyée

**Options envisagées :**
- **A. Suppression manuelle dans l'admin, MCP sans suppression** : l'action reste À faire tant que le propriétaire ne l'a pas supprimée
- **B. Suppression MCP limitée aux actions À faire** : l'agent nettoie seul, au prix d'un outil de suppression à justifier
- **C. Ignoré permis depuis À faire pour tout canal** : simple, mais l'action compterait comme envoyée dans les compteurs, le premier contact et la dernière interaction

**Choix : A** (décision du propriétaire du 2026-11-18), avec l'exception du call planifié non tenu, qui passe Ignoré comme le prévoient les règles de prospection

**Rationale :**
- La suppression reste dans l'espace admin, règle par défaut des outils MCP
- Un call non tenu est un fait à garder (le RDV était posé), pas un brouillon à effacer

### Décision : opposition et actions de la personne

**Options envisagées :**
- **A. Automatique** : l'opposition supprime les actions À faire et passe Refusé le dernier message ou la dernière candidature en attente
- **B. Choix prérempli dans la fenêtre d'opposition** : le propriétaire confirme l'action qui a reçu l'opposition, au prix d'un champ de plus
- **C. Manuel** : le propriétaire passe l'action en Refusé avant de poser l'opposition, faute de quoi le verrou l'en empêche

**Choix : A** (décision du propriétaire du 2026-11-18)

**Rationale :**
- Les règles de prospection prévoient ces deux étapes à chaque opposition : elles se déduisent de l'état des actions
- Une erreur d'action ne fausse pas Refus reçus (un refus reste compté une fois) et la personne sort du pipeline de toute façon

### Décision : ce que compte Entretiens

**Options envisagées :**
- **A. Entretiens Faits seuls** (`18`, `21`) : les calls de qualification tenus ne sont comptés nulle part
- **B. Entretiens Faits et calls Faits ou Convertis** : tous les RDV tenus, en face de RDV décrochés qui compte déjà les deux
- **C. Compteur « Calls tenus » à part** : plus précis, mais un neuvième compteur que les règles de prospection ne connaissent pas

**Choix : B** (décision du propriétaire du 2026-11-18)

**Rationale :**
- RDV décrochés compte un RDV obtenu qu'il soit call ou entretien : son pendant tenu doit compter les deux, sinon la conversion ne se suit pas
- La règle de saisie d'un RDV (entretien dans une opportunité, call hors opportunité) lève la réserve du `21` sur le double comptage
- Le libellé reste « Entretiens », celui des règles de prospection, qui comptent les calls

### Décision : statut du lead après un refus ou un RDV

**Options envisagées :**
- **A. Proposé par les agents, jamais écrit ni déduit par l'app** : le propriétaire tranche au cas par cas, l'app enregistre son choix
- **B. Déduit** (Perdu affiché dès le dernier refus) : toujours à jour, mais un lead gardé en Stand-by malgré un refus devient impossible à représenter
- **C. Écrit automatiquement, l'agent corrigeant ensuite** : un effet de bord qu'une correction de l'action ne défait pas

**Choix : A** (décision du propriétaire du 2026-11-18)

**Rationale :**
- L'app ne déduit que des faits (Deal, RDV planifié, Dormante) ; Perdu après un refus ou Discussion après un RDV sont des jugements, avec des exceptions légitimes
- Les règles de prospection présentent ces changements comme des suggestions

### Décision : ce qui fait un dernier contact

**Options envisagées :**
- **A. Réponses seules** : registre inchangé, mais un call ou un entretien tenu ne compte pas ; un call perd en plus sa date de réponse
- **B. Réponses, calls tenus et entretiens Faits** : tous les contacts qui viennent de la personne, déduits du journal
- **C. B et les messages envoyés** : la conservation se prolongerait par simple relance, contraire au « contact émanant de lui » de la CNIL

**Choix : B** (décision du propriétaire du 2026-11-18)

**Rationale :**
- Un RDV que la personne a tenu est un contact de sa part, au même titre qu'une réponse
- Le journal porte déjà chaque date : rien à saisir

### Décision : pipeline et leads actifs

**Options envisagées :**
- **A. Deux notions nommées distinctement** : aucun changement visible, le code ne confond plus la liste de travail et le KPI
- **B. Une seule définition sans Nouveau** : En cours et Chauds perdent les leads Nouveau, une entreprise avec un seul lead Nouveau n'est plus prospect

**Choix : A** (décision du propriétaire du 2026-11-18)

**Rationale :**
- Le pipeline liste ce qu'on travaille, qualifié ou non (`08`) ; les leads actifs mesurent le pipeline qualifié, comme les règles de prospection
- Seul le nom `isActiveLead` prêtait à confusion avec le KPI

### Décision : Dormante saisie ou déduite

**Options envisagées :**
- **A. Déduite, retirée du statut saisi** : une seule source, toujours à jour, au prix d'une migration d'enum et d'un filtre MCP calculé en mémoire
- **B. Saisissable et déduite** : migration légère, mais deux sources pour un même statut qui peuvent se contredire
- **C. Saisie seule** : rien à changer, mais une entreprise affiche Active après deux ans de silence tant que personne ne la corrige

**Choix : A** (décision du propriétaire du 2026-11-18)

**Rationale :**
- La règle de prospection est mécanique (douze mois sans interaction) : c'est un fait lisible dans le journal, comme « travaillée » (`04`)
- Archivée reste un jugement du propriétaire (relation close) et reste saisie
- Le filtre calculé en mémoire rend à l'agent le même statut que l'écran, pour un coût négligeable au volume d'un CRM mono-utilisateur
