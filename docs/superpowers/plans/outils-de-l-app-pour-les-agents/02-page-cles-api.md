# Page des clés d'API : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** créer, lister et supprimer depuis l'espace admin les clés d'API des agents, la valeur d'une clé n'étant affichée qu'une fois.

**Architecture :** page `/admin/cles-api` sur `AdminListPage`, ouverte depuis le menu de compte. La création passe par une Server Action qui appelle `auth.api.createApiKey`. La liste et la suppression passent par Prisma, la liste sans le champ `key`. La valeur créée s'affiche dans un second état de la `FormDialog` de création.

**Tech Stack :** Next.js 16.4 (Server Actions, Server Components), React 19, shadcn/ui (`radix-nova`), `@better-auth/api-key` 1.7.14, Prisma 7, Zod 4, Vitest 5.

**Spec :** `docs/superpowers/specs/outils-de-l-app-pour-les-agents/02-page-cles-api-design.md`

**Maquette :** `.design-sync/maquette/Espace admin.dc.html`, écrans `isApiKeys`, `dlgApiKeyForm`, `dlgApiKeyCreated`, confirmation `delete-api-key` (table `CONFIRMS`), entrée `apiKeys` de `userMenuItems`. Textes, largeurs de colonnes et libellés se lisent dans ces écrans, jamais recopiés ici.

## Global Constraints

- Prérequis livrés par le sub-project 01 : modèle `Apikey` (`prisma.apikey`), plugin `apiKey({ defaultPrefix: 'tgp_', ... })`, `MCP_DOMAINS`, `McpDomain`, `MCP_DOMAIN_LABELS` et `isMcpDomain` dans `src/lib/mcp-domains.ts`
- Route : `ADMIN_API_KEYS_PATH = "/admin/cles-api"`
- Création : `auth.api.createApiKey({ body: { userId, name, permissions, expiresIn } })` **sans `headers`**. `permissions` vaut `{ <domaine>: ['read', 'write'] }` pour chaque domaine choisi, `expiresIn` le nombre de jours × 86 400, omis pour `none`
- Saisie : `name` trimé de 1 à 32 caractères, `domains` d'au moins un domaine de `MCP_DOMAINS`, `expiry` dans `'30' | '90' | '365' | 'none'`, défaut `'90'`
- `getCurrentUser()` en première ligne de chaque action et de la page, hors de `createActionLogger`
- Logs `api_key:created` et `api_key:deleted` avec `keyId`, jamais la valeur de la clé
- Invalidation : `revalidatePath(ADMIN_API_KEYS_PATH)` après création et suppression
- Vocabulaire « supprimer » partout (titre, bouton, `aria-label` de la corbeille, toast, alerte de la vue de la clé), décision du propriétaire du 2026-11-06
- Largeurs de colonnes : celles de `isApiKeys`, dans `api-key-table-widths.ts`, `ACTIONS_COLUMN_WIDTH` pour les actions
- Gates intermédiaires : `just test-unit` ou `just test-integration` (sans argument de fichier) ; `just test` (seuil de couverture 80 %) seulement au gate final
- Aucun commit intermédiaire : `/implement-subproject` commite à la fin

## Review Focus

- **Nom fait d'espaces** : refusé comme un nom vide, saisie renvoyée. Test en Task 2
- **Domaine répété dans le formulaire** (`crm` deux fois) : une seule entrée dans `permissions`. Test en Task 2
- **Clé sans nom** (créée hors de la page) : la liste l'affiche par son début `start`. Test en Task 2
- **Clé expirée encore en base** : listée avec sa date passée, sans erreur. Test en Task 2
- **Double clic sur « Créer la clé »** : une seule clé, le bouton d'envoi de `FormDialogForm` étant désactivé pendant `pending`. Contrôle en Task 5 (recette `/verify`)

---

### Task 1 : accès par le menu de compte

