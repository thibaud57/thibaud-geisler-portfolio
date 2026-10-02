---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "revues-hebdo"
goal: "Tenir dans l'espace admin le bilan hebdomadaire de prospection : sept compteurs figés pré-remplis depuis le CRM, trois taux calculés, le ressenti et le qualitatif de la semaine, avec les vues Revue, Calendrier et Journal."
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: ["07-leads-donnees-design.md", "08-ecran-leads-design.md", "09-actions-prospection-donnees-design.md", "12-calendrier-actions-design.md", "16-entretiens-donnees-design.md"]
date: "2026-09-27"
---

# Revues hebdo

## Scope

Crée le modèle `WeeklyReview` (une revue par semaine, sept compteurs figés, statut, motivation, Victoires, Blocages, Plan S+1, Notes), sa validation, ses Server Actions, le calcul des compteurs d'une semaine depuis le CRM et les trois taux calculés à l'affichage. Crée l'écran Revues hebdo (vues Revue avec sa période, Calendrier et Journal, formulaire en fenêtre avec « Calculer depuis le CRM », vue détail, suppression) et active son entrée de menu. Exclut tout recalcul automatique d'une revue enregistrée et les cibles de performance du toolkit.

### État livré

À la fin de ce sub-project, on peut : ouvrir Revues hebdo, créer la revue de la semaine, cliquer « Calculer depuis le CRM » et voir les sept compteurs se remplir depuis les actions, les entretiens et les leads, en corriger un, enregistrer, puis retrouver la revue avec ses trois taux dans la vue Revue, sur son vendredi dans le Calendrier et dans le Journal.

## Dependencies

- `07-leads-donnees-design.md` (statut: draft) : `NONE_VALUE`, `optionalTextField` (`src/lib/schemas/person.ts`)
- `08-ecran-leads-design.md` (statut: draft) : `SelectField`
- `09-actions-prospection-donnees-design.md` (statut: draft) : actions de prospection, canaux, statuts et date de réponse, sources de cinq compteurs
- `12-calendrier-actions-design.md` (statut: draft) : EventCalendar ReUI installé, textes français du calendrier, `@date-fns/tz`
- `16-entretiens-donnees-design.md` (statut: draft) : entretiens tenus (compteur Entretiens) et statut affiché du lead (compteur Leads actifs)

## Références de design

- **Maquette** : `isRevue` (vues `recent`, `calendar`, `table`, sélecteur de période, colonnes `REV_COLS`), `dlgReviewForm`, `dlgDeleteReview`, `dlgDetail`
- **Design system** : `patterns/DataTable`, `patterns/OptionsPopover`, `patterns/FacetFilter`, `patterns/PaginationFooter`, `patterns/DetailDialog`, `patterns/ConfirmDeleteDialog`, `patterns/RowActionButton`, `patterns/EmptyState`, `post-mvp/calendar/EventCalendar`, `core/Dialog`, `core/Select`, `core/Calendar`, `core/Popover`, `core/Input`, `core/Textarea`, `core/Badge`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À modifier** : `prisma/schema.prisma` (enums `ReviewStatus`, `ReviewMotivation`, modèle `WeeklyReview`)
- **À créer** : `prisma/migrations/<horodatage>_weekly_reviews/migration.sql`
- **À créer** : `src/lib/weekly-reviews.ts` (libellés, semaine et vendredi affichés, taux) et `src/lib/weekly-reviews.test.ts`
- **À créer** : `src/lib/review-counters.ts` et `src/lib/review-counters.test.ts` (bornes de la semaine à Paris, comptage des sept compteurs)
- **À créer** : `src/lib/review-views.ts` et `src/lib/review-views.test.ts`
- **À créer** : `src/lib/event-calendar-fr.ts` (textes français communs aux calendriers, sortis de `src/lib/action-calendar.ts`)
- **À modifier** : `src/lib/action-calendar.ts` (reprend les textes communs)
- **À créer** : `src/lib/schemas/weekly-review.ts`
- **À créer** : `src/server/actions/weekly-reviews.ts`, `src/server/actions/weekly-reviews.types.ts`, `src/server/actions/weekly-reviews.test.ts`
- **À créer** : `src/server/queries/weekly-reviews.ts`
- **À modifier** : `src/lib/admin-table-widths.ts` (colonnes des revues)
- **À créer** : `src/components/features/admin/revues/ReviewsTable.tsx`, `ReviewFormDialog.tsx`, `DeleteReviewDialog.tsx`, `ReviewsCalendar.tsx`, `ReviewsViewPage.tsx`
- **À créer** : `src/app/admin/(protected)/revues-hebdo/page.tsx`, `calendrier/page.tsx`, `journal/page.tsx`, chacun avec son `loading.tsx`
- **À modifier** : `src/config/admin-nav-items.ts` (entrée Revues hebdo activée)

