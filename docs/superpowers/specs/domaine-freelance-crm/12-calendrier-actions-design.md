---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "calendrier-actions"
goal: "Voir les actions de prospection sur un calendrier du mois, en créer une en cliquant un jour et replanifier une action à faire en la glissant, avec l'EventCalendar ReUI."
status: "implemented"
complexity: "L"
tdd_scope: "partial"
depends_on: ["09-actions-prospection-donnees-design.md", "10-ecran-actions-prospection-design.md", "11-pipeline-actions-kanban-design.md", "07-leads-donnees-design.md"]
date: "2026-09-29"
---

# Calendrier des actions de prospection

## Scope

Installe l'EventCalendar ReUI (registre `@reui` déclaré par le `11`) et crée la vue Calendrier des actions : grille du mois, une pastille par action à sa date et son heure, colorée selon son statut, clic vers la vue détail, clic sur un jour vers une nouvelle action datée de ce jour, glisser d'une action À faire vers un autre jour pour la replanifier. Exclut les vues semaine, jour et agenda, le glisser d'une action déjà envoyée et le redimensionnement.

### État livré

À la fin de ce sub-project, on peut : ouvrir Actions prospection > Calendrier, voir les actions du mois à leur date, glisser une action À faire du lundi au jeudi et la retrouver jeudi à la même heure dans la vue À faire, et cliquer un jour vide pour créer une action datée de ce jour.

## Dependencies

- `09-actions-prospection-donnees-design.md` (statut: draft) : Server Actions des actions de prospection et leur test, étendus par la replanification
- `10-ecran-actions-prospection-design.md` (statut: draft) : formulaire des actions, `timeOf` et `toInstant`, rang des relances
- `11-pipeline-actions-kanban-design.md` (statut: draft) : registre `@reui`, vue détail partagée (`action-detail.tsx`), formulaire en mode contrôlé, bouton « Nouvelle action » de l'en-tête
- `07-leads-donnees-design.md` (statut: draft) : `findPersonOptions()`, `PersonOption`, `personDisplayName` (`@/lib/persons`)

## Références de design

- **Maquette** : `isActions` (mode Calendrier, `actEvents`), `dlgDetail`, `dlgActionForm`
- **Design system** : `post-mvp/calendar/EventCalendar`, `patterns/DetailDialog`, `patterns/EmptyState`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À créer** : `src/components/reui/event-calendar/*.tsx` (13 fichiers copiés par la CLI), `src/components/reui/icon-stack.tsx` (dépendance du registre)
- **À créer** : `src/components/ui/scroll-area.tsx` (dépendance shadcn du registre)
- **À modifier** : `package.json` et `pnpm-lock.yaml` (`@date-fns/tz`)
- **À modifier** : `docs/VERSIONS.md` (`@date-fns/tz`, ligne ReUI, skill `versions-doc`)
- **À modifier** : `docs/DESIGN.md` (lignes EventCalendar et ScrollArea de § Post-MVP rangées dans leur famille, skill `design-doc`)
- **À modifier** : `src/server/actions/prospecting-actions.ts` et `src/server/actions/prospecting-actions.test.ts` (`rescheduleProspectingAction`)
- **À créer** : `src/lib/action-calendar.ts` et `src/lib/action-calendar.test.ts` (actions vers événements du calendrier, couleur par statut)
- **À modifier** : `src/lib/date-time.ts` (fuseau `TIME_ZONE` exporté pour le calendrier)
- **À créer** : `src/components/features/admin/prospection/ActionsCalendar.tsx`
- **À modifier** : `src/components/features/admin/prospection/ProspectingActionFormDialog.tsx` (date proposée à l'ouverture d'une nouvelle action, zone des champs en `DialogBody`)
- **À créer** : `src/app/admin/(protected)/actions-prospection/calendrier/page.tsx` et `loading.tsx`
- **À modifier** : `src/config/admin-nav-items.ts` (sous-entrée Calendrier)

