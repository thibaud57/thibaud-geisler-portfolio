---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "reprise-donnees-notion"
goal: "Reprendre une fois dans la base de l'espace admin les données du CRM tenu dans Notion, remodélisées selon les modèles de l'app, puis les transférer en production."
status: "draft"
complexity: "L"
tdd_scope: "none"
depends_on: ["01-rgpd-prospection-design.md", "02-entreprise-enrichie-donnees-design.md", "04-liste-entreprises-enrichie-design.md", "05-entite-legale-depuis-fiche-design.md", "06-logo-depuis-site-web-design.md", "07-leads-donnees-design.md", "08-ecran-leads-design.md", "09-actions-prospection-donnees-design.md", "10-ecran-actions-prospection-design.md", "13-contacts-design.md", "14-opportunites-donnees-design.md", "15-ecran-opportunites-design.md", "16-entretiens-donnees-design.md", "17-ecran-entretiens-design.md", "18-revues-hebdo-design.md", "19-signaux-design.md"]
date: "2026-09-27"
---

# Reprise des données Notion

## Scope

Reprend une fois dans la base de dev les six bases du CRM Notion (Entreprises, Leads & Opportunités, Actions Prospection, Contacts & Relations, Reviews Hebdo, Suivi Entretiens) et les bandeaux de mission des hubs clients, remodélisées : chaque propriété vers son champ, chaque section de corps de page vers Détails, un signal ou une opportunité, un lead et un contact qui partagent l'identité vers une seule personne à deux rôles, chaque client final saisi sur une ESN vers une opportunité acceptée. Une session Claude prépare un fichier de reprise par le MCP Notion, un script jetable le valide et l'écrit ; la base est ensuite transférée en production par dump. Exclut les Chantiers, comptes-rendus d'activité et pages Équipe des hubs clients (suivi de mission, hors de ce découpage), `dentsu.md`, toute synchronisation continue avec Notion et tout écran.

### État livré

