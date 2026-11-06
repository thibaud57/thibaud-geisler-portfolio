---
feature: "Feature 3 : Outils de l'app pour les agents"
subproject: "page-cles-api"
goal: "Créer, lister et supprimer depuis l'espace admin les clés d'API des agents, la valeur d'une clé n'étant affichée qu'une fois."
status: "implemented"
complexity: "M"
tdd_scope: "partial"
execution: "subagent-driven"
model: "opus"
effort: "medium"
depends_on: ["01-prototype-serveur-mcp-design.md"]
date: "2026-11-06"
---

# Page des clés d'API

## Scope

Couvre la page `/admin/cles-api`, ouverte par une entrée du menu de compte : liste des clés, création avec la valeur affichée une seule fois et copiable, suppression confirmée. S'y ajoutent les Server Actions de création et de suppression et la query de liste. Exclut les outils MCP eux-mêmes, la modification d'une clé existante (une clé se remplace : on en crée une nouvelle et on supprime l'ancienne) et toute rotation automatique.

### État livré

À la fin de ce sub-project, on peut : créer depuis la page une clé limitée au CRM, la copier depuis la modale qui ne l'affiche qu'une fois, l'utiliser sur `/api/mcp/crm`, puis la supprimer depuis la liste, après quoi la route la refuse en 401.

## Dependencies

- `01-prototype-serveur-mcp-design.md` (statut: draft) : modèle `Apikey`, plugin `@better-auth/api-key` configuré, domaines partagés `src/lib/mcp-domains.ts`, route qui vérifie les clés

## Références de design

- **Maquette** : `isApiKeys` (page), `dlgApiKeyForm` (création), `dlgApiKeyCreated` (clé affichée une fois), confirmation `delete-api-key` (table `CONFIRMS`), entrée `apiKeys` de `userMenuItems` (menu de compte), dans `.design-sync/maquette/Espace admin.dc.html`
- **Design system** : `AdminPageShell`, `DataTable`, `TitleCell`, `Badge`, `RowActionButton`, `EmptyState`, `Dialog`, `Select`, `MultiSelectCombobox`, `InputGroup`, `Alert`, `ConfirmDeleteDialog`, `Toast`, `DropdownMenu` (`.design-sync/design-system/components/<Nom>/README.md`)
- **Règle de lecture** : `.claude/rules/design/claude-design.md`

## Files touched

- **À créer** : `src/app/admin/(protected)/cles-api/page.tsx`
- **À créer** : `src/app/admin/(protected)/cles-api/loading.tsx` (réexport du `loading` de `(protected)`)
- **À créer** : `src/components/features/admin/api-keys/ApiKeysTable.tsx`
- **À créer** : `src/components/features/admin/api-keys/ApiKeyFormDialog.tsx` (formulaire puis vue de la clé créée)
- **À créer** : `src/components/features/admin/api-keys/ApiKeyCreatedView.tsx`
- **À créer** : `src/components/features/admin/api-keys/DeleteApiKeyDialog.tsx`
- **À créer** : `src/components/features/admin/api-keys/api-key-table-widths.ts`
- **À créer** : `src/components/features/admin/api-keys/api-key-labels.ts` (`API_KEY_FIELD_LABELS`)
- **À créer** : `src/server/actions/api-keys.ts`
- **À créer** : `src/server/actions/api-keys.types.ts`
- **À créer** : `src/server/actions/api-keys.integration.test.ts`
- **À créer** : `src/server/queries/api-keys.ts`
- **À créer** : `src/lib/schemas/api-key.ts`
- **À créer** : `src/config/admin-account-items.ts`
- **À modifier** : `src/lib/admin/routes.ts` (`ADMIN_API_KEYS_PATH = "/admin/cles-api"`)
- **À modifier** : `src/components/layout/admin/AdminUserMenu.tsx` (entrées de `ADMIN_ACCOUNT_ITEMS` avant « Déconnexion »)
- **À modifier** : `src/components/layout/admin/AdminPageTitle.tsx` (titre des pages du menu de compte)
- **À modifier** : `docs/PRODUCTION.md` (§ Rotation : remplacer une clé d'API ; checklist de release : essai depuis Claude Desktop et claude.ai à la première mise en production)
- **À modifier** : `docs/ARCHITECTURE.md` (§ Frontend > Structure du Code : ligne `config/` pour `admin-account-items.ts` ; § Backend > API : Server Actions et query des clés d'API, page `/admin/cles-api`)

## Architecture approach

- **Page** : `AdminListPage` (`src/components/layout/admin/AdminListPage.tsx`) avec le titre et le sous-titre de `isApiKeys`. Le déclencheur de création (`Button` à icône `Plus`, comme celui des tags) passe en `actions`, la table sous le `Suspense` de `AdminListPage`. `getCurrentUser()` en tête de page, `loading.tsx` réexporté (`.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/admin.md`)
- **Liste** : `findApiKeysForAdmin()` dans `src/server/queries/api-keys.ts`, un `prisma.apikey.findMany` avec un `select` qui exclut `key` : le hash ne quitte jamais la base. Les `permissions`, stockées en texte JSON, se parsent par Zod en liste de domaines connus (`isMcpDomain`). Lecture admin sans `'use cache'` (`.claude/rules/nextjs/data-fetching.md`)
- **Création** : `createApiKey(_prev, formData)`, `getCurrentUser()` en première ligne hors instrumentation, puis `saveEntity`. Le schéma `apiKeySchema` (`src/lib/schemas/api-key.ts`) contient :
  - `name` : chaîne trimée de 1 à 32 caractères, borne `maximumNameLength` du plugin
  - `domains` : au moins un domaine de `MCP_DOMAINS`, lu par `formData.getAll`
  - `expiry` : `'30' | '90' | '365' | 'none'`
  
  `persist` appelle `auth.api.createApiKey({ body: { userId, name, permissions, expiresIn } })` **sans `headers`**. Le champ du body est bien `userId` (propriété server-only du schéma de création 1.7.14), la colonne stockée étant `referenceId`. `permissions` vaut `{ <domaine>: ['read', 'write'] }` pour chaque domaine choisi, `expiresIn` le nombre de jours × 86 400, omis pour `none`. L'état de succès porte `{ name, key }`, seule sortie de la valeur en clair, construit par le callback `onSuccess` de `saveEntity` qui rend l'état de son choix (`ApiKeyFormState` dans `api-keys.types.ts`, bâti sur `FormActionState` de `src/lib/form-state.ts` avec l'extra `{ created: { name: string; key: string } }` sur le succès). Log `api_key:created` avec `keyId`, jamais la clé. Invalidation `revalidatePath(ADMIN_API_KEYS_PATH)` (`.claude/rules/better-auth/api-key.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/server-actions-security.md`, `.claude/rules/zod/schemas.md`)
- **Suppression** : `deleteApiKey(rawId)`, `getCurrentUser()` puis `deleteEntity` avec `prisma.apikey.delete({ where: { id } })`. Une clé déjà supprimée répond comme une réussite (P2025 idempotent de `deleteEntity`). Log `api_key:deleted`. Pas de contrôle de propriétaire : l'espace est single-user et la whitelist n'admet qu'un compte
- **Vue de la clé créée** : second état de la même `FormDialog`. Quand l'état de l'action est un succès, `ApiKeyFormDialog` rend `ApiKeyCreatedView` à la place du formulaire. Cette vue porte :
  - titre, description, aide, `Alert` d'avertissement et pied tels que `dlgApiKeyCreated` les montre
  - `InputGroup` avec un `InputGroupInput` en lecture seule et `font-mono`, et un `InputGroupButton` de copie, sur `src/components/ui/input-group.tsx` déjà installé
  - un seul bouton `default`, qui appelle `onDone`
  
  La valeur ne vit que dans l'état de la modale : `FormDialog` remonte son contenu à chaque ouverture, elle disparaît donc à la fermeture. Le toast de création part au succès par `useSaveFeedback`, dont le callback `onSaved` bascule sur la vue de la clé au lieu d'appeler `onDone` : `FormDialog` ne se ferme que par `onDone` ou par l'utilisateur, aucun composant partagé ne change
- **Copie** : `navigator.clipboard.writeText`, avec un toast de confirmation. Si l'API est refusée, toast d'erreur qui invite à sélectionner le texte du champ
- **Table** : `DataTable` dans sa `Card`, recherche sur le nom et le début de clé, `noun` « clé », sans clic de ligne : une clé n'a rien de plus à montrer. Colonnes de `isApiKeys`, largeurs dans `api-key-table-widths.ts` (multiples de 8, relevées sur la maquette) :
  - Nom : `TitleCell` avec le nom en titre et le champ `start` du plugin (6 premiers caractères, préfixe compris) suivi de « … » en sous-titre `mono`
  - Domaines : un `Badge` `meta` `outline` par domaine, libellé de `MCP_DOMAIN_LABELS`
  - Création et expiration : `formatShortInstantDate`, avec l'état sans expiration de la maquette quand `expiresAt` est nul
  - Dernière utilisation : `formatShortDateTime(lastRequest)`, avec l'état jamais utilisée de la maquette quand elle est nulle
  - Actions : `ACTIONS_COLUMN_WIDTH`

  Libellés partagés par la table et le formulaire dans `API_KEY_FIELD_LABELS` (`.claude/rules/shadcn-ui/admin-textes.md`). État vide : celui de `isApiKeys`
- **Suppression confirmée** : `DeleteApiKeyDialog` enveloppe `ConfirmDeleteDialog` (`src/components/features/admin/form/ConfirmDeleteDialog.tsx`) avec le nom de la clé, la description et le `successMessage` de la confirmation `delete-api-key`. Vocabulaire « supprimer » partout (titre, bouton, `aria-label` de la corbeille, toast, alerte de la vue de la clé), décision du propriétaire du 2026-11-06, composant inchangé
- **Menu de compte** : `ADMIN_ACCOUNT_ITEMS` (`src/config/admin-account-items.ts`) liste les pages qui s'ouvrent depuis le menu de compte, `{ href: ADMIN_API_KEYS_PATH, label: <libellé de l'entrée `apiKeys` de `userMenuItems`>, icon: KeyRound }`. Deux composants en dépendent :
  - `AdminUserMenu` les rend en `DropdownMenuItem asChild` sur un `Link`, entre le séparateur et « Déconnexion »
  - `AdminPageTitle` les consulte après `ADMIN_NAV_GROUPS`, sans quoi l'en-tête afficherait « Espace admin »

## Acceptance criteria

### Scénario 1 : création d'une clé limitée au CRM
**GIVEN** l'admin connecté sur `/admin/cles-api`
**WHEN** il crée la clé « Poste » avec le domaine CRM et l'expiration à 90 jours
**THEN** la modale affiche la valeur complète, préfixée `tgp_`, avec son bouton de copie
**AND** la liste montre « Poste », le badge CRM, la date du jour, une expiration à 90 jours et le seul début de la clé suivi de « … »

### Scénario 2 : valeur affichée une seule fois
**GIVEN** la vue de la clé créée
**WHEN** l'admin la ferme puis rouvre le formulaire de création ou recharge la page
**THEN** le formulaire est vide et la valeur complète n'apparaît nulle part, ni dans la page ni dans ses données

### Scénario 3 : la clé ouvre puis ferme la route MCP
**GIVEN** une clé créée depuis la page avec le domaine CRM
**WHEN** un client appelle `/api/mcp/crm` avec cette clé, puis la clé est supprimée depuis la liste et le client rappelle
**THEN** le premier appel est servi et le second reçoit 401
**AND** la vérification se fait avec le client `@modelcontextprotocol/client` du sub-project 01, ou par `curl` avec `Accept: application/json, text/event-stream` et `Content-Type: application/json`, la session admin venant de `just dev-login <fichier>`

### Scénario 4 : saisie invalide
**GIVEN** le formulaire de création
**WHEN** l'admin envoie un nom vide, un nom de plus de 32 caractères ou aucun domaine
**THEN** l'erreur s'affiche sous le champ concerné, la saisie est conservée et aucune clé n'est créée

### Scénario 5 : clé sans expiration
**GIVEN** le formulaire de création
**WHEN** l'admin choisit l'option sans expiration
**THEN** la clé est créée sans `expiresAt` et la colonne d'expiration affiche l'état sans expiration de `isApiKeys`

### Scénario 6 : suppression
**GIVEN** une clé dans la liste
**WHEN** l'admin clique sa corbeille et confirme dans la confirmation `delete-api-key`
**THEN** la ligne disparaît et le toast de suppression s'affiche
**AND** une suppression d'une clé déjà supprimée ailleurs répond aussi par une réussite

### Scénario 7 : accès depuis le menu de compte
**GIVEN** une page quelconque de l'espace admin
**WHEN** l'admin ouvre le menu de compte et choisit l'entrée des clés d'API
**THEN** la page des clés s'ouvre et l'en-tête affiche le libellé de cette entrée

### Scénario 8 : action sans session
**GIVEN** une requête sans session admin valide
**WHEN** elle appelle `createApiKey` ou `deleteApiKey`
**THEN** la garde `getCurrentUser()` la refuse avant toute écriture

## Tests à écrire

### Integration
- `src/server/actions/api-keys.integration.test.ts` (base de test, `User` créé par Prisma, `getCurrentUser` mocké sur cet utilisateur, `next/headers`, `next/cache` et `@/lib/logger` mockés, motif de `contacts.integration.test.ts`) :
  - crée une clé CRM à 90 jours : succès, valeur préfixée `tgp_`, `auth.api.verifyApiKey` la déclare valide avec `permissions` `{ crm: ['read', 'write'] }`, `expiresAt` à 90 jours
  - crée une clé `none` sans `expiresAt`
  - refuse un nom vide, un nom de 33 caractères, une liste de domaines vide ou inconnue : erreurs de champ, saisie renvoyée, aucune ligne créée
  - supprime une clé, que `verifyApiKey` déclare ensuite invalide
  - liste une clé expirée (créée avec les autres clés du test, puis expirée par `prisma.apikey.update` avant toute nouvelle création, la purge en tâche de fond de `createApiKey` pouvant sinon la retirer)
  - répond par une réussite à la suppression d'un id inconnu
  - refuse sans session (`getCurrentUser` qui lève), aucune ligne créée ni supprimée
  - logge `api_key:created` avec `keyId`, et aucun appel au logger ne contient la valeur de la clé
  - `findApiKeysForAdmin` renvoie les clés sans le champ `key`, avec leurs domaines parsés

## Edge cases

- **Clé expirée** : elle reste listée avec sa date passée. La purge globale des clés expirées est lancée en tâche de fond par `createApiKey` et les autres endpoints de gestion du plugin, au plus une fois toutes les 10 s (`@better-auth/api-key` 1.7.14, `dist/index.mjs:2061-2066`) ; `verifyApiKey` ne supprime que la clé qu'il vérifie
- **Fermeture de la vue par la croix, Échap ou un clic hors de la modale** : la valeur est perdue, comme l'annonce l'alerte. Il suffit de supprimer la clé et d'en créer une autre
- **Presse-papiers refusé** (contexte non sécurisé, permission) : toast d'erreur, la valeur reste sélectionnable dans le champ en lecture seule
- **Erreur du plugin à la création** (borne d'expiration, base indisponible) : toast d'erreur générique (`unknown_error`), saisie conservée. Le schéma empêche les cas connus

## Architectural decisions

### Décision : passer par le plugin pour créer, par Prisma pour lister et supprimer

**Options envisagées :**
- **A. Tout par l'API du plugin** (`createApiKey`, `listApiKeys`, `deleteApiKey`) : la liste et la suppression exigent une session (`sessionMiddleware`), donc des cookies réels dans les tests d'intégration
- **B. Création par le plugin, liste et suppression par Prisma** : le plugin garde ce qu'il est seul à faire (génération, préfixe, hachage, propriétés server-only), la liste reste une query du projet qui exclut `key` par son `select`

**Choix : B**

**Rationale :**
- La couche `src/server/queries/` porte les lectures admin, avec un `select` qui empêche le hash de sortir
- `deleteEntity` donne la suppression idempotente du projet. Le plugin n'a aucun hook de suppression configuré ni de stockage secondaire

### Décision : afficher la clé dans la modale de création

**Options envisagées :**
- **A. Seconde modale ouverte par la page** : la valeur remonterait dans l'état de la page pour passer d'une modale à l'autre
- **B. Second état de la même `FormDialog`** : même cadre que `dlgApiKeyCreated`, la valeur reste dans la modale et meurt avec elle

**Choix : B**

**Rationale :**
- La valeur en clair traverse le moins de composants possible
- `FormDialog` remonte déjà son contenu à chaque ouverture : rien à nettoyer

### Décision : titre d'en-tête des pages du menu de compte

**Options envisagées :**
- **A. Un item caché dans `ADMIN_NAV_GROUPS`** : détourne la navigation latérale pour un titre
- **B. `ADMIN_ACCOUNT_ITEMS`, lu par `AdminUserMenu` et `AdminPageTitle`** : une seule déclaration par page, réutilisable par la future page Conversations de la maquette

**Choix : B**

**Rationale :**
- Un rôle, une définition : le libellé du menu et le titre de l'en-tête ne peuvent pas diverger
