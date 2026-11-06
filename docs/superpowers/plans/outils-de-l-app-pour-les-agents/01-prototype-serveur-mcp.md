# Prototype du serveur MCP de l'app : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** servir depuis l'app un serveur MCP minimal, authentifié par une clé d'API Better Auth, et lever les trois conditions de l'ADR-025.

**Architecture :** une route `POST /api/mcp/[domain]` déroule la chaîne de refus (origine, rate limit par IP, domaine, bearer, clé, permission) puis passe la requête au handler du domaine, créé une fois au niveau module par `createMcpHandler`, dont la factory construit un `McpServer` par requête avec l'outil `crm_fetch`. Les vérifications de l'ADR-025 se mènent sur l'image de prod construite en local, avec le propriétaire.

**Tech Stack :** Next.js 16.4 (route handler), `@modelcontextprotocol/server` 2.4.0, `@modelcontextprotocol/client` 2.4.0 (tests), Better Auth 1.7.14 et `@better-auth/api-key` 1.7.14, Prisma 7, Pino, Vitest 5.

**Spec :** `docs/superpowers/specs/outils-de-l-app-pour-les-agents/01-prototype-serveur-mcp-design.md`

## Global Constraints

- Versions exactes : `@modelcontextprotocol/server@2.4.0`, `@modelcontextprotocol/client@2.4.0` (dev), `@better-auth/api-key@1.7.14` (même version que `better-auth`)
- Modèle Prisma `Apikey` (client `prisma.apikey`), jamais `ApiKey` : l'adaptateur Better Auth appelle `db["apikey"]`
- Plugin : `apiKey({ defaultPrefix: 'tgp_', rateLimit: { enabled: true, timeWindow: 3_600_000, maxRequests: 1000 } })`, avant `nextCookies()`, qui reste dernier ; jamais `enableSessionForAPIKeys` ni `disableKeyHashing`
- Rate limit par IP : `rateLimiter.check('mcp:' + ip, { max: 120, windowMs: 60_000 })`, avant toute lecture en base
- Ordre de la route : origine (403), rate limit IP (429 + `Retry-After`), domaine (404), bearer (401 + `WWW-Authenticate: Bearer`), clé (401, ou 429 sur `RATE_LIMITED`), permission (403), puis `handlers[domain].fetch(request, { authInfo })`
- Handler : un par domaine, créé une fois au niveau module, sans option `responseMode`, `legacy` laissé au défaut `'stateless'`, un `McpServer` par requête construit par la factory
- Tests MCP : client en `versionNegotiation: { mode: 'auto' }`, logs assertés par `toHaveBeenCalledWith`, jamais par un nombre d'appels
- Route sans `export const runtime` ni `dynamic` ; `GET` et `DELETE` en 405 avec `Allow: POST`
- Logs : `action: 'mcp'`, événements `mcp:request`, `mcp:rejected` (raisons `origin`, `unknown_domain`, `no_key`, `invalid_key`, `forbidden`), `rate_limit:exceeded`, `mcp:handler_error` ; jamais la clé ni le bearer, seulement `key.id`
- Données de test fictives (Acme, `example.com`)
- Gates intermédiaires : `just test-unit` ou `just test-integration` (sans argument de fichier) ; `just test` (seuil de couverture 80 %) seulement au gate final
- Aucun commit intermédiaire : `/implement-subproject` commite à la fin du sub-project (discipline commit du `CLAUDE.md` projet)

## Review Focus

- **Schéma `bearer` en minuscules** (`Authorization: bearer <clé>`) : le schéma HTTP est insensible à la casse, la requête doit passer. Test en Task 4
- **Clé créée sans `permissions`** (`permissions` nul) : 403, sans exception. Test en Task 4
- **Domaine en majuscules** (`/api/mcp/CRM`) : 404, la correspondance est exacte. Test en Task 4
- **Corps JSON invalide avec une clé valide** : réponse 4xx du SDK, jamais 500. Test en Task 4
- **`Origin` du site lui-même** (hôte de `NEXT_PUBLIC_SITE_URL`) : servi. Test en Task 4

