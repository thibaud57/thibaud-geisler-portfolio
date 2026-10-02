---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "leads-donnees"
goal: "Créer la personne et son rôle de lead : table, validation, Server Actions et opposition RGPD en deux temps."
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: ["01-rgpd-prospection-design.md", "02-entreprise-enrichie-donnees-design.md"]
date: "2026-09-29"
---

# Données des leads

## Scope

Crée le modèle `Person` (l'identité, les coordonnées, l'entreprise et l'opposition d'une personne) et le modèle `Lead` (son rôle de prospect ou d'auteur d'une demande entrante, clé `personId`), leurs listes de valeurs, leur validation, leurs lectures pour l'admin et leurs Server Actions de création, modification, suppression et opposition RGPD en deux temps (`optOutPerson`, `erasePersonExchanges`). `createLead` crée toujours une nouvelle personne et son rôle Lead. Un même email ou un même profil LinkedIn ne peut exister que sur une personne, ce qui empêche à la fois les doublons et la recréation d'une personne qui s'est opposée. Exclut l'interface (`08`), les actions de prospection (`09`), le rôle Contact (`13`), les opportunités (`14`), les entretiens (`16`, `17`), les signaux (`19`), le calcul automatique du score (agents internes) et toute purge automatique.

### État livré

À la fin de ce sub-project, on peut : appliquer la migration, faire passer les tests unitaires des actions (création minimale, doublon refusé en nommant la personne existante, suppression qui retire le rôle et supprime la personne, opposition puis effacement des échanges qui posent chacun leur date une seule fois) et retrouver dans Prisma Studio une personne opposée réduite à son email, son lien LinkedIn, sa date d'opposition et son rôle Lead intact.

## Dependencies

- `01-rgpd-prospection-design.md` (statut: draft) : durées de conservation, point de départ des 3 ans, données gardées après une opposition
- `02-entreprise-enrichie-donnees-design.md` (statut: draft) : enum `Zone` du schema `freelance` et `src/lib/zones.ts`, partagés avec les personnes

## Files touched