**Files :**
- Modify : `src/lib/admin/routes.ts` (constante après `ADMIN_TAGS_PATH`)
- Create : `src/config/admin-account-items.ts`
- Modify : `src/components/layout/admin/AdminUserMenu.tsx:57-58`
- Modify : `src/components/layout/admin/AdminPageTitle.tsx:7-13`

**Interfaces :**
- Produces :
  - `ADMIN_API_KEYS_PATH = "/admin/cles-api"` (`src/lib/admin/routes.ts`)
  - `type AdminAccountItem = { href: string; label: string; icon: LucideIcon }` et `ADMIN_ACCOUNT_ITEMS: readonly AdminAccountItem[] = [{ href: ADMIN_API_KEYS_PATH, label: <libellé de l'entrée apiKeys de userMenuItems>, icon: KeyRound }]`

- [ ] **Step 1 : déclarer la route et la liste** dans les deux fichiers ci-dessus

- [ ] **Step 2 : rendre les entrées** dans `AdminUserMenu` : un `DropdownMenuItem asChild` sur un `Link` par entrée, icône à gauche comme `LogOut`, après le `DropdownMenuSeparator` et avant « Déconnexion »

- [ ] **Step 3 : titrer ces pages** dans `AdminPageTitle` : après la recherche dans `ADMIN_NAV_GROUPS`, chercher l'entrée de `ADMIN_ACCOUNT_ITEMS` dont `href` égale le chemin, avant le repli « Espace admin »

- [ ] **Step 4 : vérifier**

Run : `just lint && just typecheck`
Expected : PASS

---

### Task 2 : schéma, query et Server Actions

**Files :**
- Create : `src/lib/schemas/api-key.ts`
- Create : `src/server/queries/api-keys.ts`
- Create : `src/server/actions/api-keys.types.ts`
- Create : `src/server/actions/api-keys.ts`
- Test : `src/server/actions/api-keys.integration.test.ts`

**Interfaces :**
- Consumes : `ADMIN_API_KEYS_PATH` (Task 1), `MCP_DOMAINS`, `McpDomain`, `isMcpDomain` (sub-project 01), `saveEntity`, `deleteEntity`, `formStateHandlers` (`src/server/actions/_support/shared.ts`), `stringField`, `stringValues` (`src/lib/server-utils.ts`), `getCurrentUser`, `auth`, `FormActionState`, `INITIAL_FORM_STATE` (`src/lib/form-state.ts`)
- Produces :
  - `API_KEY_EXPIRIES = ['30', '90', '365', 'none'] as const`, `type ApiKeyExpiry`, `apiKeySchema`, `type ApiKeyInput = z.infer<typeof apiKeySchema>`, `expiryInSeconds(expiry: ApiKeyExpiry): number | undefined` (`src/lib/schemas/api-key.ts`, sans `server-only`)
  - `type AdminApiKey = { id: string; name: string | null; start: string | null; domains: McpDomain[]; createdAt: Date; lastRequest: Date | null; expiresAt: Date | null }` et `findApiKeysForAdmin(): Promise<AdminApiKey[]>`, triées par `createdAt` décroissant (`src/server/queries/api-keys.ts`)
  - `type ApiKeyFormMessage = 'unknown_error'`, `type ApiKeyFormState = FormActionState<ApiKeyInput, ApiKeyFormMessage, keyof ApiKeyInput, { created: { name: string; key: string } }>`, `initialApiKeyFormState` (`INITIAL_FORM_STATE`), `type ApiKeyDeleteState`, même forme que `TagDeleteState` avec le message `'unknown_error'` (`api-keys.types.ts`)
  - `createApiKey(_prev: ApiKeyFormState, formData: FormData): Promise<ApiKeyFormState>` et `deleteApiKey(rawId: string): Promise<ApiKeyDeleteState>`. Champs du `FormData` : `name`, `domains` (multiple), `expiry`

