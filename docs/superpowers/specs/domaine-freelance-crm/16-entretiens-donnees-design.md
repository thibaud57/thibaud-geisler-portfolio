---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "entretiens-donnees"
goal: "Créer le modèle des entretiens d'une opportunité, avec leurs correspondants, leur numéro déduit de l'ordre et leurs Server Actions, et déduire des entretiens à venir le statut « RDV planifié » d'un lead."
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: ["07-leads-donnees-design.md", "08-ecran-leads-design.md", "09-actions-prospection-donnees-design.md", "10-ecran-actions-prospection-design.md", "13-contacts-design.md", "14-opportunites-donnees-design.md", "15-ecran-opportunites-design.md"]
date: "2026-09-27"
---

# Données des entretiens

## Scope

Crée le modèle `Interview` rattaché à une opportunité, avec ses correspondants (personnes, choisies parmi les non opposées ou créées à la volée pour un correspondant inconnu, au rôle Contact du type choisi par l'utilisateur), ses listes de valeurs (dont `status` et `outcome`, l'issue ne se saisissant que sur un entretien Fait), sa validation, sa lecture admin, ses Server Actions, ses trois gabarits de Détails et son titre déduit (numéro et entretien précédent tirés de l'ordre dans l'opportunité). Déduit un statut affiché « RDV planifié » sur la personne au rôle Lead, lu sur ses entretiens à venir, et retire la personne de ses entretiens quand elle demande l'effacement de ses échanges (`erasePersonExchanges`). Exclut l'écran (`17`) et tout Kanban, le pipeline des opportunités étant porté par les opportunités elles-mêmes (`14`, `15`).

### État livré

