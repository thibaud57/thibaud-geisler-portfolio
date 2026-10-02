---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "signaux"
goal: "Enregistrer les signaux qui qualifient une entreprise ou un lead outbound comme des événements datés, typés et sourcés, avec leur fraîcheur et un filtre « Signal récent » dans les listes."
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: ["01-rgpd-prospection-design.md", "03-formulaire-entreprise-enrichi-design.md", "04-liste-entreprises-enrichie-design.md", "07-leads-donnees-design.md", "08-ecran-leads-design.md", "10-ecran-actions-prospection-design.md", "13-contacts-design.md", "15-ecran-opportunites-design.md", "16-entretiens-donnees-design.md", "17-ecran-entretiens-design.md"]
date: "2026-09-27"
---

# Signaux

## Scope

Crée le modèle `Signal`, rattaché à une entreprise ou à un lead outbound, qui remplace les sections Notion `📡 Signaux` (entreprise) et `🔍 Signal` (lead outbound) du toolkit, sa validation, ses Server Actions, sa fraîcheur calculée et son sort à l'effacement d'un lead. Ajoute une card Signaux aux pages des entreprises et des leads outbound (ajout, modification, suppression), un bloc Signaux en lecture à leurs vues détail et le filtre « Signal récent » à leurs listes. Exclut tout écran Signaux, le calcul du score ICP (agents internes) et la veille automatisée de l'agent `signal-scout`.

### État livré

À la fin de ce sub-project, on peut : cliquer « Nouveau signal » dans la card Signaux de la page d'une entreprise, enregistrer une offre de poste datée du 1er du mois courant avec son lien, la retrouver en tête de la card et du bloc Signaux de sa vue détail avec le badge « Récent », puis voir l'entreprise ressortir au filtre « Signal récent » de la liste Entreprises.

## Dependencies