---

### Task 1 : dépendances et versions

**Files :**
- Modify : `package.json`, `pnpm-lock.yaml`
- Modify : `docs/VERSIONS.md`

**Interfaces :**
- Produces : les paquets `@modelcontextprotocol/server`, `@modelcontextprotocol/client` et `@better-auth/api-key` importables

- [ ] **Step 1 : installer par la CLI**

Run : `pnpm add @modelcontextprotocol/server@2.4.0 @better-auth/api-key@1.7.14 && pnpm add -D @modelcontextprotocol/client@2.4.0`
Expected : les trois entrées dans `package.json`, `zod ^4.2.0` satisfait par la version installée (4.6.x)

- [ ] **Step 2 : documenter les versions**

Charger `Skill[versions-doc]` et ajouter les trois paquets à `docs/VERSIONS.md` (version, date de publication, compatibilité : `zod ^4.2.0` pour le SDK, `@better-auth/api-key` qui se monte avec `better-auth` (même version) pour le plugin, ligne v1 `@modelcontextprotocol/sdk` écartée avec la régression #1994).

- [ ] **Step 3 : vérifier**

Run : `just typecheck`
Expected : PASS

---

### Task 2 : modèle `Apikey` et plugin

**Files :**
- Modify : `prisma/schema.prisma` (après le modèle `Verification`)
- Create : `prisma/migrations/<horodatage>_api_key/migration.sql` (généré)
- Modify : `src/lib/prisma-test-setup.ts:6` (ajouter `"auth"."apikey"` au `TRUNCATE`)
- Modify : `src/lib/auth.ts:44`

**Interfaces :**
- Produces : `prisma.apikey` ; `auth.api.createApiKey`, `auth.api.verifyApiKey` (types du plugin)

- [ ] **Step 1 : transcrire le modèle** depuis le schéma du plugin 1.7.14 (`dist/types-*.d.mts`, objet `apikey.fields`), dates en `@db.Timestamptz` comme `User`. Le nom `Apikey` est obligatoire :

```prisma
model Apikey {
  id                  String    @id
  configId            String    @default("default")
  name                String?
  start               String?
  referenceId         String
  prefix              String?
  key                 String
  refillInterval      Int?
  refillAmount        Int?
  lastRefillAt        DateTime? @db.Timestamptz
  enabled             Boolean?  @default(true)
  rateLimitEnabled    Boolean?  @default(true)
  rateLimitTimeWindow Int?
  rateLimitMax        Int?
  requestCount        Int?      @default(0)
  remaining           Int?
  lastRequest         DateTime? @db.Timestamptz
  expiresAt           DateTime? @db.Timestamptz
  createdAt           DateTime  @db.Timestamptz
  updatedAt           DateTime  @db.Timestamptz
  permissions         String?
  metadata            String?

  @@index([configId])
  @@index([referenceId])
  @@index([key])
  @@map("apikey")
  @@schema("auth")
}
```

- [ ] **Step 2 : migrer la base de dev puis la base de test**

Run : `just db && just db-migrate api_key && just db-test`
Expected : migration créée et appliquée en dev, table `auth.apikey` présente, `prisma migrate deploy` de `just db-test` applique la même migration à la base de test

- [ ] **Step 3 : brancher le plugin** dans `src/lib/auth.ts` : `plugins: [apiKey({ defaultPrefix: 'tgp_', rateLimit: { enabled: true, timeWindow: 3_600_000, maxRequests: 1000 } }), nextCookies()]`

- [ ] **Step 4 : ajouter `"auth"."apikey"`** à la liste du `TRUNCATE` de `resetDatabase`

- [ ] **Step 5 : vérifier le schéma au démarrage**

Run : `just dev`, puis lire la sortie du serveur
Expected : aucune ligne `SchemaMismatchError` (Better Auth valide le schéma au démarrage). La preuve que le modèle sert le plugin est la création puis la vérification d'une clé dans les tests de la Task 4

---

### Task 3 : serveur par domaine et outil `crm_fetch`

**Files :**
- Create : `src/lib/mcp-domains.ts`
- Create : `src/server/mcp/logger.ts`
- Create : `src/server/mcp/server.ts`
- Create : `src/server/mcp/crm/tools.ts`
- Test : `src/server/mcp/crm/tools.integration.test.ts`

**Interfaces :**
- Consumes : `findCompanyByIdForAdmin(id: string)` (`src/server/queries/companies.ts:181`), `companyIdSchema` (`src/lib/ids.ts`), `logger` (`src/lib/logger.ts`), `hashIp` (`src/lib/server-utils.ts:66`), `env.IP_HASH_SALT`
- Produces :
  - `MCP_DOMAINS = ['crm'] as const`, `type McpDomain = (typeof MCP_DOMAINS)[number]`, `MCP_DOMAIN_LABELS: Record<McpDomain, string>` (`{ crm: 'CRM' }`) et `isMcpDomain(value: string): value is McpDomain` (`src/lib/mcp-domains.ts`, sans `server-only` : le formulaire du sub-project 02 l'importe)
  - `buildServer(domain: McpDomain): McpServer` (`server.ts`)
  - `registerCrmTools(server: McpServer): void` (`crm/tools.ts`)
  - `createMcpRequestContext(ip: string): McpRequestContext` (`logger.ts`) : `{ requestId: randomUUID(), ipHash: hashIp(ip, env.IP_HASH_SALT) }`, avec `mcpRequestContextSchema = z.strictObject({ requestId: z.string(), ipHash: z.string() })` et `type McpRequestContext = z.infer<typeof mcpRequestContextSchema>`
  - `createMcpLogger(context: McpRequestContext)` et `type McpLogger = ReturnType<typeof createMcpLogger>` (`logger.ts`) : `logger.child({ action: 'mcp', requestId, ip_hash: ipHash })`, logger des refus de la route, qui y ajoute `.child({ domain })` une fois le domaine vérifié (un refus d'origine ou d'IP précède ce contrôle)
  - `mcpLoggerFor(domain: McpDomain, authInfo: AuthInfo | undefined): McpLogger` (`logger.ts`) : sans `authInfo`, `logger.child({ action: 'mcp', domain })` (callback `onerror`) ; avec, `mcpRequestContextSchema.parse(authInfo.extra)` puis `createMcpLogger(context).child({ domain, keyId: authInfo.clientId })`. Un `extra` invalide lève : seule la route construit `authInfo`
  - L'`authInfo` passé au handler : `{ token, clientId, scopes, extra: McpRequestContext }`

- [ ] **Step 1 : écrire les tests qui échouent** (client branché sur `handler.fetch`, cf. `.claude/rules/modelcontextprotocol-server/tests.md`). Le handler se construit par test : `handler.close()` est définitif (`dist/index.mjs`, `closed = true`), un handler fermé lève à l'appel suivant

```ts
const authInfo = {
  token: 'tgp_test',
  clientId: 'key-1',
  scopes: ['read', 'write'],
  extra: { requestId: 'req-1', ipHash: 'abcd1234' },
}
let handler: McpHttpHandler
let client: Client

beforeEach(async () => {
  await resetDatabase()
  handler = createMcpHandler(() => buildServer('crm'))
  client = new Client({ name: 'test', version: '1.0.0' }, { versionNegotiation: { mode: 'auto' } })
  await client.connect(
    new StreamableHTTPClientTransport(new URL('http://test.invalid/mcp'), {
      fetch: (url, init) => handler.fetch(new Request(url, init), { authInfo }),
    }),
  )
})
afterEach(async () => {
  await client.close()
  await handler.close()
})

function textOf(result: Awaited<ReturnType<Client['callTool']>>): string {
  const [block] = result.content as { type: string; text?: string }[]
  return block?.text ?? ''
}

it('lists crm_fetch as a read-only tool', async () => {
  const { tools } = await client.listTools()

  expect(tools.find((t) => t.name === 'crm_fetch')?.annotations?.readOnlyHint).toBe(true)
})

it('returns the company record as JSON text', async () => {
  const company = await prisma.company.create({ data: { slug: 'acme', name: 'Acme' } })

  const result = await client.callTool({ name: 'crm_fetch', arguments: { entity: 'company', id: company.id } })

  expect(result.isError).toBeFalsy()
  expect(JSON.parse(textOf(result))).toMatchObject({ id: company.id, name: 'Acme' })
})

it('flags an unknown company id with a message naming it', async () => {
  const result = await client.callTool({ name: 'crm_fetch', arguments: { entity: 'company', id: 'missing-id' } })

  expect(result.isError).toBe(true)
  expect(textOf(result)).toContain('missing-id')
})
```

- [ ] **Step 2 : lancer, constater l'échec**

Run : `just test-integration` (la recette ne prend pas d'argument de fichier)
Expected : FAIL dans `tools.integration.test.ts` (`buildServer` introuvable)

- [ ] **Step 3 : implémenter**
  - `server.ts` : `new McpServer({ name: 'portfolio-' + domain, version: '1.0.0' }, { instructions })`, instructions en une ou deux phrases sur le contenu du domaine CRM. Outils par une table `Record<McpDomain, (server: McpServer) => void>` (`crm: registerCrmTools`)
  - `crm/tools.ts` : `registerTool('crm_fetch', { title, description, inputSchema: z.discriminatedUnion('entity', [z.object({ entity: z.literal('company'), id: companyIdSchema.describe(...) })]), annotations: { readOnlyHint: true, idempotentHint: true } }, handler)`. Le handler fait un `switch` exhaustif sur `entity` (`assertNever`), renvoie `{ content: [{ type: 'text', text: JSON.stringify(fiche) }] }`, ou `isError: true` avec un message qui nomme l'id et dit de vérifier l'identifiant
  - `logger.ts` : `createMcpRequestContext`, `createMcpLogger` et `mcpLoggerFor` selon l'interface ci-dessus

- [ ] **Step 4 : lancer, constater le succès**

Run : `just test-integration`
Expected : PASS

---

### Task 4 : chaîne d'authentification et route

**Files :**
- Create : `src/server/mcp/authenticate.ts`
- Create : `src/app/api/mcp/[domain]/route.ts`
- Test : `src/app/api/mcp/[domain]/route.integration.test.ts`

**Interfaces :**
- Consumes : `isMcpDomain`, `MCP_DOMAINS`, `McpDomain`, `buildServer`, `createMcpRequestContext`, `McpRequestContext`, `createMcpLogger`, `mcpLoggerFor`, `McpLogger` (Task 3) ; `rateLimiter` (`src/lib/rate-limiter.ts`) ; `extractClientIp` (`src/lib/server-utils.ts:59`) ; `auth` (`src/lib/auth.ts`) ; `originValidationResponse`, `createMcpHandler`, `McpHttpHandler`, `AuthInfo` (`@modelcontextprotocol/server`)
- Produces :
  - `authenticate(request: Request, rawDomain: string, ip: string, context: McpRequestContext, log: McpLogger): Promise<McpAuthOutcome>`
  - `type McpAuthOutcome = { ok: true; domain: McpDomain; keyId: string; authInfo: AuthInfo } | { ok: false; response: Response }`
  - `POST`, `GET`, `DELETE` exportés par la route

- [ ] **Step 1 : écrire les tests qui échouent**

Mise en place : `resetDatabase()` et `rateLimiter.reset()` en `beforeEach`, un `User` créé par Prisma, `@/lib/logger` mocké (`child` renvoie le logger espion `childLog`, déclaré par `vi.hoisted`). `postMcp` construit un `NextRequest` sur `http://localhost:3000/api/mcp/<domain>` et appelle l'export de la méthode avec `{ params: Promise.resolve({ domain }) }`.

```ts
const { childLog } = vi.hoisted(() => ({ childLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() } }))
// child rend le même espion : mcpLoggerFor enchaîne .child({ domain, keyId }) sur le logger de la requête
childLog.child.mockReturnValue(childLog)
vi.mock('@/lib/logger', () => ({ logger: { child: vi.fn(() => childLog) } }))

const initializeBody = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1.0.0' } },
})
const mcpHeaders = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
let userId: string

async function createKey(extra: Record<string, unknown> = {}) {
  const created = await auth.api.createApiKey({
    body: { userId, name: 'Test', permissions: { crm: ['read', 'write'] }, ...extra },
  })
  return { id: created.id, key: created.key }
}

function postMcp({ domain = 'crm', method = 'POST', headers = {}, body = initializeBody }: {
  domain?: string; method?: 'POST' | 'GET' | 'DELETE'; headers?: Record<string, string>; body?: string
} = {}) {
  const request = new NextRequest(`http://localhost:3000/api/mcp/${domain}`, {
    method,
    headers: { ...mcpHeaders, ...headers },
    ...(method === 'POST' ? { body } : {}),
  })
  return ROUTE[method](request, { params: Promise.resolve({ domain }) })
}
// ROUTE = { POST, GET, DELETE } importés de './route'