À la fin de ce sub-project, on peut : appliquer la migration, faire passer les tests unitaires (le second entretien d'une opportunité se lit « Entretien 2 · Technique », une personne au rôle Lead correspondante d'un entretien Planifié demain s'affiche « RDV planifié », un entretien mené par l'ESN d'une opportunité sans ESN est refusé, un correspondant inconnu crée une personne au rôle Contact du type choisi) et lire dans Prisma Studio un entretien relié à son opportunité et à deux correspondants.

## Dependencies

- `07-leads-donnees-design.md` (statut: draft) : modèle `Person`, modèle `Lead`, `personFields` et `NONE_VALUE` (`src/lib/schemas/person.ts`), `findPersonOptions()` et `erasePersonExchanges` (`src/server/queries/persons.ts`, `src/server/actions/persons.ts`)
- `08-ecran-leads-design.md` (statut: draft) : `details-templates.ts` et `detailsAfterOriginChange`, dont la règle de remplacement du gabarit est reprise ici, `LeadsTable`
- `09-actions-prospection-donnees-design.md` (statut: draft) : `erasePersonExchanges`, qui supprime les actions, étendu ici pour retirer la personne de ses entretiens
- `10-ecran-actions-prospection-design.md` (statut: draft) : `AdminLead._count` et instant `now` figé de `LeadsTable`
- `13-contacts-design.md` (statut: draft) : modèle `Contact` (`ContactType`, `ContactStatus`), posé ici sur un correspondant inconnu, au type choisi par l'utilisateur
- `14-opportunites-donnees-design.md` (statut: draft) : modèle `Opportunity`, qui porte TJM, contrat, lieu, mode, ESN et client final
- `15-ecran-opportunites-design.md` (statut: draft) : statut affiché du lead (`lead-display-status.ts`) et vues des leads relues sur lui, étendus ici

## Files touched

- **À modifier** : `prisma/schema.prisma` (enums `InterviewType`, `InterviewStatus`, `InterviewOutcome`, `InterviewDecision`, `InterviewSide`, modèle `Interview` avec `correspondents Person[]`, relation plusieurs-à-plusieurs `InterviewCorrespondents`)
- **À créer** : `prisma/migrations/<horodatage>_interviews/migration.sql`
- **À créer** : `src/lib/interviews.ts` et `src/lib/interviews.test.ts` (libellés, glyphes, numéro, titre et entretien précédent)
- **À modifier** : `src/lib/details-templates.ts` et `src/lib/details-templates.test.ts` (gabarits des entretiens, bascule de gabarit généralisée)
- **À modifier** : `src/lib/lead-display-status.ts` et `src/lib/lead-display-status.test.ts` (RDV planifié déduit sur la personne au rôle Lead)
- **À modifier** : `src/lib/lead-views.ts` et `src/lib/lead-views.test.ts` (instant courant passé aux vues)
- **À créer** : `src/lib/schemas/interview.ts` (réutilise `personFields` pour un correspondant inconnu, plus `contactType` requis)
- **À créer** : `src/server/actions/interviews.ts`, `src/server/actions/interviews.types.ts`, `src/server/actions/interviews.test.ts`
- **À créer** : `src/server/queries/interviews.ts`
- **À modifier** : `src/server/queries/leads.ts` (entretiens de la personne, compte des entretiens)
- **À modifier** : `src/server/actions/persons.ts` et `src/server/actions/persons.test.ts` (effacement demandé : retrait des entretiens)
- **À modifier** : `src/components/features/admin/leads/LeadsTable.tsx` (instant courant passé au statut affiché et aux vues)

## Architecture approach

- **Modèle** (`.claude/rules/prisma/schema-migrations.md`, schema `freelance`) :

| Champ | Type | Règle |
|---|---|---|
| `opportunityId` | `String` vers `Opportunity` | obligatoire ; `onDelete: Cascade` : un entretien n'existe que dans son opportunité |
| `side` | `InterviewSide` : `ESN`, `CLIENT_FINAL` | qui mène l'entretien, l'ESN ou le client final de **son** opportunité ; l'entreprise se lit sur l'opportunité, jamais ressaisie |
| `correspondents` | `Person[]` | plusieurs-à-plusieurs (`InterviewCorrespondents`) ; personnes non opposées choisies parmi `findPersonOptions()`, ou créées à l'enregistrement pour un correspondant inconnu (rôle Contact, `contactType` requis choisi par l'utilisateur) ; `erasePersonExchanges` retire une personne de ses entretiens |
| `type` | `InterviewType` : `PREMIER_CONTACT`, `RECRUTEUR_RH`, `TECHNIQUE`, `MANAGER_EQUIPE`, `NEGOCIATION` | liste de la maquette (`entrTypes`) |
| `status` | `InterviewStatus` : `PLANIFIE`, `FAIT`, `ANNULE` | défaut `PLANIFIE` ; où en est l'entretien |
| `outcome` | `InterviewOutcome?` : `POSITIF`, `NEGATIF`, `SANS_SUITE` | ce qu'il a donné ; ne se saisit que quand `status` vaut `FAIT`, vidée sinon |
| `scheduledAt` | `DateTime @db.Timestamptz` | date et heure, obligatoire |
| `score` | `Int?` | 0 à 10, l'opportunité vue après cet échange |
| `decision` | `InterviewDecision?` : `OUI_TRES_INTERESSE`, `OUI_SOUS_CONDITIONS`, `NON` | « Je continue le process ? » des gabarits Notion |
| `notes` | `String?` | ligne courte, 200 caractères au plus |
| `details` | `String?` | markdown (ADR-024), gabarit selon le type |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz` | |

  Index sur `(opportunityId, scheduledAt)` : le numéro et l'entretien précédent se lisent dans cet ordre
- **Remodélisation de Notion**, décidée par le propriétaire le 2026-09-27 : l'issue que Notion mêlait au statut (Offre reçue, Accepté, Refusé, En pause) est un statut de l'opportunité (`14`) ; l'entretien garde son type (l'étape), son statut (où il en est) et son issue (ce qu'il a donné, une fois fait). TJM, contrat, localisation, mode et client final se lisent sur l'opportunité. Titre, numéro (« Entretien 1, 2 ») et « Entretien lié » ne se saisissent plus : ils se déduisent de l'ordre des entretiens dans l'opportunité. La Priorité n'est pas reprise, l'intérêt du lead la porte déjà
- **Numéro et titre** (`src/lib/interviews.ts`, fonctions pures) : dans une opportunité, les entretiens se rangent par date puis par création ; un Premier contact s'intitule « Premier contact », les autres « Entretien N · <type> », N comptant les entretiens hors Premier contact jusqu'à lui ; l'entretien précédent est celui qui le précède dans l'opportunité
- **Gabarits** (`src/lib/details-templates.ts`) : trois au lieu des cinq de Notion, réduits à l'échange :
  - Premier contact : Contexte du contact, Red flags, Green flags, Suite
  - Entretien (Recruteur/RH, Manager/Équipe, Négociation) : Objectifs, Préparation ciblée, Déroulé, Évaluation, Red flags, Green flags, Pourquoi et conditions, Suite
  - Technique : ceux de l'Entretien, plus Exercice technique après Préparation ciblée

  Les informations d'opportunité, la qualification rapide et le package vivent sur l'opportunité ; la politique d'une ESN et la culture d'une startup dans le Détails de l'entreprise (`02`) ; la préparation générique (pitch, posture, questions classiques), identique à chaque entretien, ne se recopie plus. La bascule du gabarit quand le type change avant toute saisie reprend la règle des leads (`08`), généralisée à deux gabarits quelconques
- **Validation** (`src/lib/schemas/interview.ts`, `.claude/rules/zod/schemas.md`) : opportunité requise, côté requis, correspondants existants en liste d'identifiants, et pour un correspondant inconnu une liste de nouvelles personnes (`personFields` de `src/lib/schemas/person.ts`, nom déjà obligatoire, plus `contactType` requis, « Choisissez un type de contact » sinon), type et statut dans leurs listes, issue dans sa liste (sentinelle `NONE_VALUE`), facultative même si le statut vaut Fait, vidée sinon, date en instant ISO complet avec décalage (`z.iso.datetime({ offset: true })`, comme le `09`), score entier de 0 à 10, décision facultative (sentinelle `NONE_VALUE`), notes 200 caractères au plus, vide → `null`
- **Glyphes** (`.claude/rules/design/claude-design.md`) : `src/lib/interviews.ts` exporte aussi `INTERVIEW_TYPE_ICONS: Record<InterviewType, IconComponent | null>` (Premier contact `Coffee`, Recruteur/RH `UserSearch`, Technique `Code`, Manager/Équipe `Users`, Négociation `BadgeEuro`), `INTERVIEW_STATUS_ICONS: Record<InterviewStatus, IconComponent | null>` (Planifié `CalendarClock`, Fait `CircleCheck`, Annulé `CircleX`), `INTERVIEW_OUTCOME_ICONS: Record<InterviewOutcome, IconComponent | null>` (Positif `ThumbsUp`, Négatif `ThumbsDown`, Sans suite `CircleMinus`) et `INTERVIEW_DECISION_ICONS: Record<InterviewDecision, IconComponent | null>` (Oui très intéressé `Rocket`, Oui sous conditions `Scale`, Non pas pour moi `Ban`) ; imports nommés depuis `lucide-react`, type `IconComponent` de `@/lib/icons`
- **Actions** (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`) : `createInterview`, `updateInterview`, `deleteInterview`, motif `saveEntity` / `deleteEntity`, `getCurrentUser()` en tête. Avant d'écrire : l'opportunité existe (`opportunity_not_found`) ; un entretien mené par l'ESN exige une opportunité qui en a une (`opportunity_without_intermediary`, « Cette opportunité n'a pas d'ESN : l'entretien est mené par le client final ») ; tous les correspondants existants existent et ne sont pas opposés (`correspondent_not_found`) ; un correspondant inconnu dont l'email ou le LinkedIn est déjà celui d'une personne connue est refusé plutôt que dupliqué (`correspondent_exists`). Un correspondant inconnu est créé dans la même transaction que l'entretien, personne au rôle Contact (`types` `[contactType]`, le type choisi par l'utilisateur sur le brouillon, `status` `ACTIF`). Correspondants écrits par `connect` (identifiants existants et personnes créées) à la création, `set` à la modification. Revalidation en variante `layout` de `/admin/entretiens` (route du `17`), `/admin/opportunites` et `/admin/leads`
- **Lecture** (`src/server/queries/interviews.ts`, sans `'use cache'`) : `findAllInterviewsForAdmin` (opportunité avec intitulé, ESN, client final, TJM, contrat, mode, zone ; correspondants avec nom, email, LinkedIn et opposition), type `AdminInterview`. `AdminLead` gagne ses entretiens (statut, issue, date) et leur compte
- **Statut affiché du lead** (`src/lib/lead-display-status.ts`, étendu depuis le `15`) : « Deal » si une opportunité apportée est acceptée, sinon « RDV planifié » si la personne au rôle Lead est correspondante d'un entretien Planifié dont la date n'est pas passée, sinon le statut saisi. La fonction reçoit l'instant courant ; les vues des leads aussi, `LeadsTable` passant l'instant figé au montage qu'elle tient déjà (`10`). `LeadStatus` ne porte déjà plus `RDV_PLANIFIE` dans le schéma v2 (`07`) : aucune migration n'est nécessaire pour le retirer ; la reprise Notion (`20`) crée l'entretien Planifié correspondant pour toute fiche qui portait ce statut
- **Effacement** (`erasePersonExchanges`, `07`, `09`) : retire aussi la personne des correspondants de ses entretiens (`interviews: { set: [] }`), dans la même transaction ; un simple `optOutPerson` sans effacement l'y laisse, l'entretien restant un fait de l'opportunité (`01`). Un Détails qui décrirait la personne relève de la procédure d'effacement (`PRODUCTION.md`, plan `01`)
- **Rules** : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : numérotation
**GIVEN** une opportunité avec un Premier contact le 1er septembre, un entretien Recruteur/RH le 8 et un Technique le 15
**WHEN** on lit ses entretiens
**THEN** ils s'intitulent « Premier contact », « Entretien 1 · Recruteur/RH » et « Entretien 2 · Technique »
**AND** l'entretien précédent du Technique est celui du 8