## Architecture approach

- **Installation** (`.claude/rules/shadcn-ui/setup.md`) : `pnpm dlx shadcn@latest add @reui/event-calendar`, qui copie les 13 fichiers de `src/components/reui/event-calendar/`, `icon-stack` et `scroll-area`, et ajoute `@date-fns/tz` (`date-fns` et `radix-ui` y sont déjà). La CLI ne doit écraser aucun composant `ui` existant (`button`, `calendar`, `dropdown-menu`, `popover`, `tooltip`, dont `calendar` porte des corrections du projet). Corrections après `add` : celles de la rule (import `cn`, paquet `cn` retiré), plus le typage strict du projet (29 erreurs mesurées le 2026-09-27, toutes dues à `noUncheckedIndexedAccess` et `noPropertyAccessFromIndexSignature`) et le lint `strictTypeChecked` (environ 110 remarques mesurées hors dépendances manquantes, 48 corrigées d'office par `eslint --fix`), levées sans changer le comportement
- **Événements** (`src/lib/action-calendar.ts`, fonction pure) : une action devient un événement sans durée, sa fin égale à son début (`occurredAt`), que le composant pose sur un seul jour même tard le soir, titré par son titre, porteur de l'action en `data`. Couleur par statut, celle de la maquette : À faire `warning`, Fait `info`, Répondu et Converti `success`, Ignoré `destructive`. Seule une action À faire est déplaçable ; aucune ne se redimensionne
- **Calendrier** (`ActionsCalendar`, composant client) : vue mois seule, sans sélecteur de vue ni bouton d'ajout dans sa barre (arbitrages du 2026-10-09), en français (locale `fr` de date-fns, semaine commençant le lundi, textes du composant surchargés en français, heure de début seule), mois courant à l'ouverture, fuseau fixé sur Europe/Paris (`timeZone`) pour que le rendu serveur en UTC et le navigateur placent les pastilles sur les mêmes jours. Clic sur une pastille : vue détail partagée (`action-detail.tsx`), dont « Modifier » ouvre le formulaire en mode contrôlé (`11`). Clic sur un jour : formulaire « Nouvelle action » ouvert sur ce jour, à l'heure courante
- **Replanifier** : le lâcher d'une action À faire sur un autre jour appelle `rescheduleProspectingAction(id, instant)` avec l'instant que propose le composant, qui garde l'heure de Paris d'un jour à l'autre, changement d'heure légale compris. Les événements sont tenus en état local, réalignés sur chaque lecture du serveur en ajustant l'état pendant le rendu, comme le tableau du `11` ; en cas d'échec, ils reviennent à la dernière lecture et un toast le signale ; un refus du serveur revalide l'écran, l'action y reprenant son vrai statut ou disparaissant, et le toast en donne la raison
- **Server Action** `rescheduleProspectingAction(id, occurredAt)` (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`) : `getCurrentUser()` en tête, instant ISO complet avec décalage (`z.iso.datetime({ offset: true })`, comme le `09`), mise à jour conditionnée au statut À faire dans la même requête (`updateMany` sur `id` et `status`), aucune ligne touchée valant refus, qui distingue une action supprimée d'une action déjà envoyée et revalide les routes pour réaligner l'écran périmé. Une action déjà envoyée garde sa date réelle, corrigée au besoin par le formulaire. Revalidation des routes des actions et des leads, comme les autres écritures du `09`
- **Formulaire** : `ProspectingActionFormDialog` reçoit une date proposée, lue par une nouvelle action seulement ; une action existante garde la sienne
- **Page** : `/admin/actions-prospection/calendrier`, titre « Calendrier des actions », sous-titre de la maquette, bouton « Nouvelle action » de l'en-tête (`11`) ; lit les actions et les options de personne (`findPersonOptions`, `07`) comme le Pipeline ; aucune action enregistrée : la grille reste affichée, le clic sur un jour restant la création (décision du propriétaire du 2026-10-09)
- **Menu** : sous-entrée « Calendrier » entre Pipeline et Journal, ordre de la maquette
- **Rules** : `.claude/rules/shadcn-ui/setup.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/zod/validation.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : mois
**GIVEN** des actions ce mois-ci à plusieurs statuts
**WHEN** on ouvre Actions prospection > Calendrier
**THEN** chaque action apparaît à sa date avec son heure, colorée selon son statut
**AND** la semaine commence le lundi et les libellés sont en français

### Scénario 2 : replanifier
**GIVEN** une action À faire lundi à 9 h
**WHEN** on la glisse sur jeudi
**THEN** elle est enregistrée jeudi à 9 h et la vue À faire l'affiche à cette date

### Scénario 3 : action envoyée
**GIVEN** une action Fait
**WHEN** on tente de la glisser
**THEN** elle ne bouge pas

### Scénario 4 : clic sur une action
**GIVEN** le calendrier
**WHEN** on clique une action
**THEN** sa vue détail s'ouvre, et « Modifier » ouvre son formulaire

### Scénario 5 : clic sur un jour
**GIVEN** le calendrier
**WHEN** on clique un jour vide
**THEN** le formulaire « Nouvelle action » s'ouvre, daté de ce jour

## Tests à écrire

### Unit
- `src/server/actions/prospecting-actions.test.ts` :
  - moves a to-do action to its new time
  - refuses to move an action already sent
  - rejects a date without its time zone offset
  - rejects a reschedule without a session, before touching the database
  - tells a deleted action apart from one already sent
  - refreshes the screens after a refusal, which showed a stale action
- `src/lib/action-calendar.test.ts` :
  - lets only a to-do action be dragged
  - colours each status as the calendar legend
  - places an action as an instant, so a late one stays on its day
  - shows the start time in Paris, without an end

## Edge cases

- **Échec du serveur au lâcher** (action supprimée ou passée à Fait ailleurs entre-temps) : l'écran se réaligne sur la base, l'action reprenant son statut ou disparaissant, toast qui en donne la raison
- **Jour chargé** : au-delà du nombre de pastilles qu'une case tient, « +N autres » ouvre la liste du jour (comportement du composant)
- **Action d'une personne opposée** : visible, son historique étant gardé (`01`, `09`)

## Architectural decisions

### Décision : composant du calendrier

**Options envisagées :**
- **A. EventCalendar ReUI** : le choix de `docs/DESIGN.md` et du design system ; 13 fichiers, environ 10 000 lignes, dont le nettoyage au typage et au lint stricts du projet ne se fait qu'une fois ; vues semaine et agenda disponibles plus tard sans code neuf
- **B. Grille du mois maison** (date-fns et `Card`) : environ 200 lignes à soi, sans glisser ni autre vue ; DESIGN.md à revoir

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-09-27, sur les mesures faites au bac à sable
- Le même composant sert aux revues hebdo (`18`) et à l'agenda de l'accueil de la maquette

### Décision : ce que le glisser change

**Options envisagées :**
- **A. Rien** : le calendrier est en lecture seule, la date se change au formulaire
- **B. Les actions À faire seulement**, qui gardent leur heure
- **C. Toutes les actions** : on déplacerait par mégarde la date réelle d'un envoi

**Choix : B**

**Rationale :**
- Replanifier une action prévue est l'usage naturel d'un calendrier ; la date d'une action envoyée est un fait, que seul le formulaire corrige
- La garde vit dans la Server Action (mise à jour conditionnée au statut), pas seulement dans l'interface

### Décision : clic sur un jour

**Options envisagées :**
- **A. Rien** : la création passe par le bouton de l'en-tête
- **B. « Nouvelle action » datée de ce jour**

**Choix : B**

**Rationale :**
- Comportement de la fiche design system de l'EventCalendar ; réutilise le formulaire en mode contrôlé du `11`
