---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "signaux"
goal: "Enregistrer les signaux qui qualifient une entreprise ou un lead outbound comme des événements datés, typés et sourcés, avec leur fraîcheur et un filtre « Signal récent » dans les listes."
status: "implemented"
complexity: "L"
tdd_scope: "partial"
depends_on: ["01-rgpd-prospection-design.md", "03-formulaire-entreprise-enrichi-design.md", "04-liste-entreprises-enrichie-design.md", "07-leads-donnees-design.md", "08-ecran-leads-design.md", "10-ecran-actions-prospection-design.md", "13-contacts-design.md", "15-ecran-opportunites-design.md", "16-entretiens-donnees-design.md", "17-ecran-entretiens-design.md"]
date: "2026-09-27"
---

# Signaux

## Scope

Crée le modèle `Signal`, rattaché à une entreprise ou à un lead outbound, qui remplace les sections Notion `📡 Signaux` (entreprise) et `🔍 Signal` (lead outbound) des gabarits Notion actuels, sa validation, ses Server Actions, sa fraîcheur calculée et son sort à l'opposition d'un lead. Ajoute une card Signaux aux pages des entreprises et des leads outbound (ajout, modification, suppression), un bloc Signaux en lecture à leurs vues détail et le filtre « Signal récent » à la liste Entreprises (amendé le 2026-10-14 : retiré de la liste Leads, les types de signal d'un lead n'ayant pas de fraîcheur, le filtre y restait vide). Exclut tout écran Signaux, le calcul du score ICP (agents internes) et la veille automatisée.

### État livré

À la fin de ce sub-project, on peut : cliquer « Nouveau signal » dans la card Signaux de la page d'une entreprise, enregistrer une offre de poste datée du 1er du mois courant avec son lien, la retrouver en tête de la card et du bloc Signaux de sa vue détail avec le badge « Récent », puis voir l'entreprise ressortir au filtre « Signal récent » de la liste Entreprises.

## Dependencies

- `01-rgpd-prospection-design.md` (statut: draft) : Traitement 7 du registre et puce prospection de la politique, dont la liste des données s'enrichit des signaux
- `03-formulaire-entreprise-enrichi-design.md` (statut: draft) : `CompanyForm`, prop `relatedCards`
- `04-liste-entreprises-enrichie-design.md` (statut: draft) : `CompaniesTable`, facettes et vue détail des entreprises
- `07-leads-donnees-design.md` (statut: draft) : `Person`, `optOutPerson(id)`, que ce sub-project étend aux signaux, et `erasePersonExchanges(id)`
- `08-ecran-leads-design.md` (statut: draft) : `LeadsTable`, vue détail et page des leads, `OptOutPersonDialog`, arbitrages de page, `SelectField`, `OptionalDateField`, `RelatedLinksList`, `RelatedLinksCard`, `initialDetailId` et la lecture de `searchParams.detail`
- `10-ecran-actions-prospection-design.md` (statut: draft) : textes de suppression d'un lead et case d'effacement des échanges, facette calculée sur l'instant figé de la table (motif « Échéance dépassée »)
- `13-contacts-design.md` (statut: draft) : `hasContactRole`, repris dans le texte de suppression d'un lead qui garde par ailleurs son rôle Contact
- `15-ecran-opportunites-design.md` (statut: draft) : refus de suppression d'une entreprise
- `16-entretiens-donnees-design.md` (statut: draft) : `erasePersonExchanges(id)` retire aussi la personne de ses entretiens
- `17-ecran-entretiens-design.md` (statut: draft) : card Entretiens de la page du lead, sous laquelle se place la card Signaux

## Références de design