it('rejects a request without Authorization with 401 and WWW-Authenticate', async () => {
  const res = await postMcp()

  expect(res.status).toBe(401)
  expect(res.headers.get('WWW-Authenticate')).toBe('Bearer')
})

it('rejects a non-Bearer scheme with 401', async () => {
  const res = await postMcp({ headers: { Authorization: 'Basic dXNlcjpwYXNz' } })

  expect(res.status).toBe(401)
})

it('accepts a lowercase bearer scheme', async () => {
  const { key } = await createKey()

  const res = await postMcp({ headers: { Authorization: `bearer ${key}` } })

  expect(res.status).toBe(200)
})

it('rejects an unknown key with 401', async () => {
  const res = await postMcp({ headers: { Authorization: 'Bearer tgp_unknown' } })

  expect(res.status).toBe(401)
})

it('rejects an expired key with 401', async () => {
  const { id, key } = await createKey()
  await prisma.apikey.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } })

  const res = await postMcp({ headers: { Authorization: `Bearer ${key}` } })

  expect(res.status).toBe(401)
})

it('rejects a key without the crm domain with 403', async () => {
  const { key } = await createKey({ permissions: { compta: ['read'] } })

  const res = await postMcp({ headers: { Authorization: `Bearer ${key}` } })

  expect(res.status).toBe(403)
})

