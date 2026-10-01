---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "missions-donnees"
goal: "Créer le modèle Mission, l'opportunité apportée par un lead qui porte une seule fois ce que Notion ressaisit à chaque étape (TJM, contrat, ESN, client final, lieu, rythme), avec sa validation, ses lectures et ses Server Actions."
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: ["02-entreprise-enrichie-donnees-design.md", "07-leads-donnees-design.md"]
date: "2026-09-27"
---

# Données des missions

## Scope

Crée le modèle `Mission` (l'opportunité, de la proposition à l'acceptation), ses liens vers l'apporteur (une personne au rôle Lead), l'ESN et le client final, son enum de statut, sa validation, sa lecture admin et ses Server Actions de création, modification et suppression. Exclut l'écran (`15`), les entretiens (`16`, `17`), le statut du lead déduit des missions (`15`) et le suivi de mission (phases, chantiers, CRA), étape ultérieure qui repartira de la mission acceptée.

### État livré

À la fin de ce sub-project, on peut : appliquer la migration, faire passer les tests unitaires des actions (client final distinct de l'ESN, ESN de type ESN / Recrutement, jours sur site bornés par le rythme, démarrage enregistré au premier du mois) et lire dans Prisma Studio une mission reliée à son apporteur, son ESN et son client final.

## Dependencies

- `02-entreprise-enrichie-donnees-design.md` (statut: draft) : `Zone`, types d'entreprise (`ESN_RECRUTEMENT`)
- `07-leads-donnees-design.md` (statut: draft) : modèle `Person` et rôle `Lead`, apporteur de la mission (`findPersonOptionsWithLeadRole`) ; sentinelle `NONE_VALUE` et champ des notes, sortis dans `src/lib/schemas/person.ts`

## Files touched

- **À modifier** : `prisma/schema.prisma` (enum `MissionStatus`, modèle `Mission`, relations `Person.referredMissions`, `Company.missionsAsIntermediary`, `Company.missionsAsClient`)
- **À créer** : `prisma/migrations/<horodatage>_missions/migration.sql`
- **À créer** : `src/lib/missions.ts` et `src/lib/missions.test.ts` (libellés des statuts et des champs ; mois de démarrage affiché par `formatStartMonth` et relu en `AAAA-MM` par `toMonthValue`, tous deux en UTC)
- **À créer** : `src/lib/schemas/mission.ts`
- **À créer** : `src/server/actions/missions.ts`, `src/server/actions/missions.types.ts`, `src/server/actions/missions.test.ts`
- **À créer** : `src/server/queries/missions.ts`

## Architecture approach

- **Une donnée, un seul endroit** (analyse du 2026-09-27, validée par le propriétaire). La mission porte ce que Notion ressaisit à chaque étape :

| Donnée | Vit sur | Ne se ressaisit plus sur |
|---|---|---|
| TJM | Mission (TJM de l'opportunité) | lead, entretien (champ Salaire/TJM), bandeau du hub client ; les phases du suivi en partiront puis évolueront par avenant |
| Contrat | Mission | entretien (champ Contrat) |
| « Via ESN » ou client direct | Mission, lien vers l'ESN (vide = direct) | valeur « ESN » du champ Contrat de l'entretien, bandeau « via … » |
| Client final | Mission | corps du lead, entretien |
| Secteur et taille du client | Entreprise cliente (`02`) | section « Le Client » de l'entretien |
| Lieu, mode de travail | Mission (zone, mode) | entretien, dont la Localisation Notion mêle zones et Remote/Hybrid |
| Problématique, profil recherché, contenu technique | Détails de la mission | corps du lead, section « Informations Mission » de l'entretien |
| Rôle, rythme | Mission | bandeau du hub client |
| Démarrage, durée (estimés) | Mission | corps du lead ; les dates exactes viendront des phases du suivi |

  Restent distincts parce qu'ils disent autre chose : la localité du lead (où est la personne) et celle de la mission (où elle a lieu), le poste du lead (le sien) et le rôle de la mission (celui du propriétaire)
- **Modèle** (`.claude/rules/prisma/schema-migrations.md`, schema `freelance`) :

| Champ | Type | Règle |
|---|---|---|
| `title` | `String` | intitulé (« Plateforme IA interne »), requis, 120 caractères au plus |
| `role` | `String?` | rôle du propriétaire (« Dev Fullstack IA »), 80 caractères au plus |
| `status` | `MissionStatus` : `PROPOSEE`, `EN_PROCESS`, `OFFRE_RECUE`, `EN_PAUSE`, `ACCEPTEE`, `REFUSEE`, `DECLINEE`, `ABANDONNEE` | défaut `PROPOSEE` |
| `referrerId` | `String?` vers `Person` | apporteur, relation `"MissionReferrer"` ; `onDelete: SetNull` : la mission survit à la suppression de la personne, et au seul retrait du rôle Lead, le lien ne passant plus par `Lead` |
| `intermediaryId` | `String?` vers `Company` | ESN qui propose la mission, vide pour un client direct ; `onDelete: Restrict` |
| `clientId` | `String?` vers `Company` | client final ; `onDelete: Restrict` |
| `dailyRate` | `Int?` | TJM en euros HT par jour |
| `contract` | `ContractStatus?` | enum des projets (`FREELANCE`, `CDI`, `STAGE`, `ALTERNANCE`) |
| `workMode` | `WorkMode?` | enum des projets (`PRESENTIEL`, `HYBRIDE`, `REMOTE`) |
| `daysPerWeek` | `Int?` | rythme, 1 à 5 jours travaillés par semaine |
| `onSiteDays` | `Int?` | 0 à 5 jours sur site par semaine, jamais plus que `daysPerWeek` |
| `zone` | `Zone?` | libellé « Localité » |
| `startMonth` | `DateTime? @db.Date` | démarrage au mois, enregistré au premier jour |
| `durationMonths` | `Int?` | durée estimée en mois, 1 à 60 |
| `notes` | `String?` | ligne courte, 200 caractères au plus |
| `details` | `String?` | markdown (ADR-024) : contexte, profil recherché, contenu technique |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz` | |

- **Contrainte SQL** : `CHECK ("intermediaryId" IS DISTINCT FROM "clientId")`, nommée `Mission_intermediary_client_check`, que Prisma ne sait pas écrire et que la migration ajoute à la main, en plus du refus applicatif (« Le client final ne peut pas être l'ESN »)
- **Écarts avec Notion**, décidés par le propriétaire le 2026-09-27 : le Contrat Notion (ESN, Freelance Direct, Startup, CDI) mêlait trois faits, l'ESN se lit sur le lien, « Startup » sur le type de l'entreprise cliente, reste le contrat, dans l'enum déjà utilisé par les projets pour qu'une mission acceptée devienne un projet sans conversion ; le statut Notion de l'entretien mêlait étape et issue, l'issue (Offre reçue, Accepté, Refusé, En pause) passe à la mission ; la Priorité Notion n'est pas reprise, l'intérêt du lead la porte déjà ; le démarrage se tient au mois, rarement connu au jour
- **Statuts** (`src/lib/missions.ts`) : Proposée, En process (entretiens en cours), Offre reçue, En pause, Acceptée, Refusée (par le client), Déclinée (par le propriétaire), Abandonnée (mission annulée)
- **Validation** (`src/lib/schemas/mission.ts`, `.claude/rules/zod/schemas.md`) : titre requis ; listes facultatives avec la sentinelle `NONE_VALUE` ; TJM entier positif ; rythme de 1 à 5, jours sur site de 0 à 5 et jamais au-delà du rythme (« Pas plus de jours sur site que de jours travaillés ») ; démarrage reçu en `AAAA-MM`, enregistré au premier du mois ; durée de 1 à 60 ; client final distinct de l'ESN (« Le client final ne peut pas être l'ESN ») ; notes 200 caractères au plus, même message que `02` ; vide → `null`
- **ESN** : avant d'écrire, l'action vérifie que l'entreprise choisie porte le type `ESN_RECRUTEMENT` (`intermediary_not_esn`, « L'ESN doit être une entreprise de type ESN / Recrutement ») ; le client final n'a pas de type imposé, y compris une entreprise non travaillée. Une entreprise ou un apporteur disparus renvoient `company_not_found` sur le champ concerné ou `referrer_not_found`, lus dans le nom de la clé étrangère violée
- **Suppression d'une entreprise** : bloquée tant qu'une mission la désigne comme ESN ou client final (`Restrict`), comme pour `ClientMeta` ; `deleteCompany` rend déjà `company_in_use` sur une clé étrangère violée. Le compte des missions dans la confirmation de suppression vient avec l'écran (`15`)
- **Actions** (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`) : `createMission`, `updateMission`, `deleteMission`, motif `saveEntity` / `deleteEntity`, `getCurrentUser()` en tête ; `revalidatePath` en variante `layout` sur `/admin/missions` (route du `15`), `/admin/leads` et `/admin/entreprises`, dont les vues détail montreront leurs missions (`15`)
- **Lecture** (`src/server/queries/missions.ts`, sans `'use cache'`) : `findAllMissionsForAdmin` (apporteur avec nom, email, LinkedIn et opposition ; ESN et client final avec nom et logo), type `AdminMission`
- **RGPD** (`01`) : la mission ne décrit pas la personne ; elle garde ses faits quand son apporteur s'oppose, demande l'effacement de ses échanges, ou perd seulement le rôle Lead ; elle perd le lien uniquement si la personne est supprimée (`onDelete: SetNull`). Un Détails qui nommerait la personne relève de la procédure d'effacement (`PRODUCTION.md`, plan `01`)
- **Pour les sub-projects suivants** (décidé le 2026-09-27) : le `15` affiche « Deal » sur un lead dès qu'une de ses missions est Acceptée ; il calcule sur la fiche d'une ESN ses clients finaux depuis ses missions Acceptée (`joinedEndClientNames`, clients dédoublonnés, triés `localeCompare("fr")`) ; le `16` rattache l'entretien à sa mission, choisit l'entreprise qui le mène entre l'ESN et le client final de celle-ci, garde le type, le statut et l'issue de l'entretien, déduit son numéro de l'ordre, et affiche « RDV planifié » sur un lead correspondant d'un entretien à venir
- **Rules** : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : mission via une ESN
**GIVEN** un lead, une ESN et un client final dans le CRM
**WHEN** on crée une mission reliée aux trois, TJM 580, Freelance, Hybride, 4 jours dont 2 sur site, démarrage avril 2026
**THEN** elle est enregistrée avec ces valeurs, démarrage au 1er avril 2026, statut Proposée

### Scénario 2 : client final et ESN confondus
**GIVEN** une ESN
**WHEN** on la choisit aussi comme client final
**THEN** l'enregistrement est refusé : « Le client final ne peut pas être l'ESN »

### Scénario 3 : présence sur site
**GIVEN** un rythme de 3 jours par semaine
**WHEN** on saisit 4 jours sur site
**THEN** l'enregistrement est refusé : « Pas plus de jours sur site que de jours travaillés »

### Scénario 4 : personne apporteuse supprimée
**GIVEN** une mission apportée par une personne
**WHEN** la personne est supprimée
**THEN** la mission reste, sans apporteur, avec son TJM, son ESN et son client final

### Scénario 5 : entreprise utilisée
**GIVEN** une entreprise client final d'une mission
**WHEN** on tente de la supprimer
**THEN** la suppression est refusée (`company_in_use`)

### Scénario 6 : rôle Lead retiré
**GIVEN** une mission apportée par une personne qui garde le rôle Contact
**WHEN** le rôle Lead est retiré de cette personne
**THEN** la mission garde son apporteur, `referrerId` inchangé

## Tests à écrire

### Unit
- `src/server/actions/missions.test.ts` :
  - rejects a missing title
  - rejects a final client equal to the intermediary
  - rejects more on-site days than worked days
  - stores the start month as the first day of that month
  - refuses an intermediary that is not typed ESN / Recrutement
  - maps a missing referrer or company to its field
  - rejects a call without a session, before touching the database

## Edge cases

- **Client direct** : aucune ESN, le client final seul ; la vérification de type ne s'applique pas
- **Mission sans client connu** : l'ESN ne l'a pas encore nommé ; le client final reste vide
- **Entreprise individuelle à effacer** (`01`, personne physique) : ses missions bloquent la suppression, à retirer ou délier d'abord, étape de la procédure d'effacement

## Architectural decisions

### Décision : contrat

**Options envisagées :**
- **A. Liste Notion** (ESN, Freelance Direct, Startup, CDI)
- **B. Enum `ContractStatus` des projets**, « via ESN » lu sur le lien ESN, « Startup » sur le type de l'entreprise cliente

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : la liste Notion ressaisit deux faits déjà portés par les liens
- Une mission acceptée deviendra un projet client (`ClientMeta.contractStatus`) sans conversion

### Décision : rythme et présence sur site

**Options envisagées :**
- **A. Texte libre** (« 2-3 j de télétravail »)
- **B. Deux nombres** : jours travaillés par semaine et jours sur site, le second borné par le premier

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 ; le rythme sert à comparer les TJM et à préparer les phases du suivi

### Décision : démarrage

**Options envisagées :**
- **A. Date exacte**
- **B. Mois**, enregistré au premier jour et affiché « avril 2026 »

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : un démarrage se connaît au mois, un jour saisi serait inventé ; les dates exactes viendront des phases

### Décision : entreprise supprimée

**Options envisagées :**
- **A. Lien vidé** (`SetNull`) : la mission perd son ESN ou son client final sans prévenir
- **B. Suppression bloquée** (`Restrict`), comme pour les projets clients

**Choix : B**

**Rationale :**
- L'ESN et le client final sont des faits de la mission, pas des détails ; le refus existe déjà (`company_in_use`)