### Scénario 2 : RDV planifié
**GIVEN** une personne au rôle Lead en Discussion, correspondante d'un entretien Planifié demain
**WHEN** on lit son statut affiché
**THEN** il vaut « RDV planifié », puis redevient « Discussion » quand l'entretien passe à Fait

### Scénario 3 : côté ESN sans ESN
**GIVEN** une opportunité en client direct
**WHEN** on enregistre un entretien mené par l'ESN
**THEN** l'enregistrement est refusé : « Cette opportunité n'a pas d'ESN : l'entretien est mené par le client final »

### Scénario 4 : effacement demandé
**GIVEN** une personne correspondante de deux entretiens, opposée
**WHEN** elle demande l'effacement de ses échanges (`erasePersonExchanges`)
**THEN** les deux entretiens restent, sans elle parmi leurs correspondants

### Scénario 5 : opportunité supprimée
**GIVEN** une opportunité avec trois entretiens
**WHEN** on la supprime
**THEN** ses entretiens sont supprimés avec elle

### Scénario 6 : correspondant inconnu
**GIVEN** un entretien enregistré avec une personne inconnue (nom, type de contact Commercial choisi, email)
**WHEN** on l'enregistre
**THEN** une personne est créée au rôle Contact de ce type, correspondante de l'entretien