it('rejects a key created without permissions with 403', async () => {
  const { key } = await createKey({ permissions: undefined })

  const res = await postMcp({ headers: { Authorization: `Bearer ${key}` } })

  expect(res.status).toBe(403)
})

it.each(['compta', 'CRM'])('answers 404 for the domain %s', async (domain) => {
  const { key } = await createKey()

  const res = await postMcp({ domain, headers: { Authorization: `Bearer ${key}` } })

  expect(res.status).toBe(404)
})

it('rejects a foreign Origin with 403', async () => {
  const { key } = await createKey()

  const res = await postMcp({ headers: { Authorization: `Bearer ${key}`, Origin: 'https://evil.example.com' } })

  expect(res.status).toBe(403)
})

it.each([[{ Origin: new URL(env.NEXT_PUBLIC_SITE_URL).origin }], [{}]])('serves the request with headers %o', async (extra) => {
  const { key } = await createKey()

  const res = await postMcp({ headers: { Authorization: `Bearer ${key}`, ...extra } })

  expect(res.status).toBe(200)
})

it('answers 429 with Retry-After when the IP limiter refuses, without verifying the key', async () => {
  const { key } = await createKey()
  vi.spyOn(rateLimiter, 'check').mockReturnValue({ allowed: false, retryAfterSeconds: 42 })
  const verify = vi.spyOn(auth.api, 'verifyApiKey')

  const res = await postMcp({ headers: { Authorization: `Bearer ${key}` } })

  expect(res.status).toBe(429)
  expect(res.headers.get('Retry-After')).toBe('42')
  expect(verify).not.toHaveBeenCalled()
  expect(childLog.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'rate_limit:exceeded', limit: 'ip' }))
})

