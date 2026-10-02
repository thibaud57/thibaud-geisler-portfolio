---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "actions-prospection-donnees"
goal: "Créer le modèle des actions envers une personne, leurs règles de statut et leurs Server Actions, avec la date de réponse qui fixe le dernier contact émanant d'elle."
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: ["07-leads-donnees-design.md"]
date: "2026-09-29"
---

# Données des actions de prospection

## Scope

Crée le modèle `ProspectingAction` (une action envers une personne : connexion, message, email, appel, candidature), ses listes de valeurs, sa validation, ses règles de statut (date d'envoi réelle au passage à Fait, date de réponse posée d'office), ses lectures pour l'admin et ses Server Actions de création, modification, changement de statut seul et suppression. Étend la lecture des leads avec la date de la dernière réponse de leur personne et l'effacement des échanges (`erasePersonExchanges`, `07`) avec la suppression des actions de la personne opposée. Exclut les écrans (`10`, `11`, `12`), le rang « Premier contact / Relance N » (calculé par le `10`) et tout lien vers une opportunité (`14`).

### État livré

À la fin de ce sub-project, on peut : appliquer la migration, faire passer les tests unitaires (une action À faire passée à Fait prend l'heure d'envoi, une action passée à Répondu reçoit sa date de réponse, une personne qui s'oppose garde ses actions, une personne dont on efface les échanges les perd) et lire dans Prisma Studio une action rattachée à sa personne avec son message.

## Dependencies

- `07-leads-donnees-design.md` (statut: draft) : modèle `Person`, action `erasePersonExchanges` étendue ici, lectures des leads

## Files touched

- **À modifier** : `prisma/schema.prisma` (enums `ActionChannel`, `ActionStatus`, modèle `ProspectingAction`, relation `Person.prospectingActions`)
- **À créer** : `prisma/migrations/<horodatage>_prospecting_actions/migration.sql`
- **À créer** : `src/lib/prospecting-actions.ts` (libellés et glyphes des canaux et statuts, libellés des champs)
- **À créer** : `src/lib/prospecting-action-status.ts` et `src/lib/prospecting-action-status.test.ts` (règles de passage d'un statut à l'autre, fonction pure)
- **À créer** : `src/lib/schemas/prospecting-action.ts`
- **À créer** : `src/server/actions/prospecting-actions.ts`, `src/server/actions/prospecting-actions.types.ts`, `src/server/actions/prospecting-actions.test.ts`
- **À créer** : `src/server/queries/prospecting-actions.ts`
- **À modifier** : `src/server/actions/persons.ts` et `src/server/actions/persons.test.ts` (`erasePersonExchanges`, `07`, supprime aussi les actions de la personne)
- **À modifier** : `src/server/queries/leads.ts` (date de la dernière réponse de la personne du lead)

## Architecture approach

- **Modèle** (`.claude/rules/prisma/schema-migrations.md`, schema `freelance`) :

| Champ | Type | Règle |
|---|---|---|
| `title` | `String` | intention courte (« Relance proposition »), sans répéter canal ni personne |
| `personId` | `String` vers `Person` | obligatoire ; `onDelete: Cascade` : le message est une donnée personnelle, supprimer la personne supprime ses actions |
| `channel` | `ActionChannel` : `CANDIDATURE`, `CONNEXION_LINKEDIN`, `DM_LINKEDIN`, `EMAIL`, `SMS_WHATSAPP`, `CALL`, `AUTRE` | requis |
| `status` | `ActionStatus` : `A_FAIRE`, `FAIT`, `REPONDU`, `CONVERTI`, `IGNORE` | défaut `A_FAIRE` |
| `occurredAt` | `DateTime @db.Timestamptz` | date et heure, toujours (maquette : « c'est la donnée de timing ») ; planifiée tant que l'action est À faire, réelle ensuite |
| `message` | `String?` | texte envoyé ou brouillon (corps `💬 Message` de Notion, absent de la maquette, ajouté par décision du propriétaire) |
| `respondedAt` | `DateTime? @db.Timestamptz` | date de la réponse de la personne ; nouvelle, Notion ne gardant que la date d'envoi |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz` | |

  Index sur `(personId, occurredAt)` : l'historique d'une personne et le rang des relances se lisent dans cet ordre. Vers la personne, pas le rôle : un échange avec une relation réseau se journalisera au même endroit (`13`)
- **Libellés** (`src/lib/prospecting-actions.ts`) : ceux de la maquette (« Connexion LinkedIn », « DM LinkedIn », « SMS/WhatsApp », « À faire », « Répondu », « Ignoré »…)
- **Glyphes** : `ACTION_CHANNEL_ICONS`, `ACTION_STATUS_ICONS` dans `src/lib/prospecting-actions.ts`, chacune `Record<Enum, IconComponent | null>` (type `IconComponent` de `@/lib/icons`), glyphes Lucide en imports nommés : canal Connexion LinkedIn `UserPlus`, DM LinkedIn `MessageSquare`, Email `Mail`, SMS/WhatsApp `MessageCircle`, Call `Phone`, Candidature et Autre sans glyphe (`null`) ; statut À faire `ClipboardList`, Fait `CircleCheck`, Répondu `Reply`, Converti `Target`, Ignoré `VolumeX`
- **Règles de statut** (`src/lib/prospecting-action-status.ts`, fonction pure appelée par toutes les écritures) :
  - quitter À faire pour un autre statut remplace la date par l'heure courante, sauf si la même saisie change aussi la date (rattrapage d'un envoi passé) : la date devient celle de l'envoi réel (règle Notion)
  - passer à Répondu ou Converti sans date de réponse la pose à l'heure courante ; une date de réponse saisie est gardée ; passer de Répondu à Converti garde la date existante
  - revenir à À faire, Fait ou Ignoré efface la date de réponse
  - aucune action n'est verrouillée : une relance reste une nouvelle action, par usage et non par blocage
- **Validation** (`src/lib/schemas/prospecting-action.ts`, `.claude/rules/zod/schemas.md`) : titre requis (120 caractères au plus), personne requise, canal et statut dans leurs listes ; `occurredAt` et `respondedAt` en instant ISO complet avec décalage (`z.iso.datetime({ offset: true })`), le formulaire calculant l'instant dans le fuseau du navigateur, ce qu'une date sans décalage ferait lire en UTC sur le serveur ; message facultatif, vide → `null`
- **Actions** (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, motif `saveEntity` / `deleteEntity`, `getCurrentUser()` en tête) : `createProspectingAction`, `updateProspectingAction` (lit le statut et la date enregistrés pour appliquer les règles), `changeProspectingActionStatus(id, status)` (statut seul, pour le glisser du pipeline `11` et un « Marquer fait » du `10`), `deleteProspectingAction`. Une personne inexistante (clé étrangère) renvoie `person_not_found` sur le champ personne, choisie via `findPersonOptions()` (`07`). Après écriture, `revalidatePath` en variante `layout` sur `/admin/actions-prospection` (route du `10`) et `/admin/leads`
- **Effacement des échanges d'une personne** (`erasePersonExchanges`, `07`, étendue ici) : sur une personne déjà opposée, supprime désormais aussi ses actions de prospection (`deleteMany`) dans la même transaction que la pose d'`exchangesErasedAt`, leurs messages étant des données personnelles. L'opposition simple (`optOutPerson`, `07`, art. 21.2/21.3, inchangée) garde les actions comme historique de prospection, jamais réutilisé, jusqu'au terme de leur durée de conservation ou à une demande d'effacement ultérieure (art. 17.1.c). La suppression d'une personne (`deleteLead`, `07`) les emporte toujours par la cascade `Person → Cascade`
- **Lectures** : `findAllProspectingActionsForAdmin` (personne avec son nom, son statut d'opposition et son entreprise), type `AdminProspectingAction`, sans `'use cache'` ; `findAllLeadsForAdmin` et `findLeadByIdForAdmin` (`07`) gagnent la dernière date de réponse de leur personne (`lastReplyAt`), « dernier contact émanant d'elle », point de départ des 3 ans de conservation avec la date de création (`01`)
- **Rules** : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : envoi réel
**GIVEN** une action À faire planifiée lundi à 9 h
**WHEN** on la passe à Fait mercredi à 14 h 30 sans toucher la date
**THEN** sa date devient mercredi 14 h 30

### Scénario 2 : rattrapage
**GIVEN** une action À faire
**WHEN** on la passe à Fait en saisissant la veille à 18 h
**THEN** sa date est la veille à 18 h

### Scénario 3 : réponse
**GIVEN** une action Fait
**WHEN** on la passe à Répondu
**THEN** sa date de réponse est l'heure courante, et le lead lit cette date comme dernier contact de sa part

### Scénario 4 : opposition simple
**GIVEN** une personne au rôle Lead avec trois actions dont une avec message
**WHEN** l'action `optOutPerson` s'exécute sans demande d'effacement
**THEN** ses trois actions sont gardées, jamais réutilisées

### Scénario 5 : effacement demandé
**GIVEN** une personne opposée avec trois actions dont une avec message
**WHEN** l'action `erasePersonExchanges` s'exécute
**THEN** ses trois actions sont supprimées

### Scénario 6 : lead supprimé
**GIVEN** un lead sans autre rôle, avec des actions
**WHEN** on le supprime (`deleteLead`)
**THEN** ses actions sont supprimées avec sa personne

## Tests à écrire

### Unit
- `src/lib/prospecting-action-status.test.ts` :
  - stamps the sending time when an action leaves to do
  - keeps a date changed in the same edit that marks it done
  - stamps the reply time when an action becomes replied or converted
  - keeps a submitted reply time
  - keeps the reply time when a replied action becomes converted
  - clears the reply time when an action goes back to to do, done or ignored
- `src/server/actions/prospecting-actions.test.ts` :
  - rejects a missing title or person
  - rejects a date without its time zone offset
  - creates a replied action with its reply time
  - applies the status rules on update, from the stored status and date
  - changes the status alone and applies the same rules
  - maps a missing person to the person field
  - rejects a call without a session, before touching the database
- `src/server/actions/persons.test.ts` :
  - does not touch the person's prospecting actions on a simple stop
  - erases the person's prospecting actions along with the exchange trace

## Edge cases

- **Action créée directement à Fait** (rattrapage d'un envoi passé) : aucune règle de passage, la date saisie est gardée
- **Action Ignorée qui reçoit finalement une réponse** : passer à Répondu pose la date de réponse
- **Personne opposée** : aucune action ne peut plus lui être rattachée, `findPersonOptions()` (`07`) ne la proposant plus une fois `optedOutAt` posé ; une création forcée reste techniquement possible, à la charge de l'écran

## Architectural decisions

### Décision : sort des actions d'une personne supprimée

**Options envisagées :**
- **A. Supprimées avec la personne** (cascade `Person → Cascade`) : aucun message personnel ne survit à la fiche
- **B. Gardées sans personne** (texte de la maquette) : l'historique des volumes reste, mais une action sans personne n'apparaît plus nulle part et garde un message personnel

**Choix : A**

**Rationale :**
- Choix du propriétaire ; Notion interdit déjà l'action sans lead (« action orpheline = log inutile »)
- Les compteurs des revues hebdo sont figés à la clôture de la semaine (`18`) : ils ne dépendent pas des actions conservées
- `deleteLead` (`07`) supprime la personne dès lors qu'elle n'a aucun autre rôle : `13` conditionnera cette suppression au rôle Contact restant, ce `09` n'a pas à l'anticiper

### Décision : sort des actions d'une personne opposée

**Options envisagées :**
- **A. Toujours supprimées**, comme pour une personne supprimée : aucune trace ne survit à l'opposition, au prix de perdre l'historique de prospection
- **B. Distinguer opposition et effacement** : l'opposition (`optOutPerson`, art. 21.2/21.3) garde les actions comme historique, jamais réutilisé, jusqu'au terme de leur durée de conservation ; la demande d'effacement en plus (`erasePersonExchanges`, art. 17.1.c) les supprime

**Choix : B**

**Rationale :**
- Décision du propriétaire, actée dès le `07` pour la personne et étendue ici à ses actions : le droit d'opposition (art. 21) n'emporte pas le droit à l'effacement (art. 17), le RGPD ne fusionne pas ces deux droits
- Garder l'historique sert la mémoire de prospection (ne pas recontacter, savoir ce qui a déjà été tenté) sans le réutiliser, tant que la personne ne demande pas davantage

### Décision : date de la réponse

**Options envisagées :**
- **A. Déduite de la date de l'action répondue** : rien à stocker, mais c'est la date d'envoi, parfois des semaines avant la réponse
- **B. Date de réponse stockée**, posée d'office au passage à Répondu ou Converti

**Choix : B**

**Rationale :**
- Donne le vrai « dernier contact émanant du lead » (RGPD, `01`) et le délai de réponse
- Coûte un champ, rempli sans saisie