- **À modifier** : `prisma/schema.prisma` (enums des leads, `JobRole`, modèles `Person` et `Lead`, relation `Company.persons`)
- **À créer** : `prisma/migrations/<horodatage>_person_lead/migration.sql`
- **À créer** : `src/lib/linkedin.ts` et `src/lib/linkedin.test.ts` (forme unique d'un lien de profil LinkedIn, réutilisée par les contacts)
- **À créer** : `src/lib/job-roles.ts` (libellés des postes, partagés avec les contacts)
- **À créer** : `src/lib/schemas/person.ts` (`personFields`, `NONE_VALUE` et les champs réutilisables `personNameField`, `emailField`, `linkedinUrlField`, `optionalTextField`, `notesField`, `optionalDateField`)
- **À créer** : `src/lib/schemas/lead.ts` (`leadSchema`)
- **À créer** : `src/lib/persons.ts` (`PERSON_FIELD_LABELS`, `personDisplayName`, `OPTED_OUT_CLEARED`)
- **À créer** : `src/lib/leads.ts` (libellés et glyphes du rôle : origine, statut, intérêt, canal, champs)
- **À modifier** : `src/server/actions/shared.ts` (`saveEntity` généralisé à `TInput extends object`, ni les leads ni les personnes n'ayant de slug)
- **À créer** : `src/server/actions/leads.ts`, `src/server/actions/leads.types.ts`, `src/server/actions/leads.test.ts`
- **À créer** : `src/server/actions/persons.ts`, `src/server/actions/persons.test.ts` (`optOutPerson`, `erasePersonExchanges`, `PersonLockedError`)
- **À créer** : `src/server/queries/leads.ts` (`findAllLeadsForAdmin`, `findLeadByIdForAdmin`, type `AdminLead`)
- **À créer** : `src/server/queries/persons.ts` (`PersonOption`, `findPersonOptions`, `findPersonOptionsWithLeadRole`)

## Architecture approach

- **Modèles** (`.claude/rules/prisma/schema-migrations.md`, schema `freelance`) : la personne porte tout ce qui la décrit et son opposition, le rôle ne porte que le pipeline.

`Person` :

| Champ | Type | Règle |
|---|---|---|
| `name` | `String?` | requis à la saisie (`personNameField`) ; nul seulement après une opposition |
| `jobRole` | `JobRole?` : `CTO`, `TECH_LEAD`, `RECRUTEUR`, `DEVELOPPEUR`, `CEO`, `PRODUCT_OWNER`, `C_LEVEL`, `MANAGER`, `AUTRE` | enum partagé avec les contacts (`13`) |
| `zone` | `Zone?` | enum des entreprises (`02`), au singulier, libellé « Localité » |
| `email` | `String? @unique` | en minuscules |
| `phone` | `String?` | texte libre |
| `linkedinUrl` | `String? @unique` | forme unique, voir ci-dessous |
| `metAt` | `DateTime? @db.Date` | « Date de rencontre » |
| `notes` | `String?` | ligne courte de marqueurs, 200 caractères au plus ; vidée par l'opposition comme `details` |
| `details` | `String?` | corps de fiche markdown long, saisi avec l'éditeur Pages CMS Editor (ADR-024, `03`), reçoit aussi le corps de page Notion (`20`) ; vidé par l'opposition comme `notes` |
| `optedOutAt` | `DateTime? @db.Timestamptz` | date du « stop » (art. 21), posée une seule fois |
| `exchangesErasedAt` | `DateTime? @db.Timestamptz` | date de l'effacement des échanges (art. 17.1.c), posée une seule fois, seulement sur une personne opposée |
| `companyId` | `String?` vers `Company` | `onDelete: SetNull` : supprimer une entreprise laisse la personne |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz` | date de collecte |

`Lead` (clé `personId`, `onDelete: Cascade` vers `Person`) :

| Champ | Type | Règle |
|---|---|---|
| `origin` | `LeadOrigin` : `INBOUND`, `OUTBOUND` | requis |
| `status` | `LeadStatus` : `NOUVEAU`, `SUSPECT`, `DISCUSSION`, `HORS_ICP`, `PERDU`, `STAND_BY` | défaut `NOUVEAU` ; Deal et RDV planifié se déduisent plus tard des opportunités et des entretiens, jamais stockés |
| `interest` | `LeadInterest?` : `HOT`, `WARM`, `COLD` | facultatif, vide si non renseigné : pas de valeur « inconnu » (aucun enum du CRM n'en porte) |
| `channel` | `LeadChannel?` : `LINKEDIN`, `SITE_WEB`, `CANDIDATURE`, `PLATEFORME`, `REFERENCE`, `EVENEMENT`, `COLD_EMAIL`, `COLD_CALL`, `AUTRE` | |
| `score` | `Int?` | entier de 0 à 10, grille de qualification |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz` | |

- **Écarts avec Notion**, décidés par le propriétaire : `PRODUCT_OWNER` remplace « Product Manager » ; `MANAGER` vient de la liste des contacts ; « Inconnu » de la localité devient l'absence de zone ; aucun statut « Contacté », les actions de prospection (`09`) disant déjà si la personne a été contactée ; ni « RDV planifié » ni « Deal », qui se déduisent des entretiens (`16`) et des opportunités (`14`) plutôt que d'être saisis ; score sur 10, la maquette disant 0-100 ; la stack technique n'est plus un champ structuré, elle décrit une opportunité ou une entreprise et se décrit dans le texte `details` ; le dernier contact émanant de la personne n'est plus un champ saisi, il se déduira des actions de prospection au statut Répondu ou Converti (`09`)
- **Lien LinkedIn** (`src/lib/linkedin.ts`, fonction pure) : accepté sans schéma (`linkedin.com/in/…`), hôte `linkedin.com` ou l'un de ses sous-domaines, chemin `/in/<identifiant>` ; ramené à `https://www.linkedin.com/in/<identifiant>`, identifiant en minuscules, sans barre finale, paramètres ni fragment. Tout autre lien (page entreprise, autre site) est refusé : « Lien de profil LinkedIn attendu (linkedin.com/in/…) »
- **Validation** (`src/lib/schemas/person.ts`, `src/lib/schemas/lead.ts`, `.claude/rules/zod/schemas.md`) : `personFields` porte les champs communs (`name`, `jobRole`, `zone`, `email`, `phone`, `linkedinUrl`, `metAt`, `notes`, `details`, `companyId`), assemblés depuis des pièces exportées séparément (`personNameField`, `emailField`, `linkedinUrlField`, `optionalTextField`, `notesField`, `optionalDateField`) pour que `13` les réutilise sans dupliquer les règles ; `personNameField` exige une chaîne non vide, seule une opposition la vide ; `leadSchema` étend `personFields` des champs du rôle ; listes à valeur unique facultatives avec la sentinelle `NONE_VALUE` ; email par `z.email()` puis minuscules ; score entier de 0 à 10 ; dates ISO ; `notes` : trim, vide → `null`, 200 caractères au plus, même message que `02` (« Les notes tiennent sur une ligne (200 caractères au plus) ») ; `details` : trim, vide → `null`
- **Une fiche par personne** : avant d'écrire une nouvelle personne, l'action cherche une autre personne portant le même email ou le même lien LinkedIn. Trouvée, l'écriture est refusée sur le champ concerné : « Ce lead existe déjà : <nom> » (`lead_exists`), ou pour une personne en opposition « Cette personne s'est opposée à la prospection le JJ/MM/AAAA » (`lead_opted_out`). Une violation d'unicité levée malgré tout (deux enregistrements simultanés) tombe sur le même champ avec `lead_exists`
- **Actions leads** (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`) : `createLead` crée toujours la personne et le rôle dans une même transaction ; `updateLead` écrit les deux lignes, refusée (`PersonLockedError`, message `lead_opted_out_locked`) si la personne est opposée ; `deleteLead` retire le rôle puis supprime la personne, celle-ci n'ayant à ce stade aucun autre rôle possible, la suppression conditionnée au rôle Contact restant à écrire par `13` ; motif `saveEntity` / `deleteEntity` des entreprises, `getCurrentUser()` en tête de chaque action ; une entreprise inexistante (clé étrangère) renvoie `company_not_found` sur le champ entreprise. Après écriture, `revalidatePath("/admin/leads", "layout")`, qui couvre la route et les vues que crée le `08`
- **Actions RGPD** (`src/server/actions/persons.ts`) : `optOutPerson(id)` vide dans une transaction `name`, `jobRole`, `zone`, `phone`, `metAt`, `notes`, `details`, `companyId` ; garde `email`, `linkedinUrl` et les rôles avec leurs champs propres, inchangés ; pose `optedOutAt` une seule fois (idempotent sinon) ; supprime la personne si elle n'a ni email ni LinkedIn, rien ne permettant plus de la reconnaître. `erasePersonExchanges(id)` n'agit que sur une personne opposée, pose `exchangesErasedAt` une seule fois ; à ce stade, aucune action de prospection, aucun entretien ni aucun signal n'existe encore, la transaction ne fait donc que poser la date, avec la forme que `09`, `16` et `19` complèteront chacun d'une suppression. `PersonLockedError`, levée par `updateLead` sur une personne opposée, vit ici pour être réutilisée par `13`
- **Lectures** (`src/server/queries/leads.ts`, sans `'use cache'` comme les autres lectures admin) : `findAllLeadsForAdmin` et `findLeadByIdForAdmin(personId)` aplatissent la personne et son rôle en un type `AdminLead` (`id` = `personId`, champs de la personne, champs du rôle, `hasContactRole` posé à `false` en attendant `13`) ; `src/server/queries/persons.ts` expose `findPersonOptions()` (personnes non opposées, pour les actions, les entretiens et les signaux à venir) et `findPersonOptionsWithLeadRole()` (apporteur d'une opportunité, `14`), toutes deux typées `PersonOption` (`id`, `name` calculé par `personDisplayName`, `company: { name } | null`) ; un correspondant, un apporteur ou un destinataire ne se choisit jamais parmi les personnes opposées
- **Libellés** : `LEAD_ORIGIN_LABELS`, `LEAD_STATUS_LABELS`, `LEAD_INTEREST_LABELS`, `LEAD_CHANNEL_LABELS`, `LEAD_FIELD_LABELS` (champs du rôle seulement) dans `src/lib/leads.ts` ; `PERSON_FIELD_LABELS` et `personDisplayName` dans `src/lib/persons.ts` ; `JOB_ROLE_LABELS` dans `src/lib/job-roles.ts` ; les valeurs affichées reprennent celles de la maquette (« Hors ICP »…)
- **Glyphes** : `LEAD_STATUS_ICONS`, `LEAD_INTEREST_ICONS`, `LEAD_ORIGIN_ICONS`, `LEAD_CHANNEL_ICONS` dans `src/lib/leads.ts`, chacune `Record<Enum, IconComponent | null>` (type `IconComponent` de `@/lib/icons`), glyphes Lucide en imports nommés : statut Nouveau `Sparkles`, Suspect `Search`, Discussion `MessagesSquare`, Hors ICP `Ban`, Perdu `CircleX`, Stand-by `CirclePause` ; intérêt Hot `Flame`, Warm `Sun`, Cold `Snowflake` ; origine Inbound `ArrowDownLeft`, Outbound `ArrowUpRight` ; canal LinkedIn `LinkedinIcon` (`@/lib/icons`), Site web `Globe`, Candidature `FileText`, Plateforme `Store`, Référence `Handshake`, Évènement `Calendar`, Cold Email `Mail`, Cold Call `Phone`, Autre sans glyphe (`null`)
- **Pour le `09`** : à l'opposition simple (art. 21), les actions de prospection de la personne sont gardées comme historique, jamais réutilisé ; `erasePersonExchanges` (art. 17.1.c) les supprimera dans sa transaction une fois le modèle des actions créé. Le `09` déduit aussi le dernier contact émanant de la personne des actions au statut Répondu ou Converti, point de départ des 3 ans (`01`)
- **Rules** : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : lead minimal
**GIVEN** une demande de création avec seulement un nom et l'origine Outbound
**WHEN** l'action `createLead` s'exécute
**THEN** la personne et son rôle Lead sont créés au statut Nouveau, sans intérêt renseigné ni entreprise

### Scénario 2 : nom manquant
**GIVEN** une demande de création sans nom
**WHEN** l'action `createLead` s'exécute
**THEN** l'action refuse sur le champ Nom avec « Le nom est requis », rien n'est écrit

### Scénario 3 : doublon refusé
**GIVEN** une personne existante « Claire Morel » dont le LinkedIn est `https://www.linkedin.com/in/claire-morel`
**WHEN** on crée un lead avec `fr.linkedin.com/in/Claire-Morel/`
**THEN** l'action refuse avec « Ce lead existe déjà : Claire Morel » sur le champ LinkedIn, rien n'est écrit

### Scénario 4 : opposition
**GIVEN** une personne au rôle Lead avec nom, email, LinkedIn, entreprise, notes et détails
**WHEN** l'action `optOutPerson` s'exécute
**THEN** la personne ne garde que son email, son LinkedIn, la date du stop et son rôle Lead inchangé
**AND** créer un lead avec cet email est refusé avec « Cette personne s'est opposée à la prospection le » suivi de la date

### Scénario 5 : opposition sans identifiant
**GIVEN** une personne sans email ni LinkedIn
**WHEN** l'action `optOutPerson` s'exécute
**THEN** la personne est supprimée

### Scénario 6 : effacement des échanges
**GIVEN** une personne opposée depuis le 10 mars
**WHEN** l'action `erasePersonExchanges` s'exécute
**THEN** `exchangesErasedAt` est posée à la date du jour
**AND** un second appel ne change plus cette date

### Scénario 7 : fiche verrouillée
**GIVEN** une personne opposée
**WHEN** l'action `updateLead` s'exécute sur son rôle
**THEN** la modification est refusée avec `lead_opted_out_locked`, sa suppression reste possible

### Scénario 8 : suppression sans autre rôle
**GIVEN** une personne au seul rôle Lead
**WHEN** l'action `deleteLead` s'exécute
**THEN** le rôle est retiré et la personne est supprimée avec lui

### Scénario 9 : entreprise supprimée
**GIVEN** un lead rattaché à une entreprise sans projet
**WHEN** on supprime l'entreprise
**THEN** le lead reste, sans entreprise

## Tests à écrire

### Unit
- `src/lib/linkedin.test.ts` :
  - normalizes the host, the case, a trailing slash and query parameters
  - accepts a profile URL typed without a scheme
  - rejects a company page and another site
- `src/server/actions/leads.test.ts` :
  - rejects a missing origin
  - rejects a missing name
  - rejects a score outside 0 to 10
  - rejects notes longer than 200 characters
  - lowercases the email and normalizes the LinkedIn URL before saving
  - stores the "aucun" sentinel as null for interest, channel, job role and company
  - refuses an email or LinkedIn already used by another person, naming it
  - refuses a person who opted out, giving the date
  - maps a concurrent uniqueness violation to the duplicate message
  - maps a missing company to the company field
  - ignores the lead being edited when checking duplicates
  - refuses to update an opted-out lead
  - removes the person along with the lead role
  - rejects a call without a session, before touching the database
- `src/server/actions/persons.test.ts` :
  - clears everything but email and LinkedIn when a person opts out
  - deletes a person that opts out without email nor LinkedIn
  - keeps the first opt-out date when a person opts out twice
  - erases the exchange trace only once
  - refuses to erase exchanges of a person who never opted out

## Edge cases

- **Même personne, deux emails** (personnel et professionnel) : deux personnes possibles si aucun lien LinkedIn ne les relie ; le lien LinkedIn, renseigné sur l'une, bloque l'autre
- **Personne passée chez un concurrent** : même personne, on change son entreprise ; son email professionnel change, son LinkedIn reste
- **Adresse générique** (`contact@`, `info@`) : acceptée ; elle bloque un second lead de la même entreprise avec cette même adresse, ce qui invite à renseigner l'email nominatif
- **Lead qui répond après deux ans** : sa réponse s'enregistre comme une action de prospection au statut Répondu (`09`), qui fait repartir les 3 ans de conservation à sa date, sans champ dédié sur le lead
- **Suppression avec un autre rôle** : hors de portée du `07`, le rôle Contact n'existant pas encore ; `13` conditionnera la suppression de la personne à l'absence de ce second rôle

## Architectural decisions

### Décision : où garder la trace d'une opposition

**Options envisagées :**
- **A. Une liste d'opposition à part** : la personne est supprimée, une table dédiée garde email, LinkedIn et date, vérifiée à la création
- **B. La personne elle-même, vidée** : une seule table, l'unicité de l'email et du LinkedIn bloque à la fois les doublons et les personnes opposées

**Choix : B**

**Rationale :**
- Choix du propriétaire : pas de table à part pour rien
- La même règle d'unicité sert aux doublons ordinaires

### Décision : comment reconnaître une personne

**Options envisagées :**
- **A. Nom et entreprise** : disponibles sur presque toutes les fiches, mais homonymes, changements d'entreprise et entreprise souvent absente
- **B. Email et lien LinkedIn** : propres à une personne ; un lead sans aucun des deux n'est pas reconnu comme doublon

**Choix : B**

**Rationale :**
- Seuls identifiants stables et uniques ; l'un des deux existe dès qu'on peut contacter la personne
- Le lien LinkedIn ramené à une forme unique reconnaît la même personne quelle que soit la façon dont l'adresse a été copiée