- **Maquette** : `dlgSignalForm` (modale), `dlgDetail` (bloc d'une vue détail d'entreprise ou de lead ; vue détail propre d'un signal), `isCompanyForm` (cards d'une page) ; aucun écran dédié aux signaux, le formulaire suit le motif des fenêtres de formulaire de l'admin
- **Design system** : `patterns/RelatedLinksList`, `patterns/RelatedLinksCard`, `patterns/DetailDialog`, `patterns/ConfirmDeleteDialog`, `patterns/RowActionButton`, `patterns/ExternalUrl`, `patterns/FacetFilter`, `core/Card`, `core/Dialog`, `core/Select`, `core/Calendar`, `core/Popover`, `core/Input`, `core/Textarea`, `core/Badge`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À modifier** : `prisma/schema.prisma` (enum `SignalType`, modèle `Signal`, relations `Company.signals` et `Person.signals`)
- **À créer** : `prisma/migrations/<horodatage>_signals/migration.sql`
- **À créer** : `src/lib/signals.ts` (libellés, types par rattachement, date affichée, fraîcheur, signal récent) et `src/lib/signals.test.ts`
- **À créer** : `src/lib/schemas/signal.ts`
- **À créer** : `src/server/actions/signals.ts`, `src/server/actions/signals.types.ts`, `src/server/actions/signals.test.ts`
- **À modifier** : `src/server/actions/persons.ts` et `src/server/actions/persons.test.ts` (`optOutPerson` supprime les signaux de la personne)
- **À modifier** : `src/components/features/admin/persons/OptOutPersonDialog.tsx`, `ErasePersonExchangesDialog.tsx` (textes : signaux supprimés à l'opposition)
- **À modifier** : `src/server/actions/leads.ts`, `src/server/actions/leads.test.ts`, `src/components/features/admin/leads/DeleteLeadDialog.tsx` (signaux supprimés avec le rôle Lead)
- **À modifier** : `src/lib/date-time.ts` (`formatDateOnly`, partagé), `src/lib/weekly-reviews.ts`, `src/components/features/admin/revues/ReviewsTable.tsx` (appellent `formatDateOnly`)
- **À créer** : `src/components/features/admin/signals/useSignalDetail.tsx` (vue détail et modification d'un signal dans les tables), `PendingSignalsCard.tsx` (card des pages de création)
- **À créer** : `src/server/queries/signals.ts` (`signalsInclude`)
- **À modifier** : `src/server/queries/companies.ts`, `src/server/queries/leads.ts` (signaux de chaque fiche)
- **À créer** : `src/components/features/admin/signals/SignalFormDialog.tsx`, `DeleteSignalDialog.tsx`, `SignalList.tsx`, `SignalsCard.tsx`
- **À modifier** : `src/components/features/admin/companies/CompaniesTable.tsx` (bloc Signaux en lecture, facette, vue détail d'un signal)
- **À modifier** : `src/components/features/admin/companies/DeleteCompanyDialog.tsx` (signaux supprimés avec l'entreprise)
- **À modifier** : `src/app/admin/(protected)/entreprises/[id]/page.tsx`, `src/app/admin/(protected)/entreprises/nouvelle/page.tsx` (card Signaux)
- **À modifier** : `src/components/features/admin/leads/LeadsTable.tsx` (bloc Signaux en lecture, facette, vue détail d'un signal)
- **À modifier** : `src/app/admin/(protected)/leads/[id]/page.tsx`, `src/app/admin/(protected)/leads/nouveau/page.tsx` (card Signaux)
- **À modifier** : `docs/registre-traitements.md` (Traitement 7, données), `content/legal/fr/confidentialite-intro.md`, `content/legal/en/confidentialite-intro.md` (puce prospection, données)

## Architecture approach

- **Remodélisation de Notion** (principe du propriétaire, 2026-09-27) : chaque ligne des sections `📡 Signaux` et `🔍 Signal` devient une ligne du modèle, avec les champs des gabarits Notion actuels ; aucun gabarit de Détails n'a de section Signal (`03`, `08`)
- **Modèle** (`.claude/rules/prisma/schema-migrations.md`, schema `freelance`) :

| Champ | Type | Règle |
|---|---|---|
| `type` | `SignalType` | requis ; valeurs par rattachement ci-dessous |
| `occurredOn` | `DateTime @db.Date` | requis ; au jour quand la source le donne, au 1er du mois sinon, un seul calendrier (gabarit Notion actuel « JJ/MM/AAAA, ou MM/AAAA si le jour n'est pas public ; ne jamais inventer un jour ») |
| `content` | `String` | requis ; la « description courte » du gabarit Notion actuel, ce qui fait de l'événement un signal |
| `sourceUrl` | `String?` | lien vers la source, facultatif comme dans le gabarit Notion actuel, même règle que le site web d'une entreprise (`02`) |
| `companyId` | `String?`, `onDelete: Cascade` | entreprise du signal |
| `personId` | `String?`, `onDelete: Cascade` | personne (lead outbound) du signal ; contraintes SQL `CHECK` en migration : un seul des deux rattachements posé, et son type parmi ceux qu'il autorise |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz` | |

- **Rattachement et types** (listes des gabarits Notion actuels) : un signal a exactement un rattachement, fixé à la création par la fiche d'où il part et jamais modifié ; le formulaire ne propose que les types de ce rattachement, l'action refuse les autres. Pour une personne, l'identifiant du rattachement est celui de la personne (`Person.id`), le même que `Lead.personId` et que `AdminLead.id` : la card Signaux de la page du lead lit `AdminLead` sans conversion

| Rattachement | `SignalType` |
|---|---|
| Entreprise | `OFFRE_POSTE` (Offre de poste), `LEVEE` (Levée), `EXPANSION` (Expansion d'équipe), `NOUVEAU_PRODUIT` (Nouveau produit), `PIVOT` (Pivot), `ACQUISITION` (Acquisition) |
| Lead outbound | `POST` (Post engageant), `COMMENTAIRE` (Commentaire), `CONFERENCE` (Présence en conférence), `INTERACTION` (Interaction directe) |

  Un lead inbound ne reçoit jamais de signal (règle des gabarits Notion actuels : un lead inbound n'a jamais de section `🔍 Signal`), un lead opposé non plus. Une contrainte SQL (`Signal_type_check`) impose en base ce lien entre le rattachement et le type ; un nouveau `SignalType` ajouté plus tard demande de la mettre à jour
- **Date affichée** (`src/lib/signals.ts`) : toujours au jour « 12/03/2026 », y compris pour un 1er du mois saisi faute de jour connu, relue en UTC comme toute colonne date
- **Fraîcheur** (`src/lib/signals.ts`, fonction pure) : matrice de fraîcheur des signaux, l'âge comptant depuis `occurredOn`, y compris pour un signal daté au 1er du mois faute de jour connu

| Type | Récent | À confirmer | Périmé |
|---|---|---|---|
| Offre de poste | moins de 3 mois | 3 à 6 mois | plus de 6 mois |
| Levée | moins de 6 mois | 6 à 18 mois | plus de 18 mois |
| Expansion d'équipe, Nouveau produit | moins de 6 mois | 6 à 12 mois | plus de 12 mois |

  Les autres types n'ont pas de règle dans la matrice de fraîcheur : ni badge, ni place dans le filtre « Signal récent »
- **Glyphes** : `src/lib/signals.ts` exporte aussi `SIGNAL_TYPE_ICONS: Record<SignalType, IconComponent | null>` (Offre de poste `Megaphone`, Levée `TrendingUp`, Expansion d'équipe `Users`, Nouveau produit `Package`, Pivot `RotateCcw`, Acquisition `Merge`, Post engageant `PenLine`, Commentaire `MessageSquareText`, Présence en conférence `Mic`, Interaction directe `Hand`), imports nommés depuis `lucide-react`, type `IconComponent` de `@/lib/icons`
- **Validation** (`src/lib/schemas/signal.ts`, `.claude/rules/zod/schemas.md`) : date requise (date ISO) ; contenu requis, 500 caractères au plus ; lien vide → `null`, 2048 caractères au plus (décision du propriétaire du 2026-10-11)
- **Actions** (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, motif `saveEntity` / `deleteEntity`) : `createCompanySignal(companyId)`, `createPersonSignal(personId)`, `updateSignal(id)`, `deleteSignal(id)`, `getCurrentUser()` en tête de chacune. La création sur une personne vérifie qu'elle porte le rôle Lead avec `origin OUTBOUND` et n'est pas opposée, dans la même transaction que l'écriture pour qu'une opposition concurrente ne laisse pas de signal ; un signal ou une entreprise disparus entre l'affichage et l'envoi rendent un message dédié et revalident les listes ; la modification relit le rattachement du signal pour valider le type, une personne opposée n'ayant plus de signal ; la suppression reste toujours possible. Revalidation en variante `layout` de `/admin/entreprises` et `/admin/leads`
- **RGPD** (`01`) : les signaux d'une personne sont supprimés dès son opposition, dans la transaction d'`optOutPerson(id)` ; ses actions, elles, restent jusqu'à l'effacement de ses échanges (décision ci-dessous) ; les signaux partent aussi avec le rôle Lead retiré (`deleteLead`), même si la personne reste un contact, puisqu'ils ne servent qu'à la prospection (décision du propriétaire du 2026-10-11) ; ceux d'une entreprise partent avec l'entreprise. Le Traitement 7 et la puce prospection de la politique (FR, EN) ajoutent à leurs données « signaux d'activité professionnelle (publications, commentaires, présence en conférence, interactions directes) », les sources déclarées couvrant déjà profils publics, événements et échanges directs ; la ligne Conservation du Traitement 7 dit les signaux supprimés dès l'opposition
- **Card Signaux** (`SignalsCard`, arbitrage « Élément rattaché à une fiche » de DESIGN.md) sur la page d'une entreprise (sous la card Opportunités du `15`) et d'un lead (sous la card Entretiens du `17`), hors du formulaire, en `RelatedLinksList` (type en libellé, décote puis contenu en méta, date en `trailing`, crayon et corbeille en `actions`) du plus récent au plus ancien ; bouton « Nouveau signal » dans l'en-tête de la card, pour une entreprise et pour un lead outbound. Présente aussi en création, vide avec « Après l'enregistrement de l'entreprise. » ou « Après l'enregistrement du lead. » et bouton désactivé (arbitrage « Élément rattaché à une fiche ») ; « Aucun signal. » sans signal une fois la fiche enregistrée. Sur la page d'un lead inbound, la card n'apparaît que s'il garde des signaux d'une origine précédente, sans bouton d'ajout. Gérée depuis sa propre card, jamais par un bouton de ligne de la liste des entreprises ou des leads
- **Saisie** (`SignalFormDialog`, fenêtre, arbitrage « Page ou modale d'édition ») : Type (`SelectField`, glyphes `SIGNAL_TYPE_ICONS` ; dans la card et la vue détail le type est un titre, pas un badge, il reste en texte) et Date (`OptionalDateField` du `05`, un seul calendrier, obligatoire ; quand la source ne donne que le mois, le 1er du mois s'y saisit), puis Lien source (`Input`), puis Contenu (`Textarea`)
- **Bloc Signaux** (`signalsSection`) dans les vues détail d'une entreprise et d'un lead, en `RelatedLinksList` en lecture : la même liste sans `actions`, chaque ligne ouvrant la vue détail du signal à la place de la vue courante (données déjà chargées) ; bloc toujours affiché, valeur absente sans signal (arbitrage « Bloc vide d'une vue détail », décision du propriétaire du 2026-10-11). Un lead opposé n'a plus de signal : sa vue détail n'a pas de bloc Signaux
- **Vue détail d'un signal** (`buildSignalDetail`), ouverte depuis les lignes Signaux des vues détail de l'entreprise et du lead : titre le type, sous-titre la date, badge de décote en tête ; bloc Signal (Lien source, Contenu) ; bloc « Rattaché à » en `RelatedLinksList` d'une ligne vers l'entreprise ou le lead (`href` avec `?detail=<id>`, comme toute fiche à page propre) ; bouton Modifier ouvrant `SignalFormDialog` sur ce signal
- **Filtre « Signal récent »** : facette à une option dans la liste Entreprises, toutes vues (amendé le 2026-10-14 : plus sur Leads, aucun type de lead n'ayant de fraîcheur), calculée sur l'instant figé au montage de la table, motif du filtre « Échéance dépassée » (`10`)
- **Suppressions** : la confirmation de suppression d'une entreprise garde « Ses signaux sont supprimés avec elle. » ; celle d'un lead commence sa partie données par « Ses signaux sont supprimés. », sa fiche et ses actions ne partant que s'il n'est pas aussi un contact ; la modale de modification s'intitule « Modifier <type> · <date> » (arbitrage « Titre d'une modale de modification ») ; la confirmation « Ne plus contacter » (`08`) dit « Ses signaux sont supprimés. Ses actions restent dans son historique, sans être réutilisées, sauf si elle en demande l'effacement. », et celle de l'effacement des échanges ne nomme plus que les actions
- **Rules** : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : signal d'entreprise
**GIVEN** une entreprise sans signal
**WHEN** on clique « Nouveau signal » dans la card Signaux de sa page et enregistre une offre de poste datée du 1er du mois courant, avec son lien
**THEN** la card montre ce signal, daté au jour, badge « Récent », et sa vue détail le montre en lecture
**AND** le filtre « Signal récent » de la liste Entreprises la fait ressortir

### Scénario 2 : fraîcheur
**GIVEN** une entreprise dont le seul signal est une levée datée d'il y a 8 mois
**WHEN** on ouvre sa vue détail puis applique le filtre « Signal récent »
**THEN** le signal porte le badge « À confirmer » et l'entreprise n'apparaît pas au filtre

### Scénario 3 : signal de lead
**GIVEN** un lead outbound et un lead inbound sans signal
**WHEN** on ajoute au premier, depuis la card Signaux de sa page, un post engageant daté au jour
**THEN** il apparaît dans la card, sans badge de fraîcheur
**AND** la page du lead inbound n'a pas de card Signaux

### Scénario 4 : types par rattachement
**GIVEN** le formulaire d'un signal d'entreprise
**WHEN** on ouvre la liste des types
**THEN** seuls les six types d'entreprise sont proposés

### Scénario 5 : modification depuis la page
**GIVEN** la page d'une entreprise avec un signal
**WHEN** on le modifie depuis la card Signaux et enregistre
**THEN** la card montre la nouvelle version sans recharger la page

### Scénario 6 : opposition
**GIVEN** un lead outbound portant un signal et une action de prospection
**WHEN** on le passe en « Ne plus contacter » sans la case d'effacement
**THEN** son signal est supprimé et sa vue détail n'a plus de bloc Signaux
**AND** son action reste dans son bloc Actions

### Scénario 7 : vue détail d'un signal
**GIVEN** la vue détail d'une entreprise avec un signal
**WHEN** on clique sa ligne dans le bloc Signaux
**THEN** la vue détail du signal remplace la vue courante, avec son type en titre, sa date en sous-titre et son badge de décote
**AND** son bloc « Rattaché à » mène, par un lien, à la vue détail de l'entreprise
**AND** son bouton Modifier ouvre `SignalFormDialog` sur ce signal

## Tests à écrire

### Unit
- `src/lib/signals.test.ts` :
  - rates a job offer recent, to confirm then stale at three and six months
  - applies the funding and team expansion thresholds
  - counts a month-dated signal from the first day of its month
  - gives no freshness to an unrated type
  - flags a record with at least one recent signal
  - clamps a month-end signal to the last day of the target month
- `src/server/actions/signals.test.ts` :
  - attaches a new signal to its company
  - refuses a person-level type on a company
  - refuses a signal on an inbound or opted-out lead
  - rejects a call without a session, before touching the database
  - reports a signal that no longer exists
- `src/server/actions/persons.test.ts` :
  - deletes the person's signals when they object to prospecting
- Tests des actions leads :
  - deletes the person's signals with the lead role

## Edge cases

- **Lead passé d'outbound à inbound** : sa card Signaux reste, ses signaux modifiables et supprimables ; le bouton « Nouveau signal » disparaît
- **Lead opposé** : ses signaux sont supprimés dès l'opposition, case d'effacement cochée ou non ; ses actions restent jusqu'à l'effacement de ses échanges
- **Lead supprimé qui reste un contact** : ses signaux partent avec son rôle Lead ; sa fiche et ses actions restent pour le rôle Contact
- **Signal daté un 31** : sa fraîcheur s'arrête au dernier jour du mois cible (31/08 + 6 mois → 28/02)
- **Signal daté dans le futur** (conférence à venir) : accepté, et récent pour les types notés
- **Date au mois courant** : récente dès le 1er du mois, l'âge se comptant depuis le 1er
- **Entreprise rattachée à des projets ou des opportunités** : sa suppression reste refusée (`15`), ses signaux avec elle

## Architectural decisions

### Décision : rattachement

**Options envisagées :**
- **A. Un seul rattachement, fixé par la fiche d'origine** : entreprise pour les signaux d'entreprise, lead outbound pour les signaux de personne, comme les deux sections des gabarits Notion actuels
- **B. Entreprise et/ou lead** : un même signal sur deux fiches, fraîcheur et effacement ambigus

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : les gabarits Notion actuels séparent déjà les signaux d'entreprise (`📡 Signaux`) des signaux de personne (`🔍 Signal`)

### Décision : fraîcheur

**Options envisagées :**
- **A. Matrice de fraîcheur actuelle seule**, sur les quatre types qu'elle note
- **B. Matrice étendue** à tous les types par des durées choisies ici

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : on reprend la logique des gabarits et de la matrice actuels transposée en app, sans règle métier nouvelle

### Décision : saisie

**Options envisagées :**
- **A. Sans écran dédié, depuis la fiche** : card Signaux de la page de l'entreprise ou du lead, bloc en lecture dans les vues détail
- **B. Écran Signaux** : liste de tous les signaux, entrée de menu absente de la maquette

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : les signaux vivent dans les fiches, comme dans Notion, et un élément rattaché se gère dans une card de la page de sa fiche, jamais par un bouton de ligne (arbitrage « Élément rattaché à une fiche » de DESIGN.md)

### Décision : signaux d'un lead opposé

**Options envisagées :**
- **A. Supprimés dès l'opposition** : seuls l'email, le lien LinkedIn et l'historique des échanges restent
- **B. Gardés après une opposition simple, supprimés à l'effacement des échanges**, comme les actions de prospection (`09`)

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-10-11, qui remplace le choix B (décision 9 de la décomposition, 2026-09-27)
- Un signal de personne ne sert qu'à la qualifier pour la prospecter : l'opposition à la prospection vaut aussi « au profilage dans la mesure où il est lié à une telle prospection » (RGPD art. 21.2), les données « ne sont plus traitées à ces fins » (art. 21.3)
- La CNIL limite ce qui reste après une opposition aux « données nécessaires » à sa gestion (fiche « Comment utiliser une liste repoussoir », consultée le 2026-10-11) et demande de supprimer les données collectées en ligne dès qu'elles ont « rempli leur office » (recommandations aux réutilisateurs de données publiées sur Internet, juin 2024)
- L'historique des échanges garde une autre finalité, la preuve de ce qui a été envoyé et du respect de l'opposition : il reste jusqu'à son effacement, comme avant