- [ ] **Step 1 : écrire les tests qui échouent** (motif de `src/server/actions/contacts.integration.test.ts` : `next/headers`, `next/cache`, `@/lib/logger` et `@/lib/get-current-user` mockés ; `resetDatabase` en `beforeEach` ; `prisma` de `@/lib/prisma-test-setup`). Mise en place : un `User` créé par Prisma, `getCurrentUser` mocké (`mockResolvedValue`) sur lui, `@/lib/logger` dont `child` renvoie un logger espion `childLog` (`vi.hoisted`)

```ts
function form({ name, domains, expiry }: { name: string; domains: string[]; expiry: string }): FormData {
  const data = new FormData()
  data.set('name', name)
  data.set('expiry', expiry)
  domains.forEach((domain) => data.append('domains', domain))
  return data
}

it('creates a CRM key valid for 90 days and returns its value once', async () => {
  const state = await createApiKey(initialApiKeyFormState, form({ name: 'Poste', domains: ['crm'], expiry: '90' }))

  if (!state.ok) throw new Error('expected a created key')
  const { key } = state.created
  expect(key.startsWith('tgp_')).toBe(true)
  const verified = await auth.api.verifyApiKey({ body: { key } })
  expect(verified.valid).toBe(true)
  expect(verified.key?.permissions).toEqual({ crm: ['read', 'write'] })
  const expectedExpiry = Date.now() + 90 * 86_400_000
  expect(Math.abs((verified.key?.expiresAt?.getTime() ?? 0) - expectedExpiry)).toBeLessThan(60_000)
})

it('creates a key without expiresAt for none', async () => {
  const state = await createApiKey(initialApiKeyFormState, form({ name: 'Poste', domains: ['crm'], expiry: 'none' }))

  if (!state.ok) throw new Error('expected a created key')
  const verified = await auth.api.verifyApiKey({ body: { key: state.created.key } })
  expect(verified.key?.expiresAt).toBeNull()
})

it.each([['empty', ''], ['blank', '   '], ['33 characters', 'a'.repeat(33)]])('rejects a %s name and keeps the input', async (_label, name) => {
  const state = await createApiKey(initialApiKeyFormState, form({ name, domains: ['crm'], expiry: '90' }))

  expect(state.ok).toBe(false)
  if (state.ok !== false) throw new Error('expected a failure')
  expect(state.errors.name).toBeDefined()
  expect(state.values?.name).toBe(name)
  expect(await prisma.apikey.count()).toBe(0)
})

it.each([['empty', []], ['unknown', ['compta']]])('rejects a %s domain list without creating a row', async (_label, domains) => {
  const state = await createApiKey(initialApiKeyFormState, form({ name: 'Poste', domains, expiry: '90' }))

  expect(state.ok).toBe(false)
  if (state.ok !== false) throw new Error('expected a failure')
  expect(state.errors.domains).toBeDefined()
  expect(await prisma.apikey.count()).toBe(0)
})

it('stores a repeated domain once', async () => {
  const state = await createApiKey(initialApiKeyFormState, form({ name: 'Poste', domains: ['crm', 'crm'], expiry: '90' }))

  if (!state.ok) throw new Error('expected a created key')
  const verified = await auth.api.verifyApiKey({ body: { key: state.created.key } })
  expect(verified.key?.permissions).toEqual({ crm: ['read', 'write'] })
})

it('deletes a key, which no longer verifies', async () => {
  const created = await auth.api.createApiKey({ body: { userId: user.id, name: 'Poste', permissions: { crm: ['read'] } } })

  const state = await deleteApiKey(created.id)

  expect(state.ok).toBe(true)
  const verified = await auth.api.verifyApiKey({ body: { key: created.key } })
  expect(verified.valid).toBe(false)
})

it('answers success when deleting an unknown id', async () => {
  const state = await deleteApiKey('unknown-id')

  expect(state.ok).toBe(true)
})

it('refuses createApiKey without a session and creates nothing', async () => {
  vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('unauthorized'))

  await expect(createApiKey(initialApiKeyFormState, form({ name: 'Poste', domains: ['crm'], expiry: '90' }))).rejects.toThrow('unauthorized')

  expect(await prisma.apikey.count()).toBe(0)
})

it('refuses deleteApiKey without a session and deletes nothing', async () => {
  const created = await auth.api.createApiKey({ body: { userId: user.id, name: 'Poste', permissions: { crm: ['read'] } } })
  vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('unauthorized'))

  await expect(deleteApiKey(created.id)).rejects.toThrow('unauthorized')

  expect(await prisma.apikey.count()).toBe(1)
})

it('logs api_key:created with keyId and never the key value', async () => {
  const state = await createApiKey(initialApiKeyFormState, form({ name: 'Poste', domains: ['crm'], expiry: '90' }))

  if (!state.ok) throw new Error('expected a created key')
  expect(childLog.info).toHaveBeenCalledWith(expect.objectContaining({ event: 'api_key:created', keyId: expect.any(String) }))
  const logged = JSON.stringify([childLog.info, childLog.warn, childLog.error].map((fn) => fn.mock.calls))
  expect(logged).not.toContain(state.created.key)
})

it('lists keys without the key field, domains parsed, nameless and expired keys included', async () => {
  // toutes les clés d'abord : la purge en tâche de fond de createApiKey retirerait une clé déjà expirée
  const named = await auth.api.createApiKey({ body: { userId: user.id, name: 'Poste', permissions: { crm: ['read', 'write'] } } })
  const nameless = await auth.api.createApiKey({ body: { userId: user.id, permissions: { crm: ['read'] } } })
  const expired = await auth.api.createApiKey({ body: { userId: user.id, name: 'Ancienne', permissions: { crm: ['read'] } } })
  await prisma.apikey.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } })

  const keys = await findApiKeysForAdmin()

  expect(keys).toHaveLength(3)
  expect(keys.every((row) => !Object.keys(row).includes('key'))).toBe(true)
  expect(keys.find((row) => row.id === named.id)?.domains).toEqual(['crm'])
  expect(keys.find((row) => row.id === nameless.id)?.name).toBeNull()
  expect(keys.find((row) => row.id === expired.id)?.expiresAt).toBeInstanceOf(Date)
})
```