À la fin de ce sub-project, on peut : ouvrir en production chaque liste du CRM et y compter autant de fiches que dans sa base Notion, aux fusions et exclusions du relevé près, retrouver dans un contrôle ponctuel fiche par fiche les valeurs de Notion (dates d'origine comprises).

## Dependencies

- `01-rgpd-prospection-design.md` (statut: draft) : registre et politique à jour avant toute écriture de données personnelles ; journal privé des demandes RGPD, source des oppositions
- `02-entreprise-enrichie-donnees-design.md` (statut: draft) : champs CRM de l'entreprise, `companySchema`
- `04-liste-entreprises-enrichie-design.md` (statut: draft) : liste des entreprises qui sert au contrôle
- `05-entite-legale-depuis-fiche-design.md` (statut: draft) : entité légale, laissée vide par la reprise faute de raison sociale dans Notion
- `06-logo-depuis-site-web-design.md` (statut: draft) : `retrieveCompanyLogo`, appelée en lot sur les entreprises reprises
- `07-leads-donnees-design.md` (statut: draft) : modèles Person et Lead, `personFields`, `leadSchema`, `normalizeLinkedinProfileUrl`, `PERSON_FIELD_LABELS`, `optOutPerson`, `erasePersonExchanges`
- `08-ecran-leads-design.md` (statut: draft) : gabarits de Détails par origine, liste des leads qui sert au contrôle
- `09-actions-prospection-donnees-design.md` (statut: draft) : modèle des actions, `prospectingActionSchema`, `applyStatusRules` et date de réponse
- `10-ecran-actions-prospection-design.md` (statut: draft) : échéance de conservation affichée dans Leads > Tous
- `13-contacts-design.md` (statut: draft) : modèle Contact, `contactSchema`, rôle rattaché par `personId` et son gabarit de Détails
- `14-opportunites-donnees-design.md` (statut: draft) : modèle Opportunity, `opportunitySchema`
- `15-ecran-opportunites-design.md` (statut: draft) : `DEAL` devenu statut affiché
- `16-entretiens-donnees-design.md` (statut: draft) : modèle Interview, `interviewSchema`, `RDV_PLANIFIE` devenu statut affiché, gabarits réduits à l'échange
- `17-ecran-entretiens-design.md` (statut: draft) : écran des entretiens qui sert au contrôle
- `18-revues-hebdo-design.md` (statut: draft) : modèle WeeklyReview, compteurs figés, vendredi de clôture
- `19-signaux-design.md` (statut: draft) : modèle Signal, `occurredOn` au jour, au 1er du mois quand la source ne donne que le mois

## Files touched

- **À créer** : `scripts/reprise-notion/import-file.ts` (schéma Zod du fichier de reprise, bâti sur les schémas des formulaires)
- **À créer** : `scripts/reprise-notion/write.ts` (écriture de toutes les fiches en une transaction)
- **À créer** : `scripts/reprise-notion/index.ts` (entrée : simulation, écriture, logos en lot, rapport des comptes)
- **À modifier** : `Justfile` (recette `reprise-notion`, qui charge l'environnement comme `dev-login`)
- **À supprimer** : `scripts/reprise-notion/` et la recette `reprise-notion` (en fin de sub-project, la reprise validée)
- **À modifier** : `docs/PRODUCTION.md` (§ Procédure : Remplir la base depuis un dump de dev : tables CRM ajoutées au `TRUNCATE`, contrôle d'absence de modification en production depuis le dernier chargement, copie du dossier des logos)
- **Hors dépôt** : fichier de reprise JSON et relevé des points à trancher, supprimés en fin de sub-project

## Architecture approach

- **Préalables** : la release qui porte `01` à `19` est déployée en production, migrations appliquées. Aucune donnée personnelle n'est écrite avant que `01` soit en ligne. À partir de l'export, le CRM Notion n'est plus modifié : les skills `crm-doc` et `entretiens-doc` du toolkit n'y écrivent plus, la saisie passe par l'admin
- **Lecture de Notion par une session Claude**, comme le toolkit : `notion_query_data_source_by_values` pour les propriétés, `notion-fetch` pour les corps de page, identifiants des bases dans les références du toolkit (`crm-doc/references/*.json`, `entretiens-doc/references/entretien.json`), qui font foi sur les propriétés et leurs options. Aucun appel à Notion dans le code du dépôt (BRAINSTORM § Notes, décision Notion API)
- **Fichier de reprise** (JSON, hors du dépôt, jamais sous le dépôt même ignoré : il porte des données personnelles) : une liste par modèle ; chaque fiche porte sa clé (l'identifiant de page Notion), ses références par clé, sa date de création Notion et ses valeurs au format des formulaires de l'admin. `persons` porte l'identité (nom, coordonnées, entreprise par référence) ; `leads` et `contacts` ne portent que les champs de leur rôle et une référence vers une personne, jamais l'identité. La session l'accompagne d'un relevé des points à trancher (markdown) ; le propriétaire y répond, la session reporte ses réponses dans le fichier
- **Fusion des personnes** : construite par la session avant écriture du fichier, pas par le script. Un lead et un contact Notion qui partagent un email ou un LinkedIn (forme normalisée par `normalizeLinkedinProfileUrl`, `07`) deviennent une seule entrée `persons`, référencée par une entrée `leads` et une entrée `contacts` ; un conflit de champ se tranche par la fiche la plus récente, chaque divergence retenue va au relevé. Un interlocuteur d'entretien qui n'est ni lead ni contact devient une entrée `persons` avec une entrée `contacts`, dont le type se tranche au relevé des points à trancher
- **Script** lancé comme `scripts/dev-login.ts` (`pnpm exec tsx --conditions=react-server`, la condition résolvant `server-only`). Par défaut, une simulation : chaque fiche passe par le schéma de son formulaire (`companySchema`, `opportunitySchema`, `interviewSchema`, `weeklyReviewSchema`, `signalSchema`, `.claude/rules/zod/schemas.md`), une personne par un schéma bâti sur `personFields` (`07`), un rôle par la tranche de `leadSchema` ou `contactSchema` qui ne porte que ses champs propres (`.pick`, pas d'identité) ; chaque référence doit résoudre une clé, les unicités de la base (email et LinkedIn des personnes, une clé par rôle, vendredi de clôture) et les invariants tenus par les Server Actions (un seul propriétaire par signal, côté d'un entretien porté par son opportunité) sont vérifiés, puis le rapport donne les comptes par modèle et les erreurs par clé. `--write` refuse s'il reste une erreur ou si une table CRM contient déjà une ligne, écrit tout dans une transaction Prisma interactive avec `createdAt` à la date de création Notion (`.claude/rules/prisma/client.md`), puis, hors transaction, appelle `retrieveCompanyLogo` (`06`) pour chaque entreprise qui a un site web et pas de logo, en listant les échecs
- **Point de restauration** : `just db-dump` avant `--write`. Rejouer la reprise = `just db-reset`, `just db-restore <point>`, puis relancer, le script n'effaçant jamais rien
- **Entreprises déjà en base** : les six du portfolio, retrouvées par nom ou site web, gardent leurs champs publics (slug, nom, secteurs, taille, site web, logo), Notion n'en remplissant que les vides ; leurs champs CRM directement écrits (types, zones, statut de relation, notes, Détails), restés aux valeurs par défaut de la migration du `02`, viennent de Notion. Travaillée, premier contact et clients finaux ne sont plus des champs : ils se recalculent après coup sur les projets, actions et opportunités repris
- **Opportunités depuis les clients finaux** : chaque « client final » saisi sur une ESN dans Notion devient une opportunité `ACCEPTEE`, titre « Opportunité chez `<client>` via `<ESN>` », sans lead ni dates ni TJM, sauf si une opportunité reconstituée (§ Correspondances) couvre déjà ce couple ESN et client. Le type Prospect de Notion est abandonné sans reprise
- **Dates** : `Person.createdAt` = la plus ancienne date de création Notion des fiches fusionnées en elle ; `Lead.createdAt` et `Contact.createdAt` = la date de création de la fiche Notion d'origine de chaque rôle, point de départ des 3 ans de conservation de ce rôle (`01`), jamais la date de la reprise. Une date Notion sans heure versée dans un instant (`occurredAt`) vaut 00:00 heure de Paris ; une date avec heure garde son décalage Europe/Paris
- **Minimisation** : seuls les champs modélisés sont repris ; formule Logo.dev, taux calculés des revues, Priorité des entretiens et sections de préparation des entretiens ne le sont pas
- **Opposition** : Notion n'a aucune propriété « ne plus contacter ». La liste des personnes opposées vient du journal privé des demandes RGPD (`01`, rubrique « Demandes RGPD » de `docs/PRODUCTION.md`) ; Hors ICP et Perdu ne valent pas opposition. Une personne opposée est reprise en fiche réduite (email, LinkedIn, `optedOutAt` à la date de sa demande), ses rôles et leurs statuts gardés ; ses actions gardées comme historique sauf effacement demandé, auquel cas ni ses actions, ni ses signaux, ni sa place de correspondant d'entretien ne sont repris ; ses opportunités et entretiens restent, sans ce qui la décrit
- **Transfert en production** par la procédure de `docs/PRODUCTION.md` : contrôle d'abord que la production n'a pas été modifiée depuis le dernier chargement (plus récent `updatedAt` des tables de contenu), sinon ces modifications sont reportées en dev avant le dump ; `TRUNCATE` étendu aux tables CRM (`freelance."Person"`, `"Lead"`, `"ProspectingAction"`, `"Contact"`, `"Opportunity"`, `"Interview"`, `"WeeklyReview"`, `"Signal"`, `"_InterviewCorrespondents"`) ; dossier `freelance/crm/entreprises/` copié de `portfolio-admin-dev` vers `portfolio-admin`, chaque objet relu comme le 2026-09-25 ; Redeploy puis contrôle des listes
- **Fin de la reprise** : une fois la reprise validée en production, le fichier de reprise et le relevé sont supprimés et le script sort du dépôt

### Correspondances : Entreprises

| Notion | App |
|---|---|
| Nom, Site web | `name` (slug calculé comme à la création dans l'admin), `websiteUrl` |
| Type : Client final, ESN/Employeur | `types` : `CLIENT_FINAL`, `ESN_RECRUTEMENT` ; Prospect n'est pas repris, ce type n'existe plus dans le modèle |
| Type : Startup, PME, Grand compte | `size` quand Taille est vide : PME → `PME` ; Startup (`TPE` ou `PME`) et Grand compte (`ETI` ou `GROUPE`) fiche par fiche (`02`) |
| Taille | 50-250 → `PME`, 250-5000 → `ETI`, 5000+ → `GROUPE`, 1-50 → `TPE` ou `PME` fiche par fiche (`02`) |
| Secteur | `sectors`, même libellé ; E-marketing → `MARKETING_COMMUNICATION` |
| Zone géographique | `zones`, même libellé |
| Statut relation | `relationStatus` : `ACTIVE`, `DORMANTE`, `ARCHIVEE` |
| Notes | `notes` |
| Travaillé | non écrit, `worked` n'étant plus un champ : sert seulement à contrôler après coup que l'entreprise porte un projet `CLIENT` ou une opportunité `ACCEPTEE` (§ Acceptance criteria, écart sinon listé au relevé) |
| Date de premier contact, plus ancienne que toute action reprise vers une personne de l'entreprise | action « Premier contact » (`channel AUTRE`, `status FAIT`, `occurredAt` = cette date à 00:00 Paris) sur la personne la plus ancienne de l'entreprise, ou à l'écart si l'entreprise n'a aucune personne |
| Client final saisi sur une ESN | opportunité `ACCEPTEE` (§ Correspondances : Entretiens et opportunités), sauf si une opportunité reconstituée couvre déjà ce couple ESN et client |
| Corps : 📡 Signaux | une ligne `Signal` par signal (§ Signaux) |
| Corps : 💼 Mon expérience | non reprise quand un projet du portfolio porte l'entreprise, sinon Détails |
| Corps : autres sections (À propos, Chiffres clés, Coordonnées siège, Activités, Contexte de la relation, Liens, Notes libres) | `details`, sous leur titre ; l'entité légale reste vide, Notion n'ayant pas de raison sociale |

### Correspondances : Personnes

Une entrée `persons`, fusionnée quand un lead et un contact Notion partagent l'email ou le LinkedIn (§ Architecture approach).

| Notion | App |
|---|---|
| Nom Contact (lead) ou Nom (contact) | `name` |
| Email, Téléphone, LinkedIn | `email`, `phone`, `linkedinUrl` |
| Poste | `jobRole`, même libellé ; Product Manager → `PRODUCT_OWNER` (`07`) |
| Localité (lead) ou Localisation (contact) | `zone`, même libellé ; Inconnu → vide (`07`) ; la plus précise si Notion en porte plusieurs, les autres au relevé (§ Architecture approach) |
| Date Rencontre (lead) | `metAt` |
| Entreprise | `company`, par référence |
| Notes (lead ou contact) | `notes` |
| Corps du lead : Stack | `details`, sous un titre « Stack (Notion) » |
| Corps du lead : 📅 Timeline | `details`, sous un titre « Timeline (Notion) » |
| Corps du lead : 💡 Hypothèse / Angle, 🎯 Contexte & Prochaine action | `details`, sous les titres du gabarit de son origine (`08`) |
| Corps du contact | `details`, sous les titres du gabarit du `13` |

### Correspondances : Leads (rôle)

| Notion | App |
|---|---|
| Origine | `origin` : `INBOUND`, `OUTBOUND` |
| Statut | `NOUVEAU`, `SUSPECT`, `DISCUSSION`, `HORS_ICP`, `PERDU`, `STAND_BY` ; 📅 RDV planifié et ✅ Deal → `DISCUSSION`, ces deux statuts n'étant plus qu'affichés (`15`, `16`) |
| Intérêt | `interest` : `HOT`, `WARM`, `COLD` ; Unknown ou vide → `NONE_VALUE` (`"aucun"`), `interest` étant facultatif |
| Canal | `channel` : `LINKEDIN`, `SITE_WEB`, `CANDIDATURE`, `PLATEFORME`, `REFERENCE`, `EVENEMENT`, `COLD_EMAIL`, `COLD_CALL`, `AUTRE` |
| Corps : 🔍 Signal | une ligne `Signal` sur la personne (§ Signaux) |
| Corps : 📋 Mission | une opportunité apportée par le lead (§ Correspondances : Entretiens et opportunités) |

### Correspondances : Contacts (rôle)

| Notion | App |
|---|---|
| Type | `types` : `COLLEGUE`, `CLIENT`, `PARTENAIRE`, `MENTOR`, `CONTACT_TECH`, `COMMERCIAL` |
| Statut | `status` : `ACTIF`, `INACTIF`, `A_RECONTACTER` |
| Dernière interaction, plus tardive que toute action reprise vers la personne | action « Dernier échange » (`channel AUTRE`, `status FAIT`, `occurredAt` = cette date à 00:00 Paris) sur la personne |

### Correspondances : Actions et Revues

| Notion | App |
|---|---|
| Action : Action, Lead, corps 💬 Message | `title`, `personId` (référence de la personne du lead), `message` |
| Action : Date | `occurredAt` |
| Action : Canal | `CANDIDATURE`, `CONNEXION_LINKEDIN`, `DM_LINKEDIN`, `EMAIL`, `SMS_WHATSAPP`, `CALL`, `AUTRE` |
| Action : Statut | `A_FAIRE`, `FAIT`, `REPONDU`, `CONVERTI`, `IGNORE` ; pour Répondu et Converti, `respondedAt` = `occurredAt`, seule date que Notion garde : le dernier contact n'est jamais plus tardif que le réel |
| Revue : Semaine, taux | non repris, déduits (`18`) |
| Revue : Date vendredi | `closingFriday` |
| Revue : sept compteurs | `connectionsSent`, `connectionsAccepted`, `messagesSent`, `conversationsEngaged`, `meetingsBooked`, `interviewsHeld`, `activeLeads`, valeurs Notion telles quelles |
| Revue : Statut, Motivation | `BONNE`, `MOYENNE`, `MAUVAISE` ; `HAUTE`, `POSITIVE`, `NEUTRE`, `BASSE` |
| Revue : corps 🎯 Victoires, ⚠️ Blocages, 📅 Plan S+1, 📝 Notes libres | `wins`, `blockers`, `nextWeekPlan`, `notes` |

### Correspondances : Entretiens et opportunités

| Notion | App |
|---|---|
| Entretien : Nom, étape du Statut (Lead, Premier contact, Entretien 1, Entretien 2) | non repris, titre et numéro déduits (`16`) |
| Entretien : Entretien Lié | les entretiens chaînés forment une seule opportunité |
| Entretien : Entreprise | `side` : `ESN` quand c'est l'intermédiaire de l'opportunité, `CLIENT_FINAL` quand c'est son client |
| Entretien : Correspondant, Date Entretien, Score | `correspondents` (référence de personne : lead, contact ou nouvelle personne au rôle Contact si l'interlocuteur n'est ni l'un ni l'autre, § Architecture approach), `scheduledAt`, `score` |
| Entretien : Type Entretien | `RECRUTEUR_RH`, `TECHNIQUE`, `MANAGER_EQUIPE`, `NEGOCIATION` ; Statut Premier contact → `PREMIER_CONTACT` |
| Entretien : résultat | `status` : `PLANIFIE` si la date est à venir, `FAIT` sinon, Notion n'en gardant aucun ; `outcome` laissé vide (Notion ne distingue pas l'issue par entretien, seul 🎬 le fait, ligne suivante) |
| Entretien : issue du Statut (Offre reçue, Accepté, Refusé, En pause) | statut de l'opportunité : `OFFRE_RECUE`, `ACCEPTEE`, `REFUSEE`, `EN_PAUSE` (`14`) |
| Entretien : Contrat, Salaire/TJM | opportunité : `FREELANCE` et `dailyRate` quand le montant est un TJM ; `CDI` quand c'est un salaire, porté dans les Détails de l'opportunité ; l'ESN se lit sur le lien, Startup sur le type de l'entreprise (`14`) |
| Entretien : Localisation | opportunité : `zone` (le plus précis si Notion en donne plusieurs, les autres au relevé) ; Hybrid → `HYBRIDE`, Remote → `REMOTE` |
| Entretien : corps, sections d'échange (contexte du contact, flags, évaluation, suite, notes) | `details`, sous les titres du gabarit de son type (`16`) ; `decision` seulement si 🎬 dit clairement Oui très intéressé, Oui sous conditions ou Non |
| Entretien : corps, Informations Mission, Package, Budget & Facturation | champs et Détails de l'opportunité |
| Entretien : corps, Politique ESN, Informations Startup, Culture & Vision | Détails de l'entreprise concernée |
| Opportunité tirée d'une chaîne d'entretiens | ESN et client final lus sur les entretiens et Informations Mission ; statut : issue du dernier entretien, sinon `EN_PROCESS` |
| Opportunité tirée du 📋 Mission d'un lead inbound | apportée par ce lead ; statut selon le lead : Nouveau, Suspect → `PROPOSEE` ; Discussion, RDV planifié → `EN_PROCESS` ; ✅ Deal → `ACCEPTEE` ; Stand-by → `EN_PAUSE` ; Perdu → `REFUSEE` ; Hors ICP → `DECLINEE` ; l'issue d'un entretien de l'opportunité l'emporte |
| Lead 📅 RDV planifié | entretien `PLANIFIE` de son opportunité, à la date de l'entretien Notion correspondant (`16`) |
| Opportunité du bandeau d'un hub client | opportunité `ACCEPTEE` : nature, ESN, démarrage, TJM, rythme, lieu, durée |
| Client final saisi sur une entreprise ESN, hors chaîne d'entretiens et hors bandeau | opportunité `ACCEPTEE`, titre « Opportunité chez `<client>` via `<ESN>` », sans lead ni dates ni TJM, sauf si une des opportunités ci-dessus couvre déjà ce couple ESN et client |
| Même opportunité décrite par plusieurs sources | une seule opportunité, fusion proposée par la session et tranchée au relevé |

### Correspondances : Signaux

| Notion | App |
|---|---|
| Ligne 📡 `**<Type>** (<date>) : <description> — [source](url)` | `Signal` de l'entreprise : offre poste → `OFFRE_POSTE`, levée → `LEVEE`, expansion → `EXPANSION`, produit → `NOUVEAU_PRODUIT`, pivot → `PIVOT`, acquisition → `ACQUISITION` ; description → `content`, lien → `sourceUrl` |
| Section 🔍 (Type, Source, Date du signal, Contenu) | `Signal` de la personne (`personId`, rôle Lead) : post engageant → `POST`, commentaire → `COMMENTAIRE`, présence conf → `CONFERENCE`, interaction directe → `INTERACTION` |
| Date JJ/MM/AAAA, MM/AAAA | `occurredOn` : la date telle quelle au jour ; au premier du mois quand seul le mois est connu (« ne jamais inventer un jour ») |

## Acceptance criteria

### Scénario 1 : la simulation arrête une fiche invalide
**GIVEN** un fichier de reprise où deux personnes portent le même email
**WHEN** le script tourne en simulation
**THEN** le rapport nomme les clés des deux fiches et l'unicité violée
**AND** `--write` refuse d'écrire tant que l'erreur reste

### Scénario 2 : l'écriture reprend tout en une fois
**GIVEN** un fichier sans erreur et des tables CRM vides
**WHEN** le script tourne avec `--write`
**THEN** toutes les fiches sont écrites dans une seule transaction, chacune avec sa date de création Notion
**AND** les comptes par modèle égalent ceux des bases Notion, aux fusions et exclusions du relevé près

### Scénario 3 : la conservation part de la date Notion
**GIVEN** un lead créé dans Notion le 15/03/2024, sans action Répondu ni Converti
**WHEN** il est repris le 2026-10-15
**THEN** Leads > Tous affiche « À conserver jusqu'au » 15/03/2027

### Scénario 4 : un lead Deal apporte une opportunité acceptée
**GIVEN** un lead inbound ✅ Deal dont le corps porte une section 📋 Mission
**WHEN** il est repris
**THEN** il est enregistré en Discussion et apporte une opportunité Acceptée
**AND** il s'affiche « Deal » dans la liste des leads

### Scénario 5 : un lead et un contact fusionnent en une personne
**GIVEN** un lead Notion et un contact Notion qui partagent le même email
**WHEN** ils sont repris
**THEN** une seule personne est écrite, avec le rôle Lead et le rôle Contact
**AND** ses champs divergents entre les deux fiches valent ceux de la plus récente, l'autre valeur listée au relevé

### Scénario 6 : un client final devient une opportunité acceptée
**GIVEN** une ESN Notion dont la fiche porte le client final « Exemple SA », sans opportunité reconstituée pour ce couple
**WHEN** elle est reprise
**THEN** une opportunité Acceptée « Opportunité chez Exemple SA via <ESN> » est écrite, sans lead ni dates ni TJM

### Scénario 7 : une entreprise travaillée sans opportunité ni projet client est un écart
**GIVEN** une entreprise Notion marquée Travaillé, sans projet de type CLIENT ni opportunité Acceptée après reprise
**WHEN** le contrôle des comptes tourne
**THEN** l'entreprise apparaît dans les écarts du relevé

### Scénario 8 : un signal daté au mois
**GIVEN** une entreprise dont la section 📡 Signaux porte `**Levée** (03/2026) : série A — [source](https://exemple.fr/levee)`
**WHEN** elle est reprise
**THEN** elle a un signal Levée daté du 1er mars 2026, avec ce lien
**AND** la ligne ne figure pas dans ses Détails

### Scénario 9 : une entreprise du portfolio garde ses valeurs
**GIVEN** une entreprise déjà en base avec un secteur et sans site web, et la même entreprise dans Notion avec un autre secteur, un site web et le statut de relation Dormante
**WHEN** elle est reprise
**THEN** son secteur reste celui du portfolio et son site web vient de Notion
**AND** son statut de relation passe à Dormante

### Scénario 10 : le transfert protège la production
**GIVEN** une fiche de contenu modifiée en production après le dernier chargement
**WHEN** le contrôle d'avant dump tourne
**THEN** il la signale et le dump n'est pas chargé tant que la modification n'est pas reportée en dev

### Scénario 11 : la reprise ne laisse rien derrière elle
**GIVEN** la reprise validée en production
**WHEN** le sub-project se termine
**THEN** le fichier de reprise et le relevé sont supprimés
**AND** `scripts/reprise-notion/` et la recette `reprise-notion` n'existent plus

## Edge cases

- **Signal sans date ou de type hors liste** : la ligne reste dans les Détails sous son titre et entre au relevé ; aucune date n'est inventée
- **Personne liée à plusieurs entreprises** : une seule est reprise, choisie au relevé
- **Client final d'une section 📋 Mission ou d'une fiche ESN absent des entreprises Notion** : au relevé, créer l'entreprise ou garder son nom dans les Détails de l'opportunité
- **Lead 📅 RDV planifié sans entretien Notion daté** : repris en Discussion sans entretien, signalé au relevé ; la date d'un entretien n'est jamais inventée
- **Action sans personne** : la personne est requise ; au relevé, rattacher l'action ou l'écarter
- **Email ou LinkedIn porté par deux entrées `persons`** : bloqué par la simulation, signe d'une fusion oubliée ; à fusionner au fichier ou à corriger au relevé
- **Interlocuteur d'entretien sans rôle** : devient une personne au rôle Contact, dont le type se tranche au relevé des points à trancher
- **Personne opposée correspondante d'un entretien** : l'entretien et son opportunité restent, sans ce qui la décrit (`16`) ; si l'effacement des échanges a été demandé, elle ne figure pas non plus parmi les correspondants
- **Deux entreprises ESN saisissent le même couple ESN et client final** : une seule opportunité Acceptée est écrite, la seconde source entre au relevé
- **Localité multiple sur une personne ou une opportunité** : la plus précise est reprise (Grand Est ou Paris avant France, avant Luxembourg, avant les pays voisins, avant Europe, avant Monde), les autres au relevé
- **Logo introuvable** : l'entreprise reste sans logo, listée au rapport ; dépôt manuel depuis sa page
- **Reprise à rejouer** : restauration du point pris avant `--write`, jamais de suppression par le script

## Architectural decisions

### Décision : méthode de reprise

**Options envisagées :**
- **A. Saisie à la main dans l'admin** : aucun code, mais long, et l'admin ne sait pas saisir une date de création passée : les 3 ans de conservation partiraient du jour de la reprise
- **B. Session Claude qui prépare un fichier au format de l'app, script qui le valide et l'écrit** : même logique que le toolkit, qui applique ses références par Claude ; le texte libre (📋 Mission, sections d'entretien) se lit bien ; le propriétaire relit les points à trancher avant toute écriture ; un script jetable
- **C. Script qui fait toute la conversion, session qui n'exporte que le brut** : déterministe, mais beaucoup de code jetable et un texte libre mal découpé par du code

**Choix : B** (propriétaire, 2026-09-27)

**Rationale :**
- Les dates d'origine se reprennent, ce que A interdit
- Les schémas des formulaires valident chaque fiche comme une saisie dans l'admin ; seul le jugement sur le texte libre revient à la session, et il passe par le relevé
- Le code écrit se limite à valider et écrire, puis sort du dépôt

### Décision : transfert en production

**Options envisagées :**
- **A. Reprise en dev puis dump vers la production**, comme l'epic espace admin, après contrôle que la production n'a pas bougé depuis le dernier chargement
- **B. Écriture directe en production** : la base n'est joignable que du réseau Docker interne et l'image de l'app ne porte pas de script
- **C. Recopier d'abord la production en local** : protège des modifications faites en production, au prix d'une étape de plus que le contrôle de A rend inutile

**Choix : A** (propriétaire, 2026-09-27)

**Rationale :**
- Procédure déjà exécutée et documentée, étendue aux tables CRM
- Le contrôle d'avant dump couvre le seul risque de A : écraser une modification faite en production

### Décision : entreprises déjà en base

**Options envisagées :**
- **A. Notion écrase** les valeurs des six entreprises du portfolio
- **B. Le portfolio garde ses champs publics**, Notion n'en remplit que les vides et apporte les champs CRM

**Choix : B** (propriétaire, 2026-09-27)

**Rationale :**
- Les champs publics alimentent le site, relu et publié le 2026-09-25 ; même règle que la fiche lead choisie dans un contact (`13`) : remplir les vides, ne jamais écraser
- Les champs CRM de ces entreprises n'ont jamais été saisis : `relationStatus` n'y est jamais vide mais vaut son défaut de migration (`ACTIVE`), que Notion remplace