## Architecture approach

- **Modèle** (`.claude/rules/prisma/schema-migrations.md`, schema `freelance`) :

| Champ | Type | Règle |
|---|---|---|
| `closingFriday` | `DateTime @db.Date @unique` | vendredi de clôture ; une revue par vendredi ; libellé « S<NN> · Semaine du JJ/MM/AAAA » (numéro de semaine ISO sur deux chiffres, puis le lundi, vendredi − 4) |
| `connectionsSent`, `connectionsAccepted`, `messagesSent`, `conversationsEngaged`, `meetingsBooked`, `interviewsHeld`, `activeLeads` | `Int` | défaut `0`, entiers positifs ou nuls ; figés à l'enregistrement |
| `status` | `ReviewStatus?` : `BONNE`, `MOYENNE`, `MAUVAISE` | jugement sur les résultats |
| `motivation` | `ReviewMotivation?` : `HAUTE`, `POSITIVE`, `NEUTRE`, `BASSE` | ressenti, distinct du statut |
| `wins`, `blockers`, `nextWeekPlan` | `String?` | Victoires, Blocages, Plan S+1 : texte multiligne |
| `notes` | `String?` | Notes : une ligne de marqueurs, séparés par `\|` |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz` | |

- **Remodélisation de Notion**, décidée par le propriétaire le 2026-09-27 : le titre « Semaine » et la « Date vendredi » deviennent le seul vendredi de clôture, le titre s'en déduit ; les quatre sections du corps de page Notion deviennent quatre champs texte, comme la maquette ; les trois taux, formules Notion, se calculent à l'affichage et ne se stockent pas
- **Libellé de la semaine** : le numéro de semaine ISO précède la date du lundi (« S36 · Semaine du 31/08/2026 »), là où la maquette n'écrit que la date ; écart décidé par le propriétaire le 2026-09-27. Le numéro se déduit du jeudi de la semaine, qui fixe aussi son année. Le vendredi s'affiche dans sa propre colonne, comme la « Date vendredi » des vues Notion
- **Compteurs figés** (décidé au `09`, confirmé le 2026-09-27) : les sept compteurs s'enregistrent avec la revue et ne se recalculent jamais, un lead supprimé emportant ses actions (`09`) ; « Calculer depuis le CRM » les remplit dans le formulaire pour la semaine choisie, chacun restant modifiable avant l'enregistrement (refus sec à retirer des conversations, par exemple)
- **Semaine** (`src/lib/review-counters.ts`, fonctions pures) : les sept jours qui finissent le vendredi de clôture, du samedi 0 h au samedi suivant 0 h, heure de Paris (`@date-fns/tz`, fuseau `Europe/Paris`), règle de `/crm-weekly-review` (toolkit) : une action du week-end compte dans la revue suivante. Le formulaire envoie un vendredi ; par défaut, aujourd'hui si c'est un vendredi, sinon le dernier vendredi passé, pour une revue faite en retard
- **Règles de comptage**, celles du toolkit (`kpis-hebdo.md`) corrigées là où nos modèles le permettent (décidé le 2026-09-27) :

| Compteur | Compte |
|---|---|
| Connexions envoyées | actions Connexion LinkedIn hors À faire, date d'envoi dans la semaine |
| Connexions acceptées | actions Connexion LinkedIn Répondu ou Converti, **date de réponse** dans la semaine |
| Messages envoyés | actions DM LinkedIn, Email ou SMS/WhatsApp hors À faire, date d'envoi dans la semaine |
| Conversations engagées | ces mêmes canaux, Répondu ou Converti, **date de réponse** dans la semaine |
| RDV décrochés | ces mêmes canaux, Converti, **date de réponse** dans la semaine |
| Entretiens | **entretiens** (`16`) dont la date tombe dans la semaine et le statut est Fait |
| Leads actifs | personnes au rôle Lead, non opposées (`person.optedOutAt` nul), dont le statut affiché (`16`, `AdminLead`) est Suspect, Discussion ou RDV planifié, au moment du calcul |

  Le toolkit rangeait acceptations, réponses et conversions sur la semaine d'envoi (approximation qu'il signale) et comptait les entretiens par les actions Call ; la date de réponse du `09` et le modèle Entretien du `16` lèvent ces deux approximations
- **Taux** (`src/lib/weekly-reviews.ts`, fonctions pures) : acceptation = acceptées / envoyées, réponse = conversations / messages, conversion RDV = RDV / conversations ; arrondis à l'entier, affichés « 50 % », valeur absente (`EmptyValue`, arbitrage « Valeur absente ») quand le dénominateur est nul
- **Glyphes** : `src/lib/weekly-reviews.ts` exporte aussi `REVIEW_STATUS_ICONS: Record<ReviewStatus, IconComponent | null>` (Bonne `ThumbsUp`, Moyenne `Minus`, Mauvaise `ThumbsDown`) et `REVIEW_MOTIVATION_ICONS: Record<ReviewMotivation, IconComponent | null>` (Haute `FaceGrinning`, Positive `FaceSlightlySmiling`, Neutre `FaceNeutral`, Basse `FaceSlightlyFrowning`), imports nommés depuis `lucide-react`, type `IconComponent` de `@/lib/icons`
- **Validation** (`src/lib/schemas/weekly-review.ts`, `.claude/rules/zod/schemas.md`) : vendredi requis (date ISO, « Choisissez un vendredi » pour un autre jour), compteurs entiers de 0 à 999, statut et motivation facultatifs (sentinelle `NONE_VALUE`), textes vide → `null`
- **Actions** (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`) : `createWeeklyReview`, `updateWeeklyReview`, `deleteWeeklyReview` (motif `saveEntity` / `deleteEntity`), `computeWeekCounters(friday)` qui lit actions, entretiens et leads de la semaine et rend les sept compteurs sans rien écrire ; `getCurrentUser()` en tête de chacune. Une seconde revue pour le même vendredi est refusée (`review_week_exists`, « Une revue existe déjà pour cette semaine »), l'unicité en base en dernier recours. Une semaine sans revue se rattrape à tout moment, sans le refus d'une semaine manquante du toolkit (décidé le 2026-09-27) Revalidation en variante `layout` de `/admin/revues-hebdo`
- **Vues** (`src/lib/review-views.ts`) :