- [ ] **Step 2 : lancer, constater l'échec**

Run : `just test-integration`
Expected : FAIL dans `api-keys.integration.test.ts` (modules introuvables)

- [ ] **Step 3 : écrire le schéma.** Messages d'erreur : « Donnez un nom à la clé » (vide), « 32 caractères au plus » (trop long), « Choisissez au moins un domaine ». Doublons de `domains` retirés par un `transform`

- [ ] **Step 4 : écrire la query** : `prisma.apikey.findMany` avec un `select` sans `key`, `permissions` (texte JSON) parsé par un schéma Zod `z.record(z.string(), z.array(z.string()))`, domaines gardés par `isMcpDomain`. Module en `import 'server-only'`, sans `'use cache'`

- [ ] **Step 5 : écrire les actions.**
  - `createApiKey` : `saveEntity` avec `actionName: 'createApiKey'`, `events: { success: 'api_key:created', failure: 'api_key:create_failed' }` et `successLogFields` qui ne renvoie que `{ keyId }`. `persist` appelle `auth.api.createApiKey` selon les Global Constraints. `onSuccess` rend l'état `created`, `invalidateCaches` revalide le chemin
  - `deleteApiKey` : `deleteEntity` sur `prisma.apikey.delete({ where: { id } })`, `exists` par `prisma.apikey.count`, `events` `api_key:deleted` / `api_key:delete_failed`

- [ ] **Step 6 : lancer, constater le succès**

Run : `just test-integration`
Expected : PASS

---

### Task 3 : page, table et suppression

