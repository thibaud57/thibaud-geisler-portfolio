---
feature: "Feature 3 : Outils de l'app pour les agents"
subproject: "outils-crm-personnes"
goal: "Ajouter les leads et les contacts aux outils génériques du CRM sous les mêmes gardes que l'admin (doublons, opposition RGPD) et déclarer Anthropic comme destinataire de ces données."
status: "implemented"
complexity: "L"
tdd_scope: "full"
execution: "subagent-driven"
model: "opus"
effort: "high"
depends_on: ["03-outils-crm-entreprises-design.md"]
date: "2026-11-06"
---

# Outils CRM : leads et contacts

## Scope

Couvre les entrées `lead` et `contact` du registre des outils CRM : recherche, lecture, requête, création (dont le rattachement d'un contact à un lead existant) et modification. S'y ajoute la sortie de la logique de `src/server/actions/leads.ts` et `contacts.ts` vers `src/server/crm/`, avec les gardes de personnes déplacées dans la couche de domaine. Le volet RGPD d'Anthropic comme destinataire couvre le registre des traitements, la politique de confidentialité et l'évaluation d'impact. Exclut l'opposition et l'effacement des échanges (admin seul), la suppression, l'écriture du `score` par les outils (qualification de la Feature 4) et les actions de prospection (sub-project 05).

### État livré

À la fin de ce sub-project, on peut : depuis Claude Code, chercher une personne par son nom ou son email, lire un lead et ses liens, créer un lead, le promouvoir en contact et modifier sa fiche, chaque doublon ou personne opposée étant refusé avec un message qui la nomme. La politique de confidentialité du site nomme Anthropic parmi les destinataires.

## Dependencies

- `03-outils-crm-entreprises-design.md` (statut: implemented) : couche `src/server/crm/`, `DomainResult`, `saveEntity` avec `onDomainError` (qui rend l'état du formulaire et indique s'il faut invalider les caches), registre `CRM_ENTITIES`, `replaceDetailsSection`, helpers de résultat d'outil

## Files touched

- **À créer** : `src/server/crm/person-guards.ts` (gardes déplacées de `src/server/actions/_support/person-guards.ts`, `PersonConflictError` porteuse de données, `PersonLockedError`)
- **À créer** : `src/server/actions/_support/person-form.ts` (`collectPersonValues`, formulations des doublons, `personConflictMessage`, `conflictErrors`)
- **À créer** : `src/server/actions/_support/person-form.test.ts`
- **À supprimer** : `src/server/actions/_support/person-guards.ts`
- **À créer** : `src/server/crm/leads.ts`, `src/server/crm/contacts.ts`
- **À créer** : `src/server/crm/leads.integration.test.ts`, `src/server/crm/contacts.integration.test.ts`
- **À modifier** : `src/server/actions/leads.ts`, `src/server/actions/contacts.ts` (adaptateurs)
- **À modifier** : `src/server/actions/leads.test.ts`, `src/server/actions/contacts.test.ts`
- **À modifier** : `src/server/actions/contacts.integration.test.ts` (les cas de rattachement migrent vers `src/server/crm/contacts.integration.test.ts`, le fichier garde `deleteContact`, `deleteLead`, `optOutPerson` et deux cas d'adaptation)
- **À modifier** : `src/server/actions/prospecting-actions.ts`, `src/server/actions/persons.ts`, `src/server/actions/interviews.ts`, `src/server/actions/opportunities.ts`, `src/server/actions/companies.ts`, `src/server/mcp/crm/entities/company.ts` (chemin des gardes et de `revalidatePersonLists`, `assertNewIdentity` sans `wording`, textes des conflits par `personConflictMessage`)
- **À modifier** : `src/server/actions/persons.types.ts` (`PersonLockedError` retirée, sans réexport : elle vit dans `src/server/crm/person-guards.ts`, ce fichier ne portant que des types côté client)
- **À modifier** : `docs/ARCHITECTURE.md` (ligne `revalidatePersonLists` du tableau des mécanismes et § Protection Données : chemin des gardes)
- **À créer** : `src/server/mcp/crm/entities/lead.ts`, `src/server/mcp/crm/entities/contact.ts`
- **À créer** : `src/server/mcp/crm/person-ref.ts` et `src/server/mcp/crm/person-ref.test.ts` (rendu d'une personne liée, partagé avec le 05)
- **À modifier** : `src/server/mcp/crm/registry.ts` (deux entrées)
- **À modifier** : `src/server/mcp/crm/tools.integration.test.ts`
- **À modifier** : `src/server/queries/{leads,contacts,persons}.ts` (lecture légère pour la recherche, requête paginée)
- **À modifier** : `prisma/schema.prisma` (valeurs `AI_ASSISTANT` de `ProcessingKind` et `PROFESSIONAL_INFO` de `DataCategory`)
- **À créer** : `prisma/migrations/<horodatage>_processing_kind_ai_assistant/migration.sql` (valeurs d'enum)
- **À créer** : `prisma/migrations/<horodatage>_recipient_anthropic/migration.sql` (insertion du destinataire)
- **À modifier** : `src/lib/schemas/legal-keys.ts` (clé `recipientTerms`, que le test existant `legal-keys.test.ts` contrôle dans les deux langues)
- **À modifier** : `messages/fr.json`, `messages/en.json` (`Legal.processingKind.AI_ASSISTANT`, `Legal.dataCategory.PROFESSIONAL_INFO`, `Legal.retention.recipientTerms`, `PrivacyPolicy.lastUpdated` et la reformulation « destinataires » de `PrivacyPolicy.recipients.intro` et `PrivacyPolicy.recipients.tableHeaders.name`)
- **À modifier** : `content/legal/fr/confidentialite-intro.md`, `content/legal/en/confidentialite-intro.md` (puce « Prospection »)
- **À modifier** : `docs/registre-traitements.md` (traitement 7, date du frontmatter)

## Architecture approach

- **Gardes dans la couche de domaine** : `assertNewIdentity`, `assertNotOptedOut`, `assertOptOutOver`, `assertProspectionAllowed`, `deletePersonIfRoleless` et `revalidatePersonLists` passent dans `src/server/crm/person-guards.ts`, avec `PersonLockedError` (qui quitte `persons.types.ts`). Une action ne doit pas fournir sa logique au domaine. Les gardes lèvent toujours à l'intérieur des transactions, ce qui annule l'écriture. `assertNewIdentity` ne reçoit plus de formulation et ne contrôle que les identifiants fournis et non nuls : le patch d'une personne qui ne change que l'email ne lit pas son LinkedIn
- **`PersonConflictError` porte des données, sans message de formulaire** : elle enveloppe un `PersonConflict`, union discriminée par `reason` :
  - `exists` : `field`, nom de la personne trouvée (nul si elle n'en a pas) et `roles` (`lead`, `contact`)
  - `opted_out` : `field` et `optedOutAt`
  - `person_missing`, `not_a_lead` et `no_lead_role` : champ `personId`, sans donnée
  
  Les cinq raisons couvrent les textes d'aujourd'hui (`contacts.ts`, `prospecting-actions.ts`), là où une raison unique `not_found` ne pouvait pas rendre « n'existe plus », « n'est pas un lead » et « n'a pas de fiche lead ». Le nom est porté sous `personName` : `name` est déjà une propriété d'`Error`
- **Textes des conflits côté adaptateur** (`src/server/actions/_support/person-form.ts`) : `personConflictMessage(conflict, wording?)` rend les textes d'aujourd'hui (doublon selon le rôle de la formulation, opposition datée, les trois absences) et `conflictErrors(conflict, wording?)` les range sur le champ en conflit. Les quatre formulations (lead, contact, contact en création, correspondant) y sont définies une seule fois. Un test unitaire paramétré couvre chaque texte. Toute action qui lisait `err.message` d'une `PersonConflictError` appelle `personConflictMessage`, dont `changeProspectingActionStatus` et `rescheduleProspectingAction`
- **Domaine des leads** (`src/server/crm/leads.ts`) :
  - `createLead(data: LeadWriteData)` : `LeadWriteData` est `LeadInput` dont le `score` devient facultatif (l'admin le passe, l'outil jamais)
  - `updateLead(personId: PersonId, patch: LeadPatch)`, `LeadPatch` étant un `Partial` de `LeadWriteData` avec `detailsSection` résolue dans la transaction (motif du 03). Un champ absent reste inchangé
  
  `PersonWriteError`, union discriminée par `code`, vaut :
  - `person_conflict` : porte un `PersonConflict` (doublon, opposition, absence)
  - `identity_taken` : violation d'unicité vue en base (P2002) sans lecture préalable, avec le `field` en cause, sans nom ni rôles
  - `person_locked` : fiche opposée, non modifiable
  - `company_not_found` : clé étrangère de l'entreprise (P2003)
  - `not_found` : P2025 avec fiche réellement absente
  - `no_details` et `section_not_found` (avec les titres présents)
  
  Le comportement est celui des actions d'aujourd'hui : verrou d'opposition avant le contrôle d'identité, P2002 et P2003 traduits
- **Domaine des contacts** (`src/server/crm/contacts.ts`) :
  - `createContact(data: ContactWriteData)` : nouvelle personne
  - `attachContact(leadId: PersonId, data: { types; status })` : rôle contact posé sur un lead existant, gabarit des Détails remplacé par `detailsAfterContactPromotion`. La lecture verrouillée de `assertAttachable` passe dans ce module et lève `person_missing`, `opted_out` (avec sa date, comme dans l'admin, là où `updateLead` et `updateContact` rendent `person_locked`), `not_a_lead`, ou `exists` quand la personne est déjà contact (avec son nom et ses deux rôles)
  - `updateContact(personId, patch)`
  
  Mêmes erreurs que les leads. Le mapping P2002 reprend celui des contacts d'aujourd'hui : `Contact_pkey` ou `personId` donne le champ `personId`, `linkedinUrl` le champ `linkedinUrl`, tout autre cas `email`. Le mapping P2003 distingue `personId` (`person_conflict` de raison `person_missing`) de l'entreprise (`company_not_found`)
- **Adaptateurs** : les Server Actions gardent leurs codes de message (`lead_exists`, `lead_opted_out`, `lead_opted_out_locked`, `contact_exists`, `contact_opted_out`, `person_not_found`…) et leurs textes, par un `switch` exhaustif sur `code` et sur `reason`. Le `onDomainError` du 03 rend l'état du formulaire avec `invalidate: true` pour `not_found` seulement, comme le chemin P2025 actuel de `saveEntity` : l'écran périmé se réaligne sur la base. Côté outils, chaque code devient un message qui nomme la correction. Exemples : « Cette personne existe déjà comme lead : fetch-la par crm_search », « opposée à la prospection le … : ne pas la recréer »
- **Entrées du registre** (`entities/lead.ts`, `entities/contact.ts`), sur les conventions du 03, chacune produite par `defineCrmEntity` du 03 et typée par ses schémas de requête, de création et de modification :
  - Schémas en `z.strictObject` : un champ inconnu ou exclu est refusé, jamais ignoré en silence. Le 03 suit la même règle
  - Définitions communes de `src/lib/schemas/person.ts` et `lead.ts` : nom 120, email, URL LinkedIn normalisée par `normalizeLinkedinProfileUrl`, `NOTES_MAX_LENGTH`, énumérations `LeadOrigin`, `LeadStatus`, `LeadInterest`, `LeadChannel`, `ContactType`, `ContactStatus`, `JobRole`, `Zone`, `companyIdSchema`, `personIdSchema`
  - `score`, `optedOutAt` et `exchangesErasedAt` restent hors des schémas d'écriture
- **Personnes opposées, décision B** : une personne opposée n'est connue de l'agent que par l'identifiant qu'il a déjà. Trois règles :
  - `crm_query` ne la liste jamais (le filtre `optedOut` n'existe pas) : elle n'apparaît ni dans une liste sans filtre ni dans un filtre
  - `crm_search` la rend seulement quand la requête correspond exactement, après normalisation, à son email (minuscules, sans espaces) ou à son URL LinkedIn (`normalizeLinkedinProfileUrl`). Un fragment, un nom ou un identifiant LinkedIn tronqué ne la rend pas. Le résultat porte `label` « Opposée à la prospection », l'identifiant trouvé en `hint` et `optedOut: true`, sans nom : l'agent sait qu'il ne doit pas la recréer. Le type `SearchHit` du 03 s'étend pour cela d'un champ facultatif `optedOut?: true` (`src/server/mcp/crm/registry.ts`)
  - Une fiche liée qui la cite (apporteur, correspondant d'un entretien : sub-project 05) la rend `{ id, name: null, optedOut: true }`, sans email ni LinkedIn, par `personRef(person)` (`src/server/mcp/crm/person-ref.ts`). `crm_fetch` d'une fiche opposée rend aussi `{ id, name: null, optedOut: true, optedOutAt }` sans email ni LinkedIn, qui restent en clair en base (`OPTED_OUT_CLEARED`, `src/lib/crm/persons.ts`) pour la recherche et la garde de doublon
- **Recherche** :
  - Personnes qui ont un rôle, correspondance par inclusion sur le nom, l'email et l'URL LinkedIn normalisée, en mémoire après `normalizeForSearch`, personnes opposées exclues sauf correspondance exacte (règle ci-dessus)
  - `label` : le nom ; `hint` : entreprise et rôles (« Acme · lead et contact »)
- **Lecture** :
  - `crm_fetch` lead : la fiche aplatie de `AdminLead`, son entreprise, ses rôles, ses opportunités apportées, ses entretiens, ses signaux, le nombre de ses actions de prospection
  - `crm_fetch` contact : `AdminContact` et ses liens
  - Une fiche opposée rend sa forme réduite (règle ci-dessus)
- **Requête** :
  - leads : filtres `status`, `origin`, `interest`, `channel`, `companyId`, `jobRole`, `zone`, personnes opposées exclues
  - contacts : filtres `types`, `status`, `companyId`, `jobRole`, `zone` (une personne opposée perd son rôle contact à l'opposition)
  - tri et pagination du 03
- **Création** :
  - `crm_create` lead applique `leadDetailsTemplate(origin)` quand `details` manque
  - `crm_create` contact applique `CONTACT_DETAILS_TEMPLATE`, ou rattache un lead existant par `{ fromLeadId, types, status }` à la place des champs de personne (union discriminée sur la présence de `fromLeadId`)
- **Invalidation et logs** : `revalidatePersonLists()` après chaque écriture d'outil. Événements des actions réutilisés (`lead:created`, `lead:updated`, `contact:created`, `contact:updated` et leurs `*_failed`), par `ctx.log` (`CrmWriteContext` du 03, logger de la requête qui porte `action: 'mcp'`, `requestId` et `keyId`), avec `personId`, jamais un nom ni un email (`.claude/rules/pino/usage.md`)
- **Anthropic destinataire, décisions du propriétaire du 2026-11-06** :
  - L'abonnement Claude est conservé. Anthropic Ireland, Limited est responsable de traitement distinct : son DPA ne couvre que les offres commerciales (`anthropic.com/legal/data-processing-addendum` et `privacy.claude.com`, consultés le 2026-11-06). La base légale est l'intérêt légitime du traitement 7
  - **Politique de confidentialité** : la ligne du destinataire s'insère par une migration de données, sans écran ni saisie manuelle. PostgreSQL refuse d'employer une valeur d'enum ajoutée dans la même transaction : deux migrations, `_processing_kind_ai_assistant` pour les valeurs d'enum, puis `_recipient_anthropic` pour l'insertion :
    - valeurs d'enum : `AI_ASSISTANT` (`ProcessingKind`) et `PROFESSIONAL_INFO` (`DataCategory`, « Informations professionnelles (poste, entreprise, notes d'échanges) »), les fiches lues par l'assistant portant plus que l'identité et les coordonnées
    - `Address` : l'adresse d'Anthropic Ireland, Limited à Dublin
    - `LegalEntity` : slug `anthropic-ireland`, nom `Anthropic Ireland, Limited`, `legalForm` nul (forme étrangère hors de l'enum)
    - `DataProcessing` :
      - slug `anthropic-ai-assistant`, `kind` `AI_ASSISTANT`
      - `dataCategories` `IDENTITY`, `CONTACT` et `PROFESSIONAL_INFO`
      - `retentionPolicyKey` `recipientTerms`, `legalBasis` `LEGITIMATE_INTERESTS`, `outsideEuFramework` nul, `displayOrder` après les lignes existantes
      - `purposeFr` « Assistant IA (Claude) qui consulte et met à jour les fiches de prospection à la demande du responsable », `purposeEn` « AI assistant (Claude) that reads and updates prospecting records at the controller's request »
    
    Le SQL fournit lui-même les colonnes sans défaut en base (`id` par `uuidv7()` de PostgreSQL 18, `updatedAt` par `now()`), les autres (`createdAt`, `displayOrder`) ayant leur défaut. Il est idempotent : `ON CONFLICT (slug) DO NOTHING` sur `LegalEntity` et `DataProcessing` seulement (`Address` n'a pas de slug) et l'adresse n'est insérée, dans un CTE, que si l'entité n'existe pas encore. L'adresse se relit sur `anthropic.com/legal/privacy` au moment d'écrire la migration et le propriétaire valide les valeurs avant le commit (point d'arrêt du plan). Ce sont des informations publiques, que le site affiche de toute façon. La date de mise à jour de la politique (`PrivacyPolicy.lastUpdated` des deux fichiers de messages) prend le jour de la modification
  - **Libellés du tableau** : le tableau des destinataires mêle des sous-traitants et un responsable distinct. `PrivacyPolicy.recipients.intro` et l'en-tête de colonne `PrivacyPolicy.recipients.tableHeaders.name` parlent de « destinataires » (FR et EN), plus de « sous-traitants »
  - **Hébergement aux États-Unis** : il se dit dans la puce « Prospection » de `confidentialite-intro.md` (FR et EN), sans ligne de transfert hors UE : le destinataire est établi en Irlande et le transfert vers ses serveurs américains relève de lui, sous clauses contractuelles types selon sa politique
  - **Registre, traitement 7**, sans détail du compte (ni offre souscrite ni réglage, le dépôt étant public) :
    - Anthropic ajouté aux destinataires, comme responsable distinct, quand le propriétaire consulte ou met à jour les fiches par l'assistant Claude
    - hébergement hors UE selon sa politique
    - conservation « selon les conditions d'Anthropic »
    - information des personnes par la politique de confidentialité
    - `date` du frontmatter mise au jour de la modification
  - **Évaluation d'impact** : elle reste non nécessaire. Aucune décision automatisée n'évalue les personnes : le `score` n'est pas écrit par les agents dans cette feature. La ligne AIPD le dit et renvoie la réévaluation à la qualification par agent de la Feature 4
  - La même déclaration couvre les passages des leads par une session Claude lors des reprises des données Notion : celle de la Feature 2, chargée le 2026-10-14, puis le nouvel instantané de la bascule de la Feature 4
- **Docs** : `docs/ARCHITECTURE.md` se met à jour par `Skill[architecture-doc]` (chemin des gardes, deux occurrences)

## Acceptance criteria

### Scénario 1 : recherche d'une personne
**GIVEN** un lead « Jane Doe » de l'entreprise Acme, email `jane.doe@example.com`
**WHEN** un agent appelle `crm_search` avec `{ query: 'jane doe' }`, puis `{ query: 'jane.doe@example' }`
**THEN** les deux résultats la contiennent avec `entity: 'lead'`, son nom en `label` et « Acme · lead » en `hint`

### Scénario 2 : doublon refusé
**GIVEN** un lead d'email `jane.doe@example.com`
**WHEN** un agent crée un lead avec le même email
**THEN** le résultat rend `isError` en nommant Jane Doe et son rôle de lead et aucune personne n'est créée

### Scénario 3 : personne opposée
**GIVEN** une personne opposée à la prospection le 2026-10-01, identifiée par son email `john.roe@example.com`
**WHEN** un agent appelle `crm_search` avec `{ query: 'john.roe@example.com' }`, puis avec `{ query: 'john.roe' }`, puis `crm_query` sur les leads sans filtre, puis crée un lead avec cet email
**THEN** la première recherche la rend sans nom avec `optedOut: true`, la deuxième ne rend rien, `crm_query` ne la liste pas et la création rend `isError` avec la date d'opposition
**AND** `crm_update` sur cette fiche rend `isError` (fiche verrouillée) et `crm_fetch` rend `{ id, name: null, optedOut: true, optedOutAt }` sans email

### Scénario 4 : création, promotion et modification
**GIVEN** une entreprise Acme
**WHEN** un agent crée un lead `OUTBOUND` rattaché à Acme sans `details`, le promeut en contact par `fromLeadId`, puis modifie la section « Relation » du contact
**THEN** le lead reçoit le gabarit `OUTBOUND`, la promotion remplace le gabarit resté intact par celui du contact et la section « 🤝 Relation » contient le texte écrit

### Scénario 5 : champ exclu refusé
**GIVEN** un lead existant
**WHEN** un agent appelle `crm_update` avec `fields: { score: 8 }`
**THEN** le résultat rend `isError` sur le champ inconnu et le score reste inchangé

### Scénario 6 : requête filtrée
**GIVEN** des leads de statuts variés dont 3 `DISCUSSION`
**WHEN** un agent appelle `crm_query` avec `{ entity: 'lead', filters: { status: 'DISCUSSION' } }`
**THEN** la réponse porte 3 lignes résumées et `total: 3`

### Scénario 7 : admin inchangé
**GIVEN** les formulaires lead et contact de l'admin
**WHEN** l'admin enregistre un doublon, une personne opposée, puis une saisie valide
**THEN** les codes de message, les textes et les invalidations sont ceux d'avant ce sub-project

### Scénario 8 : politique de confidentialité
**GIVEN** la migration appliquée
**WHEN** un visiteur ouvre `/fr/confidentialite` puis `/en/confidentialite`
**THEN** le tableau des destinataires liste Anthropic Ireland, Limited (assistant IA, identité, coordonnées et informations professionnelles, conservation selon les conditions du destinataire, Irlande), sous un en-tête de colonne et une introduction qui parlent de destinataires
**AND** la puce « Prospection » mentionne l'assistant IA et l'hébergement aux États-Unis sous clauses contractuelles types

## Tests à écrire

### Unit
- `src/server/actions/_support/person-form.test.ts` : `personConflictMessage`, test paramétré qui couvre chaque texte d'aujourd'hui (doublon avec la formulation lead, contact, contact en création et correspondant, doublon sans rôle connu, opposition datée, personne absente, pas un lead, pas de fiche lead)
- `src/server/mcp/crm/person-ref.test.ts` : une personne opposée rendue `{ id, name: null, optedOut: true }`, une autre avec son nom
- `src/server/actions/leads.test.ts`, `contacts.test.ts` : cas existants maintenus, persistance mockée au niveau de `src/server/crm/`
- Le contrôle des clés de traduction (dont `recipientTerms`) reste celui de `src/lib/schemas/legal-keys.test.ts`, qui échoue tant que les messages manquent

### Integration
- `src/server/crm/leads.integration.test.ts` (base de test, données Jane Doe / Acme / `example.com`) :
  - création, `person_conflict` de raison `exists` avec nom et rôles, de raison `opted_out` avec date (l'opposition primant sur un doublon de l'autre identifiant)
  - `person_locked` à la modification d'une fiche opposée
  - `company_not_found`, `not_found`, patch partiel (un patch d'email seul ne lit pas le LinkedIn), section des Détails
- `src/server/crm/contacts.integration.test.ts` (cas repris de `src/server/actions/contacts.integration.test.ts` et réécrits sur le `DomainResult`) :
  - création directe
  - rattachement : rôle posé, gabarit remplacé s'il est intact, texte écrit gardé, `not_a_lead`, `exists` quand la personne est déjà contact, `opted_out`, `person_missing`
  - `identity_taken` par champ (`personId`, `linkedinUrl`, `email`) et `company_not_found` contre `person_missing` sur P2003
- `src/server/actions/contacts.integration.test.ts` : `deleteContact`, `deleteLead`, `optOutPerson`, plus le message `contact_opted_out` et le texte « Cette personne n'est pas un lead » rendus par l'adaptateur
- `src/server/mcp/crm/tools.integration.test.ts` (`next/cache` mocké comme dans `src/server/actions/contacts.integration.test.ts`) :
  - `crm_search` personnes par nom, par email, casse et accents ignorés, personne opposée rendue seulement sur son email ou son LinkedIn exact
  - `crm_fetch` lead avec ses liens, fiche opposée réduite sans email
  - `crm_query` leads filtrés et contacts filtrés, personne opposée absente d'une liste sans filtre
  - `crm_create` lead avec gabarit, contact direct, contact par `fromLeadId`
  - doublon et personne opposée rendent `isError`
  - `crm_update` refuse `score` et une fiche verrouillée

## Edge cases

- **Les deux identifiants d'une personne correspondent à deux fiches distinctes** : l'opposition prime dans le message, comme dans l'admin (tri de `findIdentityConflict`)
- **Opposition enregistrée dans l'admin pendant une écriture d'outil** : le verrou de ligne des gardes fait attendre l'écriture, qui reçoit `person_locked` ou `opted_out`
- **Lead sans nom** (fiche opposée) : `crm_search` le rend par son identifiant seulement sur correspondance exacte, `crm_query` ne le rend jamais, jamais par une chaîne vide
- **Migration rejouée** (base de dev réinitialisée, redéploiement) : l'insertion idempotente ne duplique ni le destinataire ni son adresse. La table vidée par `resetDatabase` dans les tests n'a pas d'effet sur la prod
- **Cache de la page légale** : `getDataProcessors` est caché sous le tag `legal-entity`. Une ligne insérée par migration apparaît au redéploiement qui l'applique, le cache en mémoire repartant à froid

## Architectural decisions

### Décision : erreurs des gardes de personnes

**Options envisagées :**
- **A. Réécrire les gardes pour qu'elles rendent un résultat** : chaque transaction devrait annuler à la main ce qu'elle a déjà écrit
- **B. Garder les gardes qui lèvent dans la transaction, convertir en `DomainResult` à la sortie de la fonction de domaine** : la levée annule la transaction, l'appelant reçoit une union typée

**Choix : B**

**Rationale :**
- Une exception dans `prisma.$transaction` est le mécanisme d'annulation de Prisma
- Les adaptateurs voient le même `DomainResult` que pour l'entreprise

### Décision : personnes opposées dans les outils

**Options envisagées :**
- **A. Les cacher partout** : l'agent ne les voit pas, tente de les recréer et bute sur la garde
- **B. Les rendre sans nom, signalées `optedOut`, seulement sur une correspondance exacte de leur email ou de leur identifiant LinkedIn dans `crm_search`, jamais dans `crm_query` et réduites à `{ id, name: null, optedOut: true }` quand une fiche liée les cite** : l'agent sait d'emblée qu'il ne doit pas les prospecter et seul l'identifiant déjà connu de lui circule

**Choix : B**

**Rationale :**
- La fiche vidée existe précisément pour empêcher la reprospection : la montrer comme telle sert sa finalité
- Une liste ou une recherche partielle exposerait les emails et les LinkedIn de toutes les personnes opposées, ce que la finalité de la fiche vidée ne demande pas

### Décision : insertion du destinataire

**Options envisagées :**
- **A. Saisie manuelle en base de prod** (Prisma Studio) : rien dans le dépôt, mais une étape à ne pas oublier après chaque base neuve
- **B. Migration de données idempotente** : versionnée et rejouée partout, avec des informations publiques de toute façon affichées par le site

**Choix : B**

**Rationale :**
- Choix du propriétaire du 2026-11-06 : les mentions légales changent rarement, le code suffit, sans page de réglages ni éditeur
