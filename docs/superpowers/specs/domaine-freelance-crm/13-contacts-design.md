---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "contacts"
goal: "Ajouter à une personne le rôle Contact (réseau professionnel durable) dans l'espace admin : formulaire avec choix d'un nouveau contact ou d'un contact depuis un lead, liste, vue détail, suppression et opposition RGPD partagée avec les leads."
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: ["07-leads-donnees-design.md", "08-ecran-leads-design.md", "09-actions-prospection-donnees-design.md", "10-ecran-actions-prospection-design.md"]
date: "2026-09-29"
---

# Contacts et relations

## Scope

Ajoute le modèle `Contact` comme rôle d'une personne (clé `personId`, types, statut), sa validation, ses Server Actions (création, modification, suppression) et l'écran Contacts : liste avec recherche, colonnes masquables et filtres, page de création et de modification en cards avec Détails pré-rempli, vue détail avec bloc Pipeline symétrique du bloc Réseau du lead, suppression. À la création, choisir un lead sans rôle Contact (« Depuis un lead ») remplit le formulaire depuis lui, en lecture ; l'opposition RGPD réutilise `OptOutPersonDialog` et `ErasePersonExchangesDialog` du `08`. Exclut les blocs Opportunités (`15`) et Signaux (`19`), tout historique d'échanges structuré (l'historique reste du texte dans Détails ou une action de prospection) et la reprise des contacts Notion (`20`).

### État livré

À la fin de ce sub-project, on peut : ouvrir Contacts dans le menu, créer un contact avec ses types, son entreprise et sa localité, le retrouver dans la liste et sa vue détail ; créer un autre contact en choisissant « Depuis un lead » un lead non pourvu du rôle Contact, voir le formulaire se remplir depuis lui en lecture, enregistrer et voir la personne porter les deux rôles ; passer un contact en « ne plus contacter » et ne plus garder que son email, son lien LinkedIn et la date ; supprimer un contact qui garde son rôle Lead et constater que la personne reste.

## Dependencies

- `07-leads-donnees-design.md` (statut: draft) : modèles `Person` et `Lead`, `personFields`, `linkedin.ts`, `job-roles.ts`, `persons.ts` (`PERSON_FIELD_LABELS`, `personDisplayName`, `OPTED_OUT_CLEARED`), `PersonLockedError`, `optOutPerson`, `erasePersonExchanges`
- `08-ecran-leads-design.md` (statut: draft) : motif de page en cards (`LeadForm`), `PERSON_SECTION_TITLES`, `OptOutPersonDialog`, `ErasePersonExchangesDialog`, `DetailDialog` à `onEdit` facultatif, `findCompanyOptions`, `details-templates.ts`
- `09-actions-prospection-donnees-design.md` (statut: draft) : modèle `ProspectingAction` (`personId`, `occurredAt`, `respondedAt`, `status`), source de la dernière interaction dérivée
- `10-ecran-actions-prospection-design.md` (statut: draft) : `src/lib/person-retention.ts` (`retentionEndOf`, `isRetentionOver`), échéance de revue

## Références de design

- **Maquette** : `isContacts`, `isContactForm` (champs), `isCompanyForm` (mise en page en cards, arbitrage « Page ou modale d'édition »), `dlgDeleteContact`, `dlgDetail`
- **Design system** : `patterns/DataTable`, `patterns/OptionsPopover`, `patterns/FacetFilter`, `patterns/SearchInput`, `patterns/PaginationFooter`, `patterns/DetailDialog`, `patterns/ConfirmDeleteDialog`, `patterns/BadgeList`, `patterns/TruncateTooltip`, `patterns/RowActionButton`, `patterns/ExternalUrl`, `patterns/EmptyState`, `patterns/EmptyValue`, `patterns/CompanyLogoTile`, `core/Card`, `core/AlertDialog`, `core/RadioGroup`, `core/Select`, `core/Combobox`, `core/Calendar`, `core/Popover`, `core/Input`, `core/Badge`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À modifier** : `prisma/schema.prisma` (enums `ContactType`, `ContactStatus`, modèle `Contact` réduit à son rôle, relation `Person.contact`)
- **À créer** : `prisma/migrations/<horodatage>_contacts/migration.sql`
- **À créer** : `src/lib/contacts.ts` (`CONTACT_TYPE_LABELS`, `CONTACT_STATUS_LABELS`, `CONTACT_TYPE_ICONS`, `CONTACT_STATUS_ICONS`, `CONTACT_FIELD_LABELS`, `CONTACT_SECTION_TITLES`) et `src/lib/contacts.test.ts` si un helper le justifie
- **À créer** : `src/lib/schemas/contact.ts`
- **À créer** : `src/server/actions/contacts.ts`, `src/server/actions/contacts.types.ts`, `src/server/actions/contacts.test.ts`
- **À créer** : `src/server/queries/contacts.ts`
- **À modifier** : `src/server/queries/leads.ts` (`hasContactRole` calculé, données du bloc Réseau)
- **À modifier** : `src/server/queries/persons.ts` (`findLeadsWithoutContactRole`, type `LeadWithoutContactRole`)
- **À modifier** : `src/lib/leads.ts` (`LEAD_SECTION_TITLES.network`)
- **À modifier** : `src/server/actions/leads.ts`, `src/server/actions/leads.test.ts` (`deleteLead` garde la personne si le rôle Contact reste)
- **À modifier** : `src/server/actions/persons.ts` (`optOutPerson` et `erasePersonExchanges` revalident aussi `/admin/contacts`)
- **À modifier** : `src/lib/details-templates.ts` et `src/lib/details-templates.test.ts` (gabarit contact)
- **À modifier** : `src/lib/admin-table-widths.ts` (colonnes des contacts)
- **À modifier** : `src/lib/person-retention.ts` et `src/lib/person-retention.test.ts` (`CONTACT_REVIEW_YEARS`)
- **À créer** : `src/components/features/admin/ReadOnlyField.tsx` (le `08` ne le consomme plus, `ContactForm` en devient le seul créateur)
- **À créer** : `src/components/features/admin/contacts/ContactForm.tsx`, `ContactsTable.tsx`, `DeleteContactDialog.tsx` (`OptOutPersonDialog`, `ErasePersonExchangesDialog`, `SelectField` du `08`, employés tels quels)
- **À modifier** : `src/components/features/admin/leads/LeadsTable.tsx` (bloc Réseau de la vue détail)
- **À créer** : `src/app/admin/(protected)/contacts/page.tsx` et `loading.tsx` (lit aussi `searchParams.detail`), `contacts/nouveau/page.tsx` et `loading.tsx`, `contacts/[id]/page.tsx` et `loading.tsx`
- **À modifier** : `src/config/admin-nav-items.ts` (entrée Contacts activée)
- **À créer** : `src/lib/person-links.ts` et `src/lib/person-links.test.ts` (`personDetailHref`, lien vers la vue détail lead ou contact d'une personne au rôle ambigu)
- **À modifier** : `src/server/queries/prospecting-actions.ts` (`lead`, `contact` ajoutés au `select` de la personne d'une action)
- **À modifier** : `src/components/features/admin/prospection/action-detail.tsx` (`11`, bascule sur `personDetailHref`)

## Architecture approach

- **Modèle** (`.claude/rules/prisma/schema-migrations.md`, schema `freelance`) : `Contact` ne porte plus que le rôle, sur le motif de `Lead` (`07`) :

| Champ | Type | Règle |
|---|---|---|
| `personId` | `String @id` vers `Person`, `onDelete: Cascade` | clé du rôle |
| `types` | `ContactType[]` : `COLLEGUE`, `CLIENT`, `PARTENAIRE`, `MENTOR`, `CONTACT_TECH`, `COMMERCIAL` | défaut `[]` |
| `status` | `ContactStatus` : `ACTIF`, `INACTIF`, `A_RECONTACTER` | défaut `ACTIF` |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz` | |

  Identité, coordonnées, entreprise, localité (singulière), notes, détails et opposition vivent sur `Person` (`07`) ; `Person.contact Contact?` complète le modèle. Plus de `leadId`, `lastInteractionAt`, `zones`, `optedOutAt` propres au contact
- **Validation** (`src/lib/schemas/contact.ts`, `.claude/rules/zod/schemas.md`) : `contactSchema` = `personFields` (`@/lib/schemas/person`, `07`) + `types` + `status`, plus `personId` facultatif pour poser le rôle sur une personne existante sans écrire ses champs (motif `leadSchema`, `07`) ; les champs de personne envoyés restent validés mais ignorés quand `personId` est fourni
- **Une fiche par personne** : sans `personId`, l'action cherche une autre personne portant le même email ou le même lien LinkedIn avant d'écrire (motif `assertNewIdentity` du `07`) : « Ce contact existe déjà : <nom> » (`contact_exists`) ou, pour une personne opposée, « Cette personne s'est opposée à la prospection le JJ/MM/AAAA » (`contact_opted_out`). Avec `personId`, l'action revérifie côté serveur que la personne n'est pas opposée et ne porte pas déjà le rôle Contact, sur le champ `personId` (mêmes messages) ; une personne disparue entre le picker et l'envoi renvoie `person_not_found`
- **Actions** (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, motif `leads.ts` du `07`) : `createContact` crée la personne et le rôle dans une transaction, ou pose le rôle Contact sur une personne existante ; `updateContact(personId, …)` écrit la personne et le rôle, refusée (`PersonLockedError`, `contact_opted_out_locked`) si la personne est opposée ; `deleteContact(personId)` retire le rôle et supprime la personne seulement si elle ne porte plus le rôle Lead. Plus d'`optOutContact` : `optOutPerson` et `erasePersonExchanges` (`07`) servent tels quels. `deleteLead` (`07`) reçoit la même règle symétrique côté leads : la personne reste si elle garde le rôle Contact. `revalidatePath("/admin/contacts", "layout")` après chaque écriture de contact ; `optOutPerson` et `erasePersonExchanges` revalident en plus `/admin/contacts` puisqu'une personne opposée peut porter ce rôle
- **Lectures** (`src/server/queries/contacts.ts`, sans `'use cache'`) : `findAllContactsForAdmin` et `findContactByIdForAdmin(personId)` aplatissent la personne et son rôle en un type `AdminContact` (`id` = `personId`, champs de la personne, `types`, `status`, `hasLeadRole`, `leadRole: { status, interest } | null` pour le bloc Pipeline, `lastInteractionAt` dérivé) ; `src/server/queries/persons.ts` expose `findLeadsWithoutContactRole()` (leads non opposés sans rôle Contact, avec tout ce que le formulaire affiche en lecture : champs de personne, entreprise), scopée au rôle Lead plutôt qu'à toute personne
- **`hasContactRole` du lead** (`src/server/queries/leads.ts`) : `AdminLead.hasContactRole` (posé à `false` par le `07`) se calcule depuis `person.contact`, avec `contactRole: { types, status } | null` pour le bloc Réseau de sa vue détail
- **Dernière interaction dérivée** (remplace le champ saisi) : la plus tardive entre le `respondedAt` le plus récent et l'`occurredAt` le plus récent d'une action de la personne hors statut À faire (`09`, `person.prospectingActions`). La colonne « Dernière interaction » lit ce dérivé
- **Revue** : « À conserver jusqu'au » et la facette Échéance appellent `retentionEndOf(retentionInput(contact), CONTACT_REVIEW_YEARS)` (`10`, `src/lib/person-retention.ts`) à partir de `Contact.createdAt` (création du rôle) et de la dernière interaction dérivée ; `CONTACT_REVIEW_YEARS` (3, déclarée dans `person-retention.ts`, ajoutée par ce sub-project) est un rappel métier, distinct du délai légal des prospects (`RETENTION_YEARS`, `01`), même si les deux valent aujourd'hui trois ans : une personne opposée reste soumise au seul délai légal, quel que soit l'appelant ; plus de `contactReviewDateOf` propre au contact
- **Gabarit** (`src/lib/details-templates.ts`, forme du `03` et du `08`) : `CONTACT_DETAILS_TEMPLATE` (Profil, Relation, Historique, Liens, Notes libres), posé sur `details` seulement à la création d'une nouvelle personne, jamais en modification ni quand un lead est choisi (son gabarit ou son contenu déjà renseigné n'est pas écrasé)
- **Formulaire** (`ContactForm`, page `/admin/contacts/nouveau` ou `/admin/contacts/<id>`, motif `LeadForm` du `08`, arbitrage « Page ou modale d'édition » de DESIGN.md) :
  - une seule card Identité (Nom + Poste, Entreprise + Localité, précédés à la création d'un `RadioGroup` « Nouveau contact » (défaut) / « Depuis un lead »), Coordonnées (Email + Téléphone, LinkedIn en pleine largeur), Détails (éditeur, ou rendu markdown en lecture quand un lead est choisi) dans la colonne principale ; Relation (Statut, Types en sélection multiple avec glyphe) et Notes dans la colonne latérale. Grille Identité/Coordonnées identique à `LeadForm`. Cards Détails et Notes : le `CardTitle` sert de libellé (`aria-labelledby`), aucun libellé répété dedans
  - à la création, en « Depuis un lead », un `Combobox` sur `findLeadsWithoutContactRole()` (nom, entreprise) ; le sélectionner remplit Nom, Poste, Entreprise, Localité, Coordonnées et Détails depuis lui, en lecture (contrôles désactivés, valeur réelle portée par un champ caché, comme `companyId` et `metAt` dans `LeadForm`), sans rien écrire avant « Enregistrer »
  - une seule Server Action par écriture (`createContact`, `updateContact`) ; « Ne plus contacter » dans l'en-tête en modification (`OptOutPersonDialog`, `08`), sans case d'effacement propre au contact (la case de `OptOutPersonDialog` reste disponible) ; la page d'un contact en opposition renvoie à la liste
- **Vue détail** (`DetailDialog`, ordre du formulaire) : en-tête nom, sous-titre poste seul, statut en badge ; blocs Identité (Entreprise cliquable en `?detail=` vers sa vue détail, Localité), Coordonnées (Email, Téléphone, LinkedIn en pleine largeur), Détails, Relation (Types en pleine largeur avec glyphe, Statut en `EnumBadge`, dernière interaction, à conserver jusqu'au), Notes, puis Pipeline (statut et intérêt du rôle Lead en `EnumBadge`) si `hasLeadRole`, avec un lien vers la vue détail du lead (`/admin/leads/tous?detail=<id>`, arbitrage « Fiches rattachées »). Fiche opposée : seul bloc Opposition (motif du `08`)
- **Bloc Réseau du lead** (`LeadsTable.tsx`, remplace le bloc posé en stub par le `08`, en dernière position de la vue détail du lead, juste avant Historique `10`) : symétrique, types et statut du rôle Contact (glyphes) quand `hasContactRole`, lien vers la vue détail du contact (`/admin/contacts?detail=<id>`)
- **`personDetailHref`** (`src/lib/person-links.ts`, fonction pure testée) : pour une personne dont le rôle n'est pas fixé par le contexte (l'apporteur d'une opportunité `15`, un correspondant d'entretien `17`, la personne d'une action), résout vers la vue détail du lead si elle porte ce rôle, sinon vers celle du contact, sinon `null` (pas de lien). Bascule aussi `buildActionDetail` (`10`, extrait en `action-detail.tsx` par le `11`), qui liait jusqu'ici la personne d'une action à sa seule fiche lead en attendant ce plan
- **Suppression** (`DeleteContactDialog`, motif `DeleteLeadDialog` du `08`) : « Supprimer « <nom> » ? » et « La fiche relation est retirée. Si cette personne n'est pas aussi un lead, sa fiche, ses actions et ses signaux sont supprimés avec elle, elle disparaît de ses entretiens et ses opportunités restent sans apporteur. » ; fiche opposée : « La trace de son opposition disparaît : plus rien n'empêchera de recontacter cette personne. »
- **Liste** (`ContactsTable`, motif `LeadsTable`) : recherche sur le nom et l'entreprise ; colonnes Nom, Types (glyphes), Entreprise, Statut (`EnumBadge`), Dernière interaction, Localité, Email, LinkedIn, Notes affichées, Téléphone et « À conserver jusqu'au » masquables ; filtres Type, Statut, Localité et Échéance (« Dépassée ») ; une fiche opposée affiche son email ou son LinkedIn à la place du nom, le badge « Ne plus contacter », sans Modifier, avec `ErasePersonExchangesDialog` (`08`) tant que `exchangesErasedAt` n'est pas posée
- **Lien profond vers une vue détail** : `/admin/contacts` lit `searchParams.detail` et le passe à `DataTable` (prop `initialDetailId`, `08`), pour les lignes de `RelatedLinksList` qui visent `?detail=<id>` sur cette page
- **Page et menu** : `/admin/contacts`, titre « Contacts & relations » (maquette), bouton « Nouveau contact » menant à `/admin/contacts/nouveau` ; entrée Contacts activée, sans sous-entrée ; `[id]` est l'id de la personne
- **Rules** : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : créer un contact, nouvelle personne
**GIVEN** l'écran Contacts
**WHEN** on crée un contact Collègue chez une entreprise, localité Luxembourg
**THEN** il apparaît dans la liste et sa vue détail montre ses types, sa localité et son entreprise
**AND** Détails porte le gabarit Profil, Relation, Historique, Liens, Notes libres

### Scénario 2 : poser le rôle depuis un lead
**GIVEN** une personne au rôle Lead, sans rôle Contact
**WHEN** on ouvre « Nouveau contact », choisit « Depuis un lead » puis cette personne, coche Mentor et enregistre
**THEN** le contact reprend ses champs en lecture, la personne porte désormais les deux rôles
**AND** elle n'est plus proposée par `findLeadsWithoutContactRole()`

### Scénario 3 : doublon
**GIVEN** une personne d'email lea@exemple.fr
**WHEN** on crée un contact « Nouveau contact » avec LEA@exemple.fr
**THEN** l'enregistrement est refusé : « Ce contact existe déjà : <nom> » sous Email

### Scénario 4 : rôle déjà posé entre l'affichage et l'envoi
**GIVEN** un lead proposé par le picker qui reçoit le rôle Contact d'un autre onglet avant l'enregistrement
**WHEN** on enregistre le formulaire
**THEN** l'action refuse sur le champ Lead : « Ce contact existe déjà : <nom> »

### Scénario 5 : ne plus contacter
**GIVEN** un contact avec email, LinkedIn, entreprise et notes
**WHEN** on le passe en « Ne plus contacter »
**THEN** il ne garde que son email, son LinkedIn et la date, sa fiche ne se modifie plus

### Scénario 6 : suppression avec un autre rôle
**GIVEN** une personne aux rôles Lead et Contact
**WHEN** on supprime le contact
**THEN** le rôle Contact est retiré et la personne reste, toujours proposée comme lead

### Scénario 7 : suppression sans autre rôle
**GIVEN** une personne au seul rôle Contact
**WHEN** on la supprime
**THEN** le rôle est retiré et la personne est supprimée avec lui

### Scénario 8 : blocs symétriques
**GIVEN** une personne aux rôles Lead et Contact
**WHEN** on ouvre sa vue détail lead puis sa vue détail contact
**THEN** la vue détail lead montre un bloc Réseau (types, statut) qui mène, en `?detail=`, à la vue détail contact
**AND** la vue détail contact montre un bloc Pipeline (statut, intérêt) qui mène, en `?detail=`, à la vue détail lead

## Tests à écrire

### Unit
- `src/server/actions/contacts.test.ts` :
  - rejects a missing name
  - normalizes the LinkedIn profile link and lowercases the email
  - refuses a second contact with the same email or LinkedIn profile, naming it
  - names the stop date when the person opposed
  - creates the role on an existing person without writing its fields
  - refuses to attach the contact role to a person who already has it
  - maps a missing company to its field
  - refuses to edit an opted-out contact
  - keeps the person when it still has the lead role
  - rejects a call without a session, before touching the database
- `src/server/actions/leads.test.ts` (ajout) :
  - keeps the person when it still has the contact role
- `src/lib/details-templates.test.ts` (ajout) :
  - gives the contact template its five sections

## Edge cases

- **Lead choisi avec Détails déjà renseignés** : son contenu reste affiché, aucun gabarit ne s'applique
- **Lead choisi dont un champ change de valeur après la sélection** (entre-temps, un autre onglet) : la fiche garde la valeur lue à la sélection, la revalidation serveur ne porte que sur l'identité et le rôle
- **Contact sans dernière interaction** : la revue part de la date de création du rôle (`Contact.createdAt`)
- **Page d'un contact en opposition ouverte par son adresse** : renvoi à la liste, jamais de formulaire
- **Personne opposée après avoir reçu le rôle Contact** : `OptOutPersonDialog` s'applique normalement, le rôle Contact reste inchangé sur la fiche vidée

## Architectural decisions

### Décision : données des blocs Réseau et Pipeline

**Options envisagées :**
- **A. Booléen seul** (`hasContactRole`, `hasLeadRole`) : le bloc symétrique referait une lecture séparée pour ses valeurs
- **B. Booléen et résumé du rôle** (`contactRole: { types, status } | null`, `leadRole: { status, interest } | null`) portés par `AdminLead` et `AdminContact`

**Choix : B**

**Rationale :**
- `findLeadByIdForAdmin` et `findContactByIdForAdmin` lisent déjà la personne avec ses deux rôles potentiels : ajouter le résumé du second rôle ne coûte rien à la requête
- Une lecture séparée pour un seul bloc, déjà chargé par la page, serait un aller-retour de plus sans raison

### Décision : forme des dialogues RGPD partagés

**Options envisagées :**
- **A. Dupliquer** `OptOutPersonDialog` et `ErasePersonExchangesDialog` en variantes propres aux contacts
- **B. Typer leur prop `person`** sur une forme structurelle commune aux deux (`id`, `name`, `email`, `linkedinUrl`, exportée `OptOutTarget`), déjà celle de `personDisplayName`

**Choix : B**

**Rationale :**
- Le brief demande ces dialogues « tels quels » ; leur logique ne dépend d'aucun champ propre au lead, seulement de l'identité de la personne
- Dupliquer romprait la garantie qu'une seule opposition RGPD existe dans le code
- `OptOutTarget` est typé dès le `08`, qui crée ces deux dialogues : `AdminLead` et `AdminContact` en portent chacun un sur-ensemble, sans rien à élargir ici