**Files :**
- Create : `src/app/admin/(protected)/cles-api/page.tsx`
- Create : `src/app/admin/(protected)/cles-api/loading.tsx`
- Create : `src/components/features/admin/api-keys/ApiKeysTable.tsx`
- Create : `src/components/features/admin/api-keys/DeleteApiKeyDialog.tsx`
- Create : `src/components/features/admin/api-keys/api-key-table-widths.ts`
- Create : `src/components/features/admin/api-keys/api-key-labels.ts`

**Interfaces :**
- Consumes : `findApiKeysForAdmin`, `AdminApiKey`, `deleteApiKey`, `ApiKeyDeleteState` (Task 2) ; `MCP_DOMAIN_LABELS` ; `AdminListPage`, `DataTable`, `actionsColumn`, `TitleCell`, `Badge`, `EmptyState`, `ConfirmDeleteDialog` ; `formatShortInstantDate`, `formatShortDateTime` (`src/lib/date-time.ts`)
- Produces :
  - `API_KEY_FIELD_LABELS` (clés `name`, `domains`, `expiry`, `createdAt`, `lastRequest`, `expiresAt`, valeurs tirées de `dlgApiKeyForm` et des colonnes de `isApiKeys`) et `API_KEY_EXPIRY_LABELS: Record<ApiKeyExpiry, string>` (options du select de `dlgApiKeyForm`) (`api-key-labels.ts`)
  - `API_KEY_COLUMN_WIDTHS` et `API_KEY_SKELETON_WIDTHS` (`api-key-table-widths.ts`, largeurs de `isApiKeys`)

- [ ] **Step 1 : page et chargement.** La page appelle `getCurrentUser()` puis rend `AdminListPage` :
  - titre et sous-titre de `isApiKeys`
  - `skeletonWidths` : `API_KEY_SKELETON_WIDTHS` (le déclencheur de création arrive en Task 4)
  - enfant async qui lit `findApiKeysForAdmin()` et rend `ApiKeysTable`
  
  `loading.tsx` réexporte celui de `(protected)` (motif `tags/loading.tsx`)

- [ ] **Step 2 : table** selon le spec § Architecture approach (Table) : sous-titre de `TitleCell` = `start` suivi de « … » en `mono`, nom manquant remplacé par `start`. États des valeurs nulles (jamais utilisée, sans expiration) et état vide pris sur `isApiKeys`. Recherche sur nom et `start`, `noun` « clé », pas de clic de ligne

- [ ] **Step 3 : suppression** : `DeleteApiKeyDialog` sur le motif de `DeleteTagDialog`. `name` reçoit le nom de la clé, `description` et `successMessage` pris sur la confirmation `delete-api-key`, `onDelete` appelle `deleteApiKey(id)`

- [ ] **Step 4 : vérifier**

Run : `just lint && just typecheck && just test-unit`
Expected : PASS

---

### Task 4 : création et clé affichée une fois

**Files :**
- Create : `src/components/features/admin/api-keys/ApiKeyFormDialog.tsx`
- Create : `src/components/features/admin/api-keys/ApiKeyCreatedView.tsx`
- Modify : `src/app/admin/(protected)/cles-api/page.tsx` (`actions={<ApiKeyFormDialog />}` sur `AdminListPage`)

**Interfaces :**
- Consumes : `createApiKey`, `ApiKeyFormState`, `initialApiKeyFormState` (Task 2) ; `API_KEY_FIELD_LABELS`, `API_KEY_EXPIRY_LABELS` (Task 3) ; `FormDialog`, `FormDialogForm`, `FieldInput`, `SelectField`, `MultiSelectCombobox`, `useSaveFeedback`, `useFormActionSubmit` ; `InputGroup`, `InputGroupInput`, `InputGroupAddon`, `InputGroupButton` (`src/components/ui/input-group.tsx`) ; `Alert`
- Produces : `ApiKeyFormDialog()` (sans props) ; `ApiKeyCreatedView({ name, value, onDone }: { name: string; value: string; onDone: () => void })`