it('answers 429 when the key exceeds its own rate limit', async () => {
  const { key } = await createKey({ rateLimitMax: 1 })
  const headers = { Authorization: `Bearer ${key}` }
  await postMcp({ headers })

  const res = await postMcp({ headers })

  expect(res.status).toBe(429)
})

it('never answers 5xx on an invalid JSON body with a valid key', async () => {
  const { key } = await createKey()

  const res = await postMcp({ headers: { Authorization: `Bearer ${key}` }, body: '{not json' })

  expect(res.status).toBeGreaterThanOrEqual(400)
  expect(res.status).toBeLessThan(500)
})

it('logs mcp:request with the key id and era, never the key value', async () => {
  const { id, key } = await createKey()

  await postMcp({ headers: { Authorization: `Bearer ${key}` } })

  expect(childLog.child).toHaveBeenCalledWith({ domain: 'crm', keyId: id })
  expect(childLog.info).toHaveBeenCalledWith(
    expect.objectContaining({ event: 'mcp:request', era: expect.stringMatching(/^(legacy|modern)$/) }),
  )
  const logged = JSON.stringify([childLog.info, childLog.warn, childLog.error].map((fn) => fn.mock.calls))
  expect(logged).not.toContain(key)
})
```

Cas restants en liste nommée :
- `answers 405 with Allow: POST on GET and DELETE`
- `serves tools/list with a valid key` (client `@modelcontextprotocol/client` en `versionNegotiation: { mode: 'auto' }`, `fetch` branché sur `POST` avec l'en-tête `Authorization`, `crm_fetch` dans la liste)

- [ ] **Step 2 : lancer, constater l'échec**

Run : `just test-integration`
Expected : FAIL dans `route.integration.test.ts` (route introuvable)

- [ ] **Step 3 : implémenter `authenticate`** dans l'ordre des Global Constraints :
  - Origines autorisées : `[new URL(env.NEXT_PUBLIC_SITE_URL).hostname]`
  - Bearer lu par une expression insensible à la casse sur le schéma
  - `verifyApiKey({ body: { key } })` une seule fois, puis `scopes = key.permissions?.[domain]`. Absent ou vide : 403
  - Chaque refus logge `mcp:rejected` avec sa raison, ou `rate_limit:exceeded` (`limit: 'ip'` ou `limit: 'key'`), en `warn`. `authInfo = { token: key, clientId: key.id, scopes, extra: context }`

- [ ] **Step 4 : implémenter la route** : `POST(request: NextRequest, { params }: RouteContext<'/api/mcp/[domain]'>)`.
  - Au niveau module : `function createDomainHandler(domain: McpDomain): McpHttpHandler` appelle `createMcpHandler((ctx) => { mcpLoggerFor(domain, ctx.authInfo).info({ event: 'mcp:request', era: ctx.era }); return buildServer(domain) }, { onerror: (err) => mcpLoggerFor(domain, undefined).error({ err, event: 'mcp:handler_error' }) })`, sans `responseMode`. `const handlers = { crm: createDomainHandler('crm') } satisfies Record<McpDomain, McpHttpHandler>`
  - Dans `POST` : IP lue par `extractClientIp(request.headers.get('x-forwarded-for'))`, `createMcpRequestContext(ip)`, `createMcpLogger(context)` pour les refus, `authenticate`, puis `handlers[outcome.domain].fetch(request, { authInfo: outcome.authInfo })`
  - `GET` et `DELETE` : `new Response(null, { status: 405, headers: { Allow: 'POST' } })`

- [ ] **Step 5 : lancer, constater le succès**

Run : `just test-integration`
Expected : PASS

- [ ] **Step 6 : vérifications intermédiaires**

Run : `just lint && just typecheck && just test-unit`
Expected : PASS

---

### Task 5 : condition 2, image de prod locale

**Files :** aucun fichier du dépôt (clé et script de charge dans le scratchpad, supprimés ensuite)

- [ ] **Step 1 : créer la clé de vérification (point d'arrêt propriétaire)** contre la base locale, sans code ajouté. Un hook interdit à l'agent toute commande qui nomme le fichier d'environnement : l'agent prépare la commande et la donne au propriétaire, qui la lance dans son terminal avec l'environnement local chargé. Commande ponctuelle `tsx` en condition `react-server` qui importe `auth` de `src/lib/auth.ts` et appelle `auth.api.createApiKey({ body: { userId: <id du compte admin local>, name: 'Prototype', permissions: { crm: ['read', 'write'] } } })`, sans `headers`. Noter la valeur rendue, affichée une seule fois

- [ ] **Step 2 : construire l'image** selon `docs/PRODUCTION.md` § Validation technique finale (`docker build` avec les build-args `NEXT_PUBLIC_*`, tag `ghcr.io/thibaud57/thibaud-geisler-portfolio:latest`)

- [ ] **Step 3 : lancer sans retirer l'image publiée**

Run : `docker compose --profile validation up -d --pull never`
Expected : container `healthy`, migration `api_key` appliquée au démarrage

- [ ] **Step 4 : refus sans clé**

Run : `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/mcp/crm -H "Content-Type: application/json" -d "{}"`
Expected : `401`

- [ ] **Step 5 : stabilité** : un script jetable du scratchpad (client `@modelcontextprotocol/client`, lancé par `tsx`) enchaîne 50 `callTool('crm_fetch')` sur une entreprise de la base locale avec la clé, puis `docker compose restart nextjs`, puis 10 appels de plus
Expected : 60 réponses sans `isError`, aucune ligne `"level":"error"` dans `docker compose logs nextjs`

---

### Task 6 : condition 3 et révision MCP, Claude Code sur le poste (point d'arrêt propriétaire)

**Files :** aucun

- [ ] **Step 1 : connecter le serveur** : `claude mcp add --transport http crm-local http://localhost:3000/api/mcp/crm --header "Authorization: Bearer <clé>"`, la clé écrite en clair dans la commande, les variables d'environnement étant lues vides dans `headers` (piège ADR-025 l.159)