- `01-rgpd-prospection-design.md` (statut: draft) : Traitement 7 du registre et puce prospection de la politique, dont la liste des données s'enrichit des signaux
- `03-formulaire-entreprise-enrichi-design.md` (statut: draft) : `CompanyForm`, prop `relatedCards`
- `04-liste-entreprises-enrichie-design.md` (statut: draft) : `CompaniesTable`, facettes et vue détail des entreprises
- `07-leads-donnees-design.md` (statut: draft) : `Person`, `erasePersonExchanges(id)`, que ce sub-project étend aux signaux
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
- **À modifier** : `src/server/actions/persons.ts` et `src/server/actions/persons.test.ts` (`erasePersonExchanges` supprime aussi les signaux de la personne)
- **À modifier** : `src/server/queries/companies.ts`, `src/server/queries/leads.ts` (signaux de chaque fiche)
- **À créer** : `src/components/features/admin/signals/SignalFormDialog.tsx`, `DeleteSignalDialog.tsx`, `SignalList.tsx`, `SignalsCard.tsx`
- **À modifier** : `src/components/features/admin/companies/CompaniesTable.tsx` (bloc Signaux en lecture, facette, vue détail d'un signal)
- **À modifier** : `src/components/features/admin/companies/DeleteCompanyDialog.tsx` (signaux supprimés avec l'entreprise)
- **À modifier** : `src/app/admin/(protected)/entreprises/[id]/page.tsx` (card Signaux)
- **À modifier** : `src/components/features/admin/leads/LeadsTable.tsx` (bloc Signaux en lecture, facette, vue détail d'un signal)
- **À modifier** : `src/app/admin/(protected)/leads/[id]/page.tsx` (card Signaux)
- **À modifier** : `docs/registre-traitements.md` (Traitement 7, données), `content/legal/fr/confidentialite-intro.md`, `content/legal/en/confidentialite-intro.md` (puce prospection, données)

## Architecture approach

- **Remodélisation de Notion** (principe du propriétaire, 2026-09-27) : chaque ligne des sections `📡 Signaux` et `🔍 Signal` devient une ligne du modèle, avec les champs du gabarit du toolkit (`TEMPLATE_ENTREPRISE.md`, `TEMPLATE_LEAD_OUTBOUND.md`) ; aucun gabarit de Détails n'a de section Signal (`03`, `08`)
- **Modèle** (`.claude/rules/prisma/schema-migrations.md`, schema `freelance`) :

| Champ | Type | Règle |
|---|---|---|
| `type` | `SignalType` | requis ; valeurs par rattachement ci-dessous |
| `occurredOn` | `DateTime @db.Date` | requis ; au jour quand la source le donne, au 1er du mois sinon, un seul calendrier (gabarit du toolkit « JJ/MM/AAAA, ou MM/AAAA si le jour n'est pas public ; ne jamais inventer un jour ») |
| `content` | `String` | requis ; la « description courte » du toolkit, ce qui fait de l'événement un signal |
| `sourceUrl` | `String?` | lien vers la source, facultatif comme dans le toolkit, même règle que le site web d'une entreprise (`02`) |
| `companyId` | `String?`, `onDelete: Cascade` | entreprise du signal |
| `personId` | `String?`, `onDelete: Cascade` | personne (lead outbound) du signal ; contraintes SQL `CHECK` en migration : un seul des deux rattachements posé, et son type parmi ceux qu'il autorise |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz` | |

- **Rattachement et types** (listes du toolkit, `crm-doc/SKILL.md` et `TEMPLATE_LEAD_OUTBOUND.md`) : un signal a exactement un rattachement, fixé à la création par la fiche d'où il part et jamais modifié ; le formulaire ne propose que les types de ce rattachement, l'action refuse les autres. Pour une personne, l'identifiant du rattachement est celui de la personne (`Person.id`), le même que `Lead.personId` et que `AdminLead.id` : la card Signaux de la page du lead lit `AdminLead` sans conversion

| Rattachement | `SignalType` |
|---|---|
| Entreprise | `OFFRE_POSTE` (Offre de poste), `LEVEE` (Levée), `EXPANSION` (Expansion d'équipe), `NOUVEAU_PRODUIT` (Nouveau produit), `PIVOT` (Pivot), `ACQUISITION` (Acquisition) |
| Lead outbound | `POST` (Post engageant), `COMMENTAIRE` (Commentaire), `CONFERENCE` (Présence en conférence), `INTERACTION` (Interaction directe) |

  Un lead inbound ne reçoit jamais de signal (règle du toolkit : « un Lead Inbound n'a JAMAIS de section `🔍 Signal` »), un lead opposé non plus. Une contrainte SQL (`Signal_type_check`) impose en base ce lien entre le rattachement et le type ; un nouveau `SignalType` ajouté plus tard demande de la mettre à jour
- **Date affichée** (`src/lib/signals.ts`) : toujours au jour « 12/03/2026 », y compris pour un 1er du mois saisi faute de jour connu, relue en UTC comme toute colonne date
- **Fraîcheur** (`src/lib/signals.ts`, fonction pure) : matrice « Décote temporelle des signaux » du toolkit (`strategie-canaux.md`), l'âge comptant depuis `occurredOn`, y compris pour un signal daté au 1er du mois faute de jour connu

| Type | Récent | À confirmer | Périmé |
|---|---|---|---|
| Offre de poste | moins de 3 mois | 3 à 6 mois | plus de 6 mois |
| Levée | moins de 6 mois | 6 à 18 mois | plus de 18 mois |
| Expansion d'équipe, Nouveau produit | moins de 6 mois | 6 à 12 mois | plus de 12 mois |

  Les autres types n'ont pas de règle dans le toolkit : ni badge, ni place dans le filtre « Signal récent »
- **Glyphes** : `src/lib/signals.ts` exporte aussi `SIGNAL_TYPE_ICONS: Record<SignalType, IconComponent | null>` (Offre de poste `Megaphone`, Levée `TrendingUp`, Expansion d'équipe `Users`, Nouveau produit `Package`, Pivot `RotateCcw`, Acquisition `Merge`, Post engageant `PenLine`, Commentaire `MessageSquareText`, Présence en conférence `Mic`, Interaction directe `Hand`), imports nommés depuis `lucide-react`, type `IconComponent` de `@/lib/icons`
- **Validation** (`src/lib/schemas/signal.ts`, `.claude/rules/zod/schemas.md`) : date requise (date ISO) ; contenu requis ; lien vide → `null`
- **Actions** (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, motif `saveEntity` / `deleteEntity`) : `createCompanySignal(companyId)`, `createPersonSignal(personId)`, `updateSignal(id)`, `deleteSignal(id)`, `getCurrentUser()` en tête de chacune. La création sur une personne vérifie qu'elle porte le rôle Lead avec `origin OUTBOUND` et n'est pas opposée ; la modification relit le rattachement du signal pour valider le type et refuse un signal d'une personne opposée ; la suppression reste toujours possible. Revalidation en variante `layout` de `/admin/entreprises` et `/admin/leads`
- **RGPD** (`01`) : les signaux d'une personne restent après une opposition simple (`optOutPerson`), comme ses actions, et sont supprimés par `erasePersonExchanges(id)` dans la même transaction que ses actions ; ils partent avec la personne supprimée (rôle Lead retiré sans qu'il lui reste de rôle), ceux d'une entreprise avec l'entreprise. Le Traitement 7 et la puce prospection de la politique (FR, EN) ajoutent à leurs données « signaux d'activité professionnelle publique (publications, commentaires, présence en conférence) », les sources déclarées couvrant déjà profils publics et événements
- **Card Signaux** (`SignalsCard`, arbitrage « Élément rattaché à une fiche » de DESIGN.md) sur la page d'une entreprise (sous la card Opportunités du `15`) et d'un lead (sous la card Entretiens du `17`), hors du formulaire, en `RelatedLinksList` (type en libellé, décote puis contenu en méta, date en `trailing`, crayon et corbeille en `actions`) du plus récent au plus ancien ; bouton « Nouveau signal » dans l'en-tête de la card, pour une entreprise et pour un lead outbound. Présente aussi en création, vide avec « Après l'enregistrement de l'entreprise. » ou « Après l'enregistrement du lead. » et bouton désactivé (arbitrage « Cards rattachées des pages ») ; « Aucun signal. » sans signal une fois la fiche enregistrée. Sur la page d'un lead inbound, la card n'apparaît que s'il garde des signaux d'une origine précédente, sans bouton d'ajout. Gérée depuis sa propre card, jamais par un bouton de ligne de la liste des entreprises ou des leads
- **Saisie** (`SignalFormDialog`, fenêtre, arbitrage « Page ou modale d'édition ») : Type (`SelectField`) et Date (`OptionalDateField` du `05`, un seul calendrier, obligatoire ; quand la source ne donne que le mois, le 1er du mois s'y saisit), puis Lien source (`Input`), puis Contenu (`Textarea`)
- **Bloc Signaux** (`signalsSection`) dans les vues détail d'une entreprise et d'un lead, en `RelatedLinksList` en lecture : la même liste sans `actions`, chaque ligne ouvrant la vue détail du signal à la place de la vue courante (données déjà chargées) ; bloc absent sans signal (arbitrage du `08`). Un lead opposé n'a plus de page (`08`) : sa vue détail montre ses signaux gardés
- **Vue détail d'un signal** (`buildSignalDetail`), ouverte depuis les lignes Signaux des vues détail de l'entreprise et du lead : titre le type, sous-titre la date, badge de décote en tête ; bloc Signal (Lien source, Contenu) ; bloc « Rattaché à » en `RelatedLinksList` d'une ligne vers l'entreprise ou le lead (`href` avec `?detail=<id>`, comme toute fiche à page propre) ; bouton Modifier ouvrant `SignalFormDialog` sur ce signal
- **Filtre « Signal récent »** : facette à une option dans les listes Entreprises et Leads, toutes vues, calculée sur l'instant figé au montage de la table, motif du filtre « Échéance dépassée » (`10`)
- **Suppressions** : la confirmation de suppression d'une entreprise garde « Ses signaux sont supprimés avec elle. » ; celle d'un lead et le texte de la confirmation « Ne plus contacter » (`08`) nomment déjà ses signaux à côté de ses actions
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

### Scénario 6 : effacement des échanges
**GIVEN** deux leads outbound portant chacun un signal
**WHEN** on passe le premier en « Ne plus contacter » sans la case d'effacement, le second avec
**THEN** le signal du premier reste dans le bloc Signaux de sa vue détail, celui du second est supprimé

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
  - applies the funding and team expansion thresholds of the toolkit
  - counts a month-dated signal from the first day of its month
  - gives no freshness to a type the toolkit does not rate
  - flags a record with at least one recent signal
- `src/server/actions/signals.test.ts` :
  - attaches a new signal to its company
  - refuses a person-level type on a company
  - refuses a signal on an inbound or opted-out lead
  - rejects a call without a session, before touching the database
- `src/server/actions/persons.test.ts` :
  - deletes the person's signals when the erasure of exchanges is requested

## Edge cases

- **Lead passé d'outbound à inbound** : sa card Signaux reste, ses signaux modifiables et supprimables ; le bouton « Nouveau signal » disparaît
- **Lead opposé sans effacement** : ses signaux restent dans le bloc de sa vue détail comme historique, en lecture ; sa fiche n'ayant plus de page, ils ne partent qu'avec l'effacement de ses échanges ou la suppression du lead
- **Signal daté dans le futur** (conférence à venir) : accepté, et récent pour les types notés
- **Date au mois courant** : récente dès le 1er du mois, l'âge se comptant depuis le 1er
- **Entreprise rattachée à des projets ou des opportunités** : sa suppression reste refusée (`15`), ses signaux avec elle

## Architectural decisions

### Décision : rattachement

**Options envisagées :**
- **A. Un seul rattachement, fixé par la fiche d'origine** : entreprise pour les signaux d'entreprise, lead outbound pour les signaux de personne, comme les deux sections du toolkit
- **B. Entreprise et/ou lead** : un même signal sur deux fiches, fraîcheur et effacement ambigus

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : le toolkit sépare déjà les signaux d'entreprise (`📡 Signaux`) des signaux de personne (`🔍 Signal`)

### Décision : fraîcheur

**Options envisagées :**
- **A. Matrice du toolkit seule**, sur les quatre types qu'elle note
- **B. Matrice étendue** à tous les types par des durées choisies ici

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : on reprend la logique du toolkit transposée en app, sans règle métier nouvelle

### Décision : saisie

**Options envisagées :**
- **A. Sans écran dédié, depuis la fiche** : card Signaux de la page de l'entreprise ou du lead, bloc en lecture dans les vues détail
- **B. Écran Signaux** : liste de tous les signaux, entrée de menu absente de la maquette

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : les signaux vivent dans les fiches, comme dans Notion, et un élément rattaché se gère dans une card de la page de sa fiche, jamais par un bouton de ligne (arbitrage « Élément rattaché à une fiche » de DESIGN.md)

### Décision : signaux d'un lead opposé

**Options envisagées :**
- **A. Supprimés dès l'opposition**
- **B. Gardés après une opposition simple, supprimés à l'effacement des échanges**, comme les actions de prospection (`09`)

**Choix : B**

**Rationale :**
- Décision 9 de la décomposition, confirmée par le propriétaire le 2026-09-27