- [ ] **Step 1 : formulaire** selon `dlgApiKeyForm`. `FormDialog` avec déclencheur `Button` à icône `Plus`. Dans `children(onDone)`, `useActionState(createApiKey, initialApiKeyFormState)` et `FormDialogForm` (titre, description, bouton d'envoi à icône `KeyRound` de la maquette). Champs :
  - Nom : `FieldInput`
  - Expiration : `SelectField` avec `API_KEY_EXPIRY_LABELS`, défaut `'90'`
  - Domaines : `MultiSelectCombobox` pleine ligne, `name="domains"`, options de `MCP_DOMAINS`

- [ ] **Step 2 : bascule au succès.** `useSaveFeedback(state, { saved, onSaved })` (toast de création de la maquette), où `onSaved` ne ferme pas la modale. Quand `state.ok`, le composant rend `ApiKeyCreatedView` avec `state.created` à la place du formulaire

- [ ] **Step 3 : vue de la clé** selon `dlgApiKeyCreated` (titre avec le nom de la clé, description, libellé, aide, `Alert` à icône `TriangleAlert` d'avertissement, pied) :
  - `InputGroup` : `InputGroupInput` `readOnly` en `font-mono`, `InputGroupButton` `variant="ghost"` `size="xs"` à icône `Copy`
  - bouton unique `default` qui appelle `onDone`
  
  La copie passe par `navigator.clipboard.writeText`, avec le toast de confirmation de la maquette, ou en cas de refus un toast d'erreur qui invite à sélectionner la clé dans le champ. Le texte de l'alerte emploie « supprimez-la », comme le vocabulaire retenu

- [ ] **Step 4 : vérifier**

Run : `just lint && just typecheck`
Expected : PASS

---

### Task 5 : exploitation, documentation et recette

**Files :**
- Modify : `docs/PRODUCTION.md` (§ Rotation, checklist de release)
- Modify : `docs/ARCHITECTURE.md` (§ Frontend > Structure du Code, ligne `config/` ; § Backend > API)

- [ ] **Step 1 : PRODUCTION.md** (`Skill[production-doc]`) :
  - Rotation d'une clé : en créer une nouvelle depuis `/admin/cles-api`, mettre à jour le client (configuration MCP du poste ou d'`agent-os`), puis supprimer l'ancienne. Aucune variable d'environnement n'est en jeu
  - Checklist de release : à la première mise en production de la route, essai depuis Claude Desktop et claude.ai, cas de test de la Feature 3. On passe par un connecteur personnalisé avec en-tête fixe, en bêta selon l'ADR-025. Le résultat se consigne alors dans `docs/knowledges/modelcontextprotocol-server.md` par `knowledge-doc`, hors de ce sub-project (aucune mise en production avant la fin de l'epic)

- [ ] **Step 2 : ARCHITECTURE.md** (`Skill[architecture-doc]`) :
  - § Frontend > Structure du Code : la ligne `config/` cite les entrées du menu de compte (`admin-account-items.ts`)
  - § Backend > API : Server Actions `createApiKey` et `deleteApiKey`, query `findApiKeysForAdmin`, page `/admin/cles-api`

- [ ] **Step 3 : recette en local** (`just dev`, session admin du navigateur de recette obtenue par `just dev-login <fichier>`) : les scénarios 1, 2, 4 à 7 du spec dans le navigateur, plus le double clic sur le bouton de création (Review Focus). Le scénario 3 se joue avec la clé créée : client `@modelcontextprotocol/client` du sub-project 01, ou `curl -s -X POST http://localhost:3000/api/mcp/crm -H "Authorization: Bearer <clé>" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1.0.0"}}}'` (200), puis le même appel après suppression de la clé (401). Ces vérifications nourrissent la recette `/verify` de `/implement-subproject`

- [ ] **Step 4 : quality gate final**

Run : `just lint && just typecheck && just test`
Expected : PASS, couverture ≥ 80 % lignes et branches