### Scénario 7 : correspondant déjà connu
**GIVEN** un entretien enregistré avec une nouvelle personne dont l'email est déjà celui d'une personne existante
**WHEN** on l'enregistre
**THEN** l'enregistrement est refusé, sans dupliquer la personne

## Tests à écrire

### Unit
- `src/lib/interviews.test.ts` :
  - numbers interviews after the first contact within their opportunity, by date
  - names the previous interview of the same opportunity
- `src/lib/lead-display-status.test.ts` :
  - shows a scheduled meeting when the lead is a correspondent of an upcoming planned interview
  - keeps Deal ahead of a scheduled meeting
  - ignores a past interview and one no longer planned
- `src/lib/details-templates.test.ts` :
  - gives each interview type its template
- `src/server/actions/interviews.test.ts` :
  - rejects a missing opportunity or date
  - rejects a date without its time zone offset
  - refuses an interview led by the intermediary of an opportunity without one
  - refuses an unknown or opted-out correspondent
  - connects the correspondents on create
  - creates a Contact-role person of the chosen type for a new correspondent
  - refuses a new correspondent without a contact type
  - refuses a new correspondent whose email is already known
  - empties the outcome when the status is not Fait
  - keeps an empty outcome on a Fait interview
  - rejects a call without a session, before touching the database