| Vue | Route | Lignes | Tri |
|---|---|---|---|
| Revue | `/admin/revues-hebdo` | revues dont le vendredi tombe dans la période choisie : 30 derniers jours (défaut), mois en cours, année en cours | la plus récente d'abord |
| Calendrier | `/admin/revues-hebdo/calendrier` | toutes, une par vendredi | aucun |
| Journal | `/admin/revues-hebdo/journal` | toutes | la plus récente d'abord |

  Titres et sous-titres de la maquette (`revViewTitle`, `revViewHint`), période par un `Select` au-dessus de la liste (`revPeriodItems`)
- **Liste** (`ReviewsTable`, motif des listes admin) : colonnes de la maquette (`REV_COLS`, affichées par défaut celles de `revCols` dans Revue, toutes dans Journal, la vue complète, arbitrage « Colonnes par vue ») plus une colonne « Vendredi » affichée par défaut (vues Notion, décidé le 2026-09-27), les taux calculés dans leur colonne ; filtre Statut ; clic vers la vue détail
- **Calendrier** (`ReviewsCalendar`, EventCalendar du `12`, vue mois) : une pastille par revue sur son vendredi, journée entière, couleur du statut (Bonne `success`, Moyenne `warning`, Mauvaise `destructive`, sans statut `muted-foreground`), clic vers la vue détail ; ni glisser ni création par clic sur un jour. Les textes français du calendrier du `12` sortent dans `src/lib/event-calendar-fr.ts`, communs aux deux calendriers
- **Formulaire** (`ReviewFormDialog`) : Date vendredi (`Popover` et `Calendar`, seuls les vendredis choisissables, affichée par le libellé de sa semaine) et bouton « Calculer depuis le CRM » sur une même ligne ; Statut et Motivation ; les sept compteurs par paires (Connexions envoyées et acceptées, Messages envoyés et Conversations engagées, RDV décrochés et Entretiens, Leads actifs et la case en lecture seule « Taux acceptation · réponse · conversion », qui affiche les trois taux calculés et « Calculés à l'enregistrement » avant le premier enregistrement) ; Victoires, Blocages, Plan S+1 ; Notes (`Input` d'une ligne, aide « Une ligne de marqueurs, séparés par | »). Le bouton remplit les compteurs de la semaine choisie et le signale par un toast ; il est désactivé tant qu'aucun vendredi n'est choisi
- **Vue détail** : titre au libellé de la semaine, sous-titre « clôture le <vendredi> » complété par « · motivation <motivation> » quand elle est renseignée, statut en tête ; blocs Prospection (connexions, messages, conversations, RDV, avec leurs taux), Pipeline (entretiens, leads actifs), Victoires, Blocages, Plan S+1, Notes ; un bloc sans donnée disparaît (arbitrage du `08`)
- **Suppression** (`DeleteReviewDialog`) : titre et texte de la maquette (`dlgDeleteReview`)
- **Menu** : entrée « Revues hebdo » activée, sous-entrées « Revue », « Calendrier », « Journal » (maquette)
- **Rules** : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : calcul depuis le CRM
**GIVEN** une semaine avec 18 connexions envoyées, dont 9 acceptées dans la semaine, 14 messages envoyés, 5 réponses dont 2 converties, un entretien tenu et 4 leads actifs
**WHEN** on choisit cette semaine et clique « Calculer depuis le CRM »
**THEN** les sept compteurs valent 18, 9, 14, 5, 2, 1 et 4
**AND** on peut en corriger un avant d'enregistrer