- [ ] **Step 2 : le propriétaire lance `/context`** dans une nouvelle session Claude Code et relève la part MCP
Expected : moins de 1 000 tokens, `crm_fetch` présent par son seul nom (chargement différé)

- [ ] **Step 3 : appel réel** : dans la même session, demander la fiche d'une entreprise de la base locale par son id
Expected : Claude Code appelle `crm_fetch` avec `{ entity: 'company', id }` (union racine lue correctement), fiche affichée

- [ ] **Step 4 : relever la révision** : `docker compose logs nextjs | grep mcp:request`
Expected : la valeur d'`era` pour Claude Code, à consigner en Task 8

- [ ] **Step 5 : retirer** `claude mcp remove crm-local`

---

### Task 7 : condition 1, CLI épinglé par `ai-kit` (point d'arrêt propriétaire)

**Files :** aucun (configuration MCP dans le scratchpad, supprimée ensuite)

- [ ] **Step 1 : le propriétaire installe l'environnement** : `uv sync` dans le dépôt `ai-kit` (épinglage `claude-agent-sdk==0.2.177`, `pyproject.toml:9`)

- [ ] **Step 2 : localiser le CLI embarqué** : `uv run python -c "import claude_agent_sdk, pathlib; print(pathlib.Path(claude_agent_sdk.__file__).parent)"` puis repérer le binaire `claude` livré dans le paquet, et relever sa version (`<cli> --version`)

