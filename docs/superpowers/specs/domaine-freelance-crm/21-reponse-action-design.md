---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "reponse-action"
goal: "Garder le texte de la réponse de la personne sur l'action qu'elle a répondue, à côté du message envoyé, dans le formulaire et la vue détail."
status: "implemented"
complexity: "S"
tdd_scope: "partial"
depends_on: ["09-actions-prospection-donnees-design.md", "10-ecran-actions-prospection-design.md"]
date: "2026-10-13"
---

# Réponse de la personne sur une action

## Scope

Ajoute à `ProspectingAction` le texte de la réponse de la personne (`reply`), saisi dans le formulaire sous le message, visible seulement quand le statut est Répondu ou Converti, lu dans la vue détail sous le bloc Message, puis effacé quand l'action quitte ces statuts, comme la date de réponse. Pour une connexion LinkedIn, la date de réponse s'intitule « Acceptée le ». Exclut toute action entrante (la réponse reste une donnée de l'action sortante, pas une action), tout fil de discussion à plusieurs messages (un nouvel envoi reste une nouvelle action, `09`), tout changement des listes des vues (`10`, `11`, `12`) et la reprise Notion (`20`, aucune source).

### État livré

À la fin de ce sub-project, on peut : ouvrir une action Fait, la passer à Répondu, saisir le texte reçu sous le message, l'enregistrer, le relire dans la vue détail sous le bloc Message, puis repasser l'action à Fait et constater que la réponse a disparu avec sa date.

## Dependencies

- `09-actions-prospection-donnees-design.md` (statut: implemented) : modèle `ProspectingAction`, `applyStatusRules`, schéma Zod et Server Actions étendus ici
- `10-ecran-actions-prospection-design.md` (statut: implemented) : `ProspectingActionFormDialog` et `buildActionDetail` étendus ici

## Références de design

- **Maquette** : `dlgActionForm`, `dlgDetail` (la maquette n'a pas de champ Réponse : ajout par décision du propriétaire, comme le champ Message du `09`)
- **Design system** : `core/Textarea`, `patterns/DetailDialog`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À modifier** : `prisma/schema.prisma` (champ `ProspectingAction.reply`)
- **À créer** : `prisma/migrations/<horodatage>_prospecting_action_reply/migration.sql`
- **À modifier** : `src/lib/crm/prospecting-actions.ts` (libellé du champ)
- **À modifier** : `src/lib/crm/prospecting-action-status.ts` et `src/lib/crm/prospecting-action-status.test.ts` (la réponse suit le cycle de la date de réponse)
- **À modifier** : `src/lib/schemas/prospecting-action.ts` (champ `reply`)
- **À modifier** : `src/server/actions/prospecting-actions.ts` et `src/server/actions/prospecting-actions.test.ts` (lecture du champ, conservation au changement de statut seul)
- **À modifier** : `src/components/features/admin/prospecting-actions/ProspectingActionFormDialog.tsx` (champ Réponse sous Message)
- **À modifier** : `src/components/features/admin/prospecting-actions/action-detail.tsx` (bloc Réponse sous Message)

## Architecture approach

- **Modèle** (`.claude/rules/prisma/schema-migrations.md`, `.claude/rules/prisma/data-modeling.md`) : `reply String?` sur `ProspectingAction`, après `message` ; donnée personnelle de la personne, emportée comme `message` par la cascade `Person → Cascade` et par `erasePersonExchanges` (`09`), sans rien ajouter. Migration additive, sans reprise de données
- **Libellés** (`src/lib/crm/prospecting-actions.ts`) : `reply` « Réponse » dans `PROSPECTING_ACTION_FIELD_LABELS` ; `respondedAtLabel(channel)` rend « Acceptée le » pour `CONNEXION_LINKEDIN`, « Réponse reçue le » sinon. Le statut garde « Répondu » sur tous les canaux
- **Règle de statut** (`applyStatusRules`, fonction pure, `09`) : `ActionTiming` gagne `reply` ; au statut Répondu ou Converti la valeur soumise est gardée telle quelle (vide → `null`, sans repli sur la valeur enregistrée : le formulaire peut l'effacer), à tout autre statut elle devient `null`, comme `respondedAt`. `changeProspectingActionStatus` (glisser du pipeline `11` ; le « Marquer fait » du `10` est retiré depuis le 2026-10-13) lit `reply` avec `TIMING_SELECT` et le repasse tel quel : passer de Répondu à Converti garde la réponse, repasser à Fait l'efface
- **Validation** (`.claude/rules/zod/schemas.md`) : `reply` en `optionalTextField` (`src/lib/schemas/person.ts`), comme `message`
- **Server Actions** (`.claude/rules/nextjs/server-actions.md`) : `createProspectingAction` et `updateProspectingAction` lisent `reply` par `stringField` ; un champ absent du formulaire (masqué) vaut `""`, donc `null`
- **Lectures** : `AdminProspectingAction` (`include`, `09`) porte le champ sans changement ; `actionTimelineSelect` (historique des leads) l'exclut, comme `message`, pour les mêmes raisons
- **Formulaire** (`ProspectingActionFormDialog`) : `TextareaField` « Réponse » pleine largeur sous Message, même hauteur, aide « Le texte exact reçu. », rendu seulement quand `isRepliedStatus(status)`, comme « Réponse reçue le » ; valeur initiale `action.reply`, contrôlée par un état local pour survivre au masquage. Le Type devient contrôlé pour que le libellé de la date de réponse suive le canal choisi. Le message envoyé ne bouge pas
- **Vue détail** (`buildActionDetail`, disposition de `DetailDialog` en DESIGN.md § Overlays, `.claude/rules/shadcn-ui/components.md`) : `textSection` « Réponse » avec retours à la ligne conservés, toujours affiché après le bloc Message, avec une ligne `EmptyValue` sans réponse, comme le bloc Message (arbitrage « Bloc vide d'une vue détail », réaligné le 2026-10-13)

## Acceptance criteria

### Scénario 1 : réponse saisie
**GIVEN** une action DM LinkedIn au statut Fait avec un message
**WHEN** on la modifie, passe le statut à Répondu, saisit le texte reçu dans Réponse et enregistre
**THEN** l'action garde son message, porte la réponse et une date de réponse
**AND** la vue détail montre le bloc Réponse sous le bloc Message

### Scénario 2 : retour à Fait
**GIVEN** une action Répondu avec une réponse
**WHEN** on la repasse à Fait, depuis le formulaire ou le pipeline
**THEN** la réponse et la date de réponse sont effacées
**AND** le message envoyé est intact

### Scénario 3 : conversion
**GIVEN** une action Répondu avec une réponse
**WHEN** on la glisse dans Converti depuis le pipeline
**THEN** la réponse et la date de réponse sont gardées

### Scénario 4 : connexion acceptée
**GIVEN** une connexion LinkedIn passée à Répondu sans texte
**WHEN** on ouvre sa vue détail
**THEN** la date de réponse s'intitule « Acceptée le »
**AND** le bloc Réponse affiche une valeur absente

## Tests à écrire

### Unit
- `src/lib/crm/prospecting-action-status.test.ts` :
  - keeps the submitted reply when an action is replied or converted
  - clears the reply when an action goes back to to do, done or ignored
- `src/server/actions/prospecting-actions.test.ts` :
  - stores the reply with a replied action
  - keeps the reply when the status alone moves a replied action to converted

## Edge cases

- **Formulaire ouvert en Répondu puis statut rebasculé à Fait avant d'enregistrer** : le champ masqué n'est pas soumis, la règle efface de toute façon la réponse
- **Réponse vidée à la main en restant Répondu** : enregistrée `null`, sans repli sur l'ancienne valeur, contrairement à la date de réponse qui garde la sienne quand elle n'est pas saisie
- **Action Ignorée qui reçoit finalement une réponse** : passer à Répondu rend le champ visible, la réponse se saisit alors (`09`)

## Architectural decisions

### Décision : où vit la réponse

**Options envisagées :**
- **A. Champ `reply` sur l'action sortante** : un seul enregistrement par échange, rang des relances et vues inchangés, mais une réponse en plusieurs messages se résume en un texte
- **B. Action entrante** (canal ou sens « reçu ») : fil complet, mais chaque réponse devient une « Relance N » fausse, les vues et compteurs (revues hebdo) doivent l'exclure partout, et la date de réponse se trouve en double

**Choix : A**

**Rationale :**
- Le modèle est orienté sortant (« une action envers une personne », `09`) et la date de réponse y vit déjà : le texte la rejoint
- Le besoin est de relire ce que la personne a dit avant la relance suivante, pas de reconstituer un fil ; la relance suivante reste une nouvelle action
- Aucune vue, compteur ni rang à retoucher

### Décision : sort de la réponse quand l'action quitte Répondu

**Options envisagées :**
- **A. Effacée** : même cycle que la date de réponse, aucune donnée orpheline d'un statut qui ne l'affiche plus
- **B. Gardée en base, masquée** : récupérable si le statut revient, mais invisible et contradictoire avec un statut Fait ou Ignoré, et conservée sans finalité

**Choix : A**

**Rationale :**
- Une action Fait ou Ignoré sans date de réponse ne doit pas cacher un texte reçu : la donnée suit le statut qui la justifie
- Cohérent avec la règle existante sur `respondedAt`, une seule fonction à étendre

### Décision : libellés selon le canal

**Options envisagées :**
- **A. Libellés génériques partout** : rien à maintenir, mais « Réponse reçue le » se lit mal pour une invitation acceptée
- **B. Date de réponse « Acceptée le » pour une connexion LinkedIn seule** : le statut reste « Répondu » partout, le champ Réponse reste visible (la personne peut écrire en acceptant)
- **C. Libellés par canal** (« Joint le » et « Compte rendu » pour un appel, « Retour » pour une candidature) : plus précis, mais une table de cas pour des canaux rares

**Choix : B** (décision du propriétaire du 2026-10-13)

**Rationale :**
- Le pipeline, les filtres et la revue hebdo mêlent les canaux : le statut ne peut pas changer de nom selon la carte
- « Réponse » convient à une candidature comme à un appel ; seule l'acceptation d'une connexion n'est pas une réponse
- Un appel reste une action de prospection : un entretien exige une opportunité (`16`), et la revue hebdo compte les entretiens depuis leur modèle (`18`), sans double comptage