### Scénario 2 : réponse tardive
**GIVEN** un DM envoyé un vendredi et répondu le mardi suivant
**WHEN** on calcule les deux semaines
**THEN** il compte dans Messages envoyés la première semaine et dans Conversations engagées la seconde

### Scénario 3 : taux
**GIVEN** une revue à 18 connexions envoyées, 9 acceptées, 0 message et 0 conversation
**WHEN** on l'affiche
**THEN** le taux d'acceptation vaut « 50 % », le taux de réponse et la conversion RDV « — »

### Scénario 4 : une revue par semaine
**GIVEN** une revue clôturée le vendredi 11/09/2026
**WHEN** on crée une autre revue sur ce même vendredi
**THEN** l'enregistrement est refusé : « Une revue existe déjà pour cette semaine »

### Scénario 5 : action du week-end
**GIVEN** une connexion envoyée le samedi 05/09/2026
**WHEN** on calcule la revue du vendredi 04/09/2026, puis celle du vendredi 11/09/2026
**THEN** elle ne compte que dans la seconde

### Scénario 6 : vues
**GIVEN** des revues sur six mois
**WHEN** on ouvre la vue Revue, puis le Calendrier
**THEN** la vue Revue montre celles des 30 derniers jours, la plus récente d'abord ; le Calendrier pose chaque revue sur son vendredi, colorée selon son statut

## Tests à écrire