- [ ] **Step 3 : lancer en mode strict** avec une configuration du scratchpad `{ "mcpServers": { "crm": { "type": "http", "url": "http://localhost:3000/api/mcp/crm", "headers": { "Authorization": "Bearer <clé>" } } } }` :

Run : `MCP_CONNECTION_NONBLOCKING=0 <cli> -p --output-format stream-json --verbose --strict-mcp-config --mcp-config <fichier> -- "Réponds ok"`
Expected : le message `system/init` liste `mcp_servers` avec le seul `crm` (connecté), sans serveur user, de plugin ni connecteur claude.ai. Une ligne `mcp:request` apparaît dans les logs avec son `era`

- [ ] **Step 4 : en cas d'échec** : arrêt du plan, l'ADR-025 reste `proposed` avec la mesure, la suite revient au propriétaire (spec § Edge cases)

- [ ] **Step 5 : nettoyer** : supprimer la configuration et la clé de vérification (`prisma.apikey.delete` ou table vidée en local), `docker compose down`

---

### Task 8 : ADR-025 et docs du code livré

**Files :**
- Modify : `docs/adrs/025-acces-agents-app.md`
- Modify : `docs/ARCHITECTURE.md`
- Modify : `docs/PRODUCTION.md`
- Modify : `docs/knowledges/modelcontextprotocol-server.md`
- Modify : `.claude/rules/modelcontextprotocol-server/http-handler.md`