- `src/server/actions/persons.test.ts` :
  - removes the person from its interviews when exchanges are erased

## Edge cases

- **Deux entretiens à la même heure dans une opportunité** : départagés par leur date de création, le numéro restant stable d'une lecture à l'autre
- **Entretien Planifié dont la date est passée sans mise à jour** : il ne fait plus afficher « RDV planifié » ; le passer à Fait ou Annulé reste à la main
- **Opportunité passée en client direct après coup** (ESN retirée) : un entretien mené par l'ESN reste lisible ; le modifier impose de choisir le client final
- **Personne opposée** (`optOutPerson` sans effacement) : elle reste correspondante ; l'écran (`17`) ne la propose plus pour un nouvel entretien
- **Correspondant inconnu sans nom ou sans type de contact** : refusé, le nom et le type de contact étant tous deux obligatoires sur le brouillon

## Architectural decisions

### Décision : titre et entretien lié

**Options envisagées :**
- **A. Saisis**, comme Notion et la maquette : titre libre et lien vers l'entretien précédent
- **B. Déduits** de l'ordre des entretiens dans l'opportunité

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : le titre Notion (« Entretien 1 - Agents sinistres (AXA) ») répète le numéro et l'opportunité, et l'entretien lié est toujours le précédent de la même opportunité
- Un entretien déplacé dans le temps se renumérote seul

### Décision : gabarits

**Options envisagées :**
- **A. Les cinq gabarits Notion** (Premier contact, ESN, Startup, Freelance, Technique)
- **B. Trois gabarits réduits à l'échange** (Premier contact, Entretien, Technique)

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : les gabarits ESN, Startup et Freelance ne diffèrent que par des sections qui vivent désormais sur l'opportunité ou l'entreprise, et la préparation générique était identique partout

### Décision : Kanban des entretiens

**Options envisagées :**
- **A. Aucun Kanban** : le Kanban Notion des entretiens, groupé par statut, est le pipeline des opportunités, que portent les vues Opportunités
- **B. Kanban des opportunités par statut**, ajouté maintenant
- **C. Kanban des entretiens par statut ou issue**

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-09-27 ; B reste possible plus tard sans rien changer au modèle

### Décision : « RDV planifié » du lead

**Options envisagées :**
- **A. Statut saisi à la main**, comme dans Notion
- **B. Statut affiché**, déduit d'un entretien Planifié à venir dont la personne au rôle Lead est correspondante

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27, sur le motif de « Deal » (`15`) : un rendez-vous planifié est un entretien, une seule source

### Décision : type du correspondant inconnu

**Options envisagées :**
- **A. Déduit du poste** : `COMMERCIAL` si le poste est `RECRUTEUR`, sinon `CONTACT_TECH`
- **B. Choisi par l'utilisateur**, champ `contactType` requis sur le brouillon

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : un correspondant inconnu n'est pas toujours un recruteur ou un profil technique (manager, négociateur RH) ; l'utilisateur sait déjà qui il a en face, la déduction depuis le seul poste se trompait trop souvent