### Unit
- `src/lib/review-counters.test.ts` :
  - counts sent connections and messages by their sending date
  - counts acceptances, replies and booked meetings in the week the reply arrived
  - counts interviews held in the week from the interview records
  - counts active leads by their displayed status, opted-out leads excluded
  - keeps the week from Saturday to Friday in Paris time
- `src/lib/weekly-reviews.test.ts` :
  - computes the three rates rounded to the unit
  - shows a dash when the denominator is zero
  - labels the week with its ISO number across the year boundary
  - defaults to today on a Friday, otherwise to the last Friday
- `src/lib/review-views.test.ts` :
  - keeps the reviews of the chosen period, most recent first
- `src/server/actions/weekly-reviews.test.ts` :
  - rejects a day that is not a Friday
  - refuses a second review for the same week
  - rejects a negative counter
  - rejects a call without a session, before touching the database

## Edge cases

- **Action répondue avant la semaine de son envoi** (date saisie à la main) : chaque compteur lit sa propre date, l'envoi et la réponse restant comptés chacun dans leur semaine
- **Changement d'heure dans la semaine** (dernier dimanche de mars ou d'octobre) : les bornes restent le samedi 0 h de Paris, la semaine faisant 167 ou 169 heures
- **Semaine à cheval sur deux années** : le numéro suit la norme ISO, « S01 · Semaine du 29/12/2025 » pour le vendredi 02/01/2026
- **Revue faite en retard** (samedi, lundi) : le formulaire propose le dernier vendredi passé, celui qu'elle clôture
- **Action faite le vendredi après le calcul** : hors des compteurs déjà calculés ; un nouveau calcul avant d'enregistrer, ou une correction à la main, la reprend
- **Semaine oubliée** : sa revue se crée plus tard sur son vendredi, sans chevauchement avec ses voisines
- **Calcul relancé après une correction** : il écrase les sept compteurs du formulaire, pas les textes ; rien n'est écrit avant « Enregistrer »
- **Leads actifs d'une semaine passée** : le calcul donne la situation au moment du clic, faute d'historique des statuts (limite déjà assumée par le toolkit)

## Architectural decisions

### Décision : compteurs

**Options envisagées :**
- **A. Saisie à la main seulement**
- **B. Pré-remplis par un calcul depuis le CRM, modifiables, puis figés**
- **C. Calculés à chaque affichage, jamais stockés**

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27, cohérente avec le `09` : C réécrirait l'historique à chaque lead supprimé, A ressaisit ce que le CRM sait déjà
- La correction à la main reste possible, pour un refus sec compté comme réponse

### Décision : règles de comptage

**Options envisagées :**
- **A. Règles du toolkit telles quelles** : acceptations et réponses rangées sur la semaine d'envoi, entretiens comptés par les actions Call
- **B. Règles du toolkit corrigées** : date de réponse (`09`) pour acceptations, réponses et RDV, modèle Entretien (`16`) pour les entretiens

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : les deux approximations signalées par le toolkit disparaissent avec nos modèles

### Décision : bornes de la semaine

**Options envisagées :**
- **A. Du lundi au dimanche** : le week-end n'est pas encore passé quand la revue se calcule le vendredi, ses actions n'entrent dans aucune revue
- **B. Du samedi au vendredi, période fixe** : les sept jours qui finissent le vendredi de clôture
- **C. Depuis la dernière revue**, comme `/crm-weekly-review` : même période quand la cadence est tenue, au prix d'un refus de toute revue dont la semaine précédente manque

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : la revue se fait le vendredi à 17 h, le week-end compte dans la revue suivante comme dans le toolkit
- La période fixe ne compte aucune action deux fois et n'en oublie aucune sans exiger la revue de la semaine précédente, ce qui permet de rattraper une semaine oubliée

### Décision : qualitatif de la semaine

**Options envisagées :**
- **A. Quatre champs texte** (Victoires, Blocages, Plan S+1, Notes), comme la maquette
- **B. Un Détails markdown** avec ces quatre titres, comme les autres fiches

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : c'est la structure fixe du rituel du vendredi, que la maquette montre en quatre champs