- [ ] **Step 1 : ADR-025 en `accepted`** (`Skill[architecture-doc]`, seulement si les trois conditions passent) : chaque condition datée avec sa mesure (version du CLI d'`ai-kit` et `system/init`, 60 appels et redémarrage, tokens de `/context`), la révision relevée, le frontmatter et la description mis à jour

- [ ] **Step 2 : ARCHITECTURE.md** (`Skill[architecture-doc]`) :
  - `/api/mcp/[domain]` dans l'arborescence de `src/app/api/` et la liste des route handlers
  - `src/server/mcp/` dans la structure du code
  - schéma `auth` à cinq tables
  - § Protection API : clé par usage, origine, rate limit, pas de CORS pour des clients hors navigateur
  - ADR-025 dans les décisions actées

- [ ] **Step 3 : PRODUCTION.md** (`Skill[production-doc]`) :
  - § Rate Limiting : 120/min par IP en mémoire (IP fiable derrière Traefik, seau `unknown` pour le réseau Docker interne) ; par clé, le compteur du plugin cumule les requêtes acceptées (1 000) et ne repart à zéro qu'après une heure sans requête acceptée, chaque requête HTTP comptant
  - § CORS : la route MCP sert des clients hors navigateur, origine validée
  - anti-patterns de logging : clé d'API et bearer
  - événements `mcp:*` dans le logging, et la ligne `error` « Failed to validate API key » que Better Auth écrit hors Pino quand la base tombe (la route répond alors 401)
  - checklist de release : `POST /api/mcp/crm` sans clé → 401 au smoke test

- [ ] **Step 4 : knowledge MCP** (`Skill[knowledge-doc]`) dans `docs/knowledges/modelcontextprotocol-server.md` : révision parlée par Claude Code et par le CLI d'`ai-kit`, mesure de `/context`

- [ ] **Step 5 : rule** (`Skill[rules-doc]`) dans `.claude/rules/modelcontextprotocol-server/http-handler.md` : le gotcha `legacy` avec la révision relevée

- [ ] **Step 6 : quality gate final**

Run : `just lint && just typecheck && just test`
Expected : PASS, couverture ≥ 80 % lignes et branches
