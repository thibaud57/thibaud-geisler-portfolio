---
feature: "Feature 3 : Outils de l'app pour les agents"
subproject: "prototype-serveur-mcp"
goal: "Servir depuis l'app un serveur MCP minimal, authentifié par une clé d'API Better Auth, et lever les trois conditions de l'ADR-025."
status: "implemented"
complexity: "L"
tdd_scope: "partial"
execution: "inline"
model: "opus"
effort: "high"
depends_on: []
date: "2026-11-06"
---

# Prototype du serveur MCP de l'app

## Scope

Couvre l'installation de `@modelcontextprotocol/server`, `@modelcontextprotocol/client` (dev) et `@better-auth/api-key`, le modèle `Apikey` et le plugin, la route `POST /api/mcp/[domain]` avec sa chaîne de refus, les logs côté MCP, un outil de lecture `crm_fetch` sur l'entreprise, puis la vérification des trois conditions de l'ADR-025 et son passage en `accepted`. Exclut la création de clé depuis l'admin (sub-project 02), les autres outils et entités (03 à 05) et la mise en production : la vérification se fait sur l'image de prod construite en local.

### État livré

À la fin de ce sub-project, on peut : depuis Claude Code sur le poste, appeler `crm_fetch` sur une entreprise servie par l'image de prod construite en local avec une clé valide, voir une requête sans clé refusée en 401, et lire l'ADR-025 au statut `accepted` avec le résultat daté de ses trois conditions.

## Dependencies

Aucune : ce sub-project est autoporté.

## Files touched

- **À modifier** : `package.json`, `pnpm-lock.yaml` (trois paquets, `@better-auth/api-key` à la version de `better-auth`, 1.7.14)
- **À modifier** : `prisma/schema.prisma` (modèle `Apikey`, `@@map("apikey")`, `@@schema("auth")`)
- **À créer** : `prisma/migrations/<horodatage>_api_key/migration.sql`
- **À modifier** : `src/lib/prisma-test-setup.ts` (`"auth"."apikey"` dans le `TRUNCATE` de `resetDatabase`)
- **À modifier** : `src/lib/auth.ts` (plugin `apiKey()` avant `nextCookies()`)
- **À créer** : `src/app/api/mcp/[domain]/route.ts`
- **À créer** : `src/app/api/mcp/[domain]/route.integration.test.ts`
- **À créer** : `src/server/mcp/authenticate.ts` (rate limit par IP, bearer, clé, permission du domaine)
- **À créer** : `src/server/mcp/logger.ts` (contexte de requête passé en `authInfo.extra`, logger des refus de la route, `mcpLoggerFor` pour la factory, `onerror` et les outils)
- **À créer** : `src/lib/mcp-domains.ts` (domaines servis et leurs libellés, partagés avec le formulaire du sub-project 02)
- **À créer** : `src/server/mcp/server.ts` (construction du `McpServer` par requête de la factory du handler)
- **À créer** : `src/server/mcp/crm/tools.ts` (`crm_fetch`)
- **À créer** : `src/server/mcp/crm/tools.integration.test.ts`
- **À modifier** : `docs/VERSIONS.md` (trois paquets, par `versions-doc`)
- **À modifier** : `docs/adrs/025-acces-agents-app.md` (statut `accepted`, résultat des conditions)
- **À modifier** : `docs/ARCHITECTURE.md` (arborescence `src/app/api/`, liste des route handlers, schéma `auth` à cinq tables, § Protection API, statut de l'ADR-025)
- **À modifier** : `docs/PRODUCTION.md` (§ Rate Limiting, § CORS, anti-patterns de logging, checklist de release)
- **À modifier** : `docs/knowledges/modelcontextprotocol-server.md` (révision MCP relevée, mesure de `/context`)
- **À modifier** : `.claude/rules/modelcontextprotocol-server/http-handler.md` (gotcha `legacy` avec la révision relevée)

## Architecture approach

- **Route** : `POST` seul, typé par `RouteContext<'/api/mcp/[domain]'>`, `await params`, sans `export const runtime` ni `dynamic` ; `GET` et `DELETE` répondent 405 avec `Allow: POST` (`.claude/rules/nextjs/api-routes.md`, `.claude/rules/modelcontextprotocol-server/http-handler.md`). Le matcher de `src/proxy.ts:49` exclut `/api` : la route porte seule son authentification, sans jamais lire la session admin (`.claude/rules/nextjs/auth.md`)
- **Chaîne de refus, dans cet ordre**, chaque étape répondant elle-même avant `handler.fetch` :
  1. Origine : `originValidationResponse(request, [hostname de env.NEXT_PUBLIC_SITE_URL])`. Un `Origin` absent passe (`validateOriginHeader`, `@modelcontextprotocol/server` 2.4.0, lu le 2026-11-06), un `Origin` présent et étranger reçoit 403
  2. Rate limit par IP : `rateLimiter.check('mcp:' + ip, { max: 120, windowMs: 60_000 })` (`src/lib/rate-limiter.ts`), IP lue par `extractClientIp` (`src/lib/server-utils.ts:59`, première entrée de `X-Forwarded-For`, fiable derrière Traefik, cf. Edge cases) ; dépassement en 429 avec `Retry-After`. Il précède toute lecture en base, et protège aussi le chemin interne d'`agent-os`, qui ne passe pas par Traefik
  3. Domaine : connu de `src/lib/mcp-domains.ts` (`crm` seul), sinon 404
  4. Bearer : extrait de `Authorization: Bearer`, absent ou autre schéma en 401 avec `WWW-Authenticate: Bearer`. L'en-tête `x-api-key` du plugin n'est pas lu
  5. Clé : `auth.api.verifyApiKey({ body: { key } })`, une fois par requête et sans `permissions`. `valid: false` répond 401, `RATE_LIMITED` répond 429
  6. Permission : le domaine de l'adresse doit figurer dans `permissions` de la clé, sinon 403
  7. `handlers[domain].fetch(request, { authInfo: { token, clientId: key.id, scopes, extra: { requestId, ipHash } } })`, un handler par domaine créé une fois au niveau module (cf. Handler), `legacy` gardé à `'stateless'`
- **Handler** : `createMcpHandler(factory, { onerror })` par domaine de `MCP_DOMAINS`, créé une fois au niveau module (table `Record<McpDomain, McpHttpHandler>`) et non par requête. La factory `(ctx) => buildServer(domain)` construit un `McpServer` par requête, sans état partagé, et logge `mcp:request`. Aucune option `responseMode` : le défaut évite le `console.warn` émis à chaque construction en `'json'` (`@modelcontextprotocol/server` 2.4.0, `dist/index.mjs:1132`), et l'option est sans effet sur le chemin `legacy`. Les outils lisent `ctx.http?.authInfo?.clientId` pour l'identifiant de clé
- **Plugin** : `apiKey({ defaultPrefix: 'tgp_', rateLimit: { enabled: true, timeWindow: 3_600_000, maxRequests: 1000 } })`, placé avant `nextCookies()`. `enableSessionForAPIKeys` et `disableKeyHashing` restent à leur défaut (`false`). Le réglage se copie dans chaque clé à sa création (`rateLimitMax`, `rateLimitTimeWindow`), une clé créée avant un changement garde l'ancien. Comportement réel du rate limit par clé (`@better-auth/api-key` 1.7.14, `dist/index.mjs`, `evaluateRateLimit` l.1583-1620, `lastRequest` mis à jour à chaque requête acceptée l.1827) : le compteur cumule les requêtes acceptées et ne repart à zéro qu'après une fenêtre d'une heure sans requête acceptée ; au-delà de 1 000, refus `RATE_LIMITED` jusqu'à une heure après la dernière requête acceptée. Chaque requête HTTP compte (initialisation, notifications, appels d'outils). Le but tenu est d'arrêter un agent qui boucle, pas de fixer un débit horaire. Les permissions prendront la forme `{ crm: ['read', 'write'] }` à la création (sub-project 02). La route ne vérifie que la présence du domaine (`.claude/rules/better-auth/api-key.md`)
- **Modèle** : `model Apikey` (client `prisma.apikey`), les champs du schéma du plugin 1.7.14 transcrits à la main avec `@@map("apikey")` et `@@schema("auth")`, `referenceId` à la place de `userId`, migration par `just db-migrate api_key` puis `just db-test` pour la base de test. Le nom `Apikey` est imposé : l'adaptateur Prisma de Better Auth appelle `db[model]` avec le nom `apikey` (`@better-auth/prisma-adapter` 1.7.14, `dist/index.mjs:215`), que `prisma.apiKey` ne satisfait pas. Jamais `@better-auth/cli generate` (`.claude/rules/prisma/schema-migrations.md`, `.claude/rules/prisma/data-modeling.md`). La preuve de conformité est le test d'intégration qui crée puis vérifie une clé, et l'absence de `SchemaMismatchError` dans les logs au démarrage de `just dev` (Better Auth valide le schéma au démarrage par défaut, `advanced.database.validateSchema`). La migration s'applique au démarrage du container par `prisma migrate deploy` (`docs/PRODUCTION.md` § Bootstrap technique), l'image locale partageant la base de dev
- **Serveur** : `buildServer(domain)` crée un `McpServer`, appelé par la factory du handler à chaque requête, `{ name: 'portfolio-<domaine>', version: '1.0.0' }`, avec des `instructions` courtes qui disent quand se servir du domaine (option de `ServerOptions`, confirmée dans les types 2.4.0). Les outils viennent d'une table `Record<McpDomain, (server) => void>`, sans singleton de module (`.claude/rules/modelcontextprotocol-server/tools.md`)
- **`crm_fetch`** : `inputSchema` en `z.discriminatedUnion('entity', [...])` à un seul membre `company`, avec un `id` décrit par `.describe()`. Ce choix éprouve dès le prototype la lecture d'une union racine par les clients (gotcha de la rule `tools.md`). Le handler fait un `switch` exhaustif sur `entity` et lit `findCompanyByIdForAdmin` (`src/server/queries/companies.ts:181`), un `findUnique` Prisma avec `adminCompanyInclude`, sans session ni `headers()`. Il renvoie la fiche en `content` texte JSON, ou `isError: true` si l'id ne désigne rien, avec un message qui nomme la correction. Annotations `readOnlyHint` et `idempotentHint`, sans `outputSchema` : la forme des réponses se fixe en 03
- **Logs** : `createActionLogger` est propre aux Server Actions (span `withServerActionInstrumentation`). La route tire un `requestId` (`randomUUID()`) et un `ipHash` (`hashIp` de `src/lib/server-utils.ts:66`) et prend le logger enfant `logger.child({ action: 'mcp', requestId, ip_hash })` (`logger` de `src/lib/logger.ts`) pour ses refus, `domain` s'y ajoutant une fois vérifié. Elle passe `requestId` et `ipHash` à la factory et aux outils par `authInfo.extra` : `createMcpHandler` transmet `authInfo` tel quel aux deux ères (« passed through to handlers and the factory as-is », `dist/index.mjs`), alors que `ctx.requestInfo` peut être une copie de la requête en legacy. `mcpLoggerFor(domain, authInfo)` parse `extra` par un schéma Zod et rend le logger enfant de la requête, `keyId` compris : la factory, les outils et leurs écritures (sub-projects 03 à 05) logguent ainsi avec le même `requestId` que la route. Sans `authInfo` (callback `onerror`), il rend le logger du seul domaine. Événements :
  - `mcp:request` (`info`, par la factory, avec `era`, champ `'legacy' | 'modern'` du contexte que `createMcpHandler` passe à la factory, types 2.4.0)
  - `mcp:rejected` (`warn`, avec la raison : `origin`, `unknown_domain`, `no_key`, `invalid_key`, `forbidden`)
  - `rate_limit:exceeded` (`warn`, l'événement existant, avec `action: 'mcp'`)
  - `mcp:handler_error` (`error`, par `onerror`)
  
  Ni la clé ni le bearer ne sont jamais loggés, seulement `key.id` (`.claude/rules/pino/usage.md`, `.claude/rules/pino/logger.md`)
- **Sentry** : le route handler est tracé nativement par `@sentry/nextjs`. Un `log.error` remonte par `pinoIntegration`, sans `captureException` en plus, qui créerait un doublon (`.claude/rules/sentry/instrumentation.md`)
- **Révision MCP** : le champ `era` de `mcp:request` relève la révision que parlent Claude Code et le CLI d'`ai-kit` (`legacy` = révisions 2025, `modern` = 2026-07-28). Elle se consigne dans la knowledge, et `legacy` reste `'stateless'` : aucun besoin ne justifie de couper les clients 2025
- **Clé de vérification** : créée par une commande ponctuelle `tsx` (condition `react-server`, environnement local chargé), donnée au propriétaire pour qu'il la lance, qui appelle `auth.api.createApiKey` sans `headers` contre la base locale, partagée par `just dev` et l'image Docker. Aucun code n'est ajouté au dépôt pour elle
- **Vérifications de l'ADR-025** (pièges de l'ADR, l.153-159), menées dans la session avec le propriétaire : `/context` dans son Claude Code et l'environnement du dépôt `ai-kit` (`uv sync`) sont des points d'arrêt du plan. L'ADR demande une réponse « stable » et un contexte « faible » : les seuils de 50 appels et de 1 000 tokens sont fixés par ce spec :
  - Condition 2 : l'image de prod est construite en local (procédure `docs/PRODUCTION.md` § Validation technique finale) et lancée par `docker compose --profile validation up -d --pull never`, `pull_policy: always` de `compose.yaml` tirant sinon l'image publiée. Elle doit tenir 50 appels successifs et un redémarrage du container
  - Condition 3 : `/context` dans Claude Code, serveur connecté par `claude mcp add --transport http` avec l'en-tête `Authorization`
  - Condition 1 : lancer le CLI embarqué par `claude-agent-sdk==0.2.177` (`pyproject.toml:9` du dépôt `ai-kit`) avec `--strict-mcp-config --mcp-config`, `-p --output-format stream-json --verbose`, `MCP_CONNECTION_NONBLOCKING=0` et le prompt séparé par `--`. Cette mesure porte sur le CLI sous `--strict-mcp-config`, pas sur une session d'`agent-os`, qui est non stricte (ADR-025 § Décision, condition 1)
- **Fin du prototype** : l'ADR-025 passe en `accepted` par `architecture-doc`, chaque condition datée avec sa mesure. Les docs qui décrivent ce que le code livre (ARCHITECTURE, PRODUCTION, VERSIONS) et ce que seul le prototype révèle (révision MCP parlée, mesure de `/context`, knowledge MCP, rule `http-handler.md`) se mettent à jour par leur skill dans le même plan

## Acceptance criteria

### Scénario 1 : lecture d'une entreprise avec une clé valide
**GIVEN** une clé dont les `permissions` contiennent `crm` et une entreprise en base
**WHEN** un client MCP appelle `crm_fetch` avec `{ entity: 'company', id }` sur `/api/mcp/crm`
**THEN** la réponse HTTP est 200 et le résultat, sans `isError`, contient l'id et le nom de l'entreprise
**AND** une ligne `mcp:request` porte `keyId` et `era`, sans la valeur de la clé

### Scénario 2 : requête sans clé
**GIVEN** une requête `POST /api/mcp/crm` sans en-tête `Authorization`
**WHEN** la route la reçoit
**THEN** elle répond 401 avec `WWW-Authenticate: Bearer`, sans lire la base

### Scénario 3 : clé invalide, expirée ou d'un autre domaine
**GIVEN** une clé inconnue, une clé dont `expiresAt` est passé, puis une clé valide sans `crm` dans ses `permissions`
**WHEN** chacune appelle `/api/mcp/crm`
**THEN** les deux premières reçoivent 401 et la troisième 403

### Scénario 4 : domaine inconnu
**GIVEN** une clé valide
**WHEN** elle appelle `/api/mcp/compta`
**THEN** la route répond 404

### Scénario 5 : origine
**GIVEN** une requête avec une clé valide
**WHEN** elle porte un `Origin` étranger, puis aucun `Origin`
**THEN** la première reçoit 403 et la seconde est servie

### Scénario 6 : rate limit par IP
**GIVEN** 120 requêtes d'une même IP dans la minute
**WHEN** la 121e arrive
**THEN** elle reçoit 429 avec `Retry-After`, sans vérification de la clé
**AND** une ligne `rate_limit:exceeded` porte `action: 'mcp'`

### Scénario 7 : méthode non servie
**GIVEN** la route MCP
**WHEN** elle reçoit un `GET` ou un `DELETE`
**THEN** elle répond 405 avec `Allow: POST`

### Scénario 8 : entreprise introuvable
**GIVEN** une clé valide
**WHEN** `crm_fetch` reçoit un id qui ne désigne aucune entreprise
**THEN** le résultat porte `isError: true` et un message qui nomme l'id et la correction attendue

### Scénario 9 : conditions de l'ADR-025 mesurées
**GIVEN** l'image de prod construite en local, une clé de vérification, Claude Code sur le poste et le CLI épinglé par `ai-kit`, lancé sous `--strict-mcp-config`
**WHEN** les trois vérifications sont menées
**THEN** le message `system/init` du CLI sous `--strict-mcp-config` ne liste que le serveur `crm`, sans serveur user, de plugin ni connecteur claude.ai (propriété du CLI sous ce drapeau, pas le comportement d'une session d'`agent-os`)
**AND** l'image tient 50 appels successifs et un redémarrage, répondant 200 avec la clé et 401 sans
**AND** la part MCP de `/context` reste sous 1 000 tokens, l'outil n'y figurant que par son nom
**AND** l'ADR-025 est `accepted`, chaque condition datée avec sa mesure

## Tests à écrire

### Integration
Clés créées par `auth.api.createApiKey` et entreprise par `prisma.company.create` sur la base de test, nettoyées par `resetDatabase` (`src/lib/prisma-test-setup.ts`). `src/lib/auth.ts` s'importe sous Vitest : `server-only` y est aliasé (`vitest.config.ts:9`) et la validation d'env sautée (`vitest.env-loader.ts:3`). Le refus du compteur par IP passe par `vi.spyOn(rateLimiter, 'check')`, motif prévu par `src/lib/rate-limiter.ts:48`.

- `src/app/api/mcp/[domain]/route.integration.test.ts` :
  - 401 et `WWW-Authenticate: Bearer` sans en-tête `Authorization`
  - 401 avec un schéma autre que `Bearer`
  - 401 avec une clé inconnue, puis avec une clé expirée
  - 403 avec une clé sans `crm` dans ses `permissions`
  - 404 sur un domaine inconnu
  - 403 sur un `Origin` étranger, requête servie sans `Origin`
  - 429 et `Retry-After` quand `rateLimiter.check` refuse, `verifyApiKey` non appelé
  - 429 quand le plugin renvoie `RATE_LIMITED`
  - 405 et `Allow: POST` sur `GET` et `DELETE`
  - 200 sur `tools/list` avec une clé valide, ligne `mcp:request` assertée par `toHaveBeenCalledWith` sur `keyId` et `era`, sans la valeur de la clé
- `src/server/mcp/crm/tools.integration.test.ts` (client `@modelcontextprotocol/client` en `versionNegotiation: { mode: 'auto' }`, branché sur `handler.fetch`, `authInfo` injecté, handler construit par test puisque `handler.close()` est définitif, cf. `.claude/rules/modelcontextprotocol-server/tests.md`) :
  - `tools/list` expose `crm_fetch` avec `readOnlyHint`
  - `crm_fetch` sur une entreprise existante renvoie sa fiche en texte JSON (id, nom)
  - `crm_fetch` sur un id inconnu renvoie `isError` avec un message qui nomme l'id

## Edge cases

- **`Origin: null`** (contexte opaque d'un navigateur) : 403, la valeur n'étant pas une origine valide
- **IP du rate limit** : la première entrée de `X-Forwarded-For` est fiable en production. Traefik, sans `forwardedHeaders.trustedIPs`, supprime les `X-Forwarded-*` d'une source non fiable puis ajoute l'IP source (code source Traefik v3.6, `pkg/middlewares/forwardedheaders/forwarded_header.go:113-114`, relevé le 2026-11-06)
- **Appel interne sans `X-Forwarded-For`** (sessions d'`agent-os` sur le réseau Docker, hors Traefik) : l'IP vaut `unknown` et toutes ces sessions partagent le seau `mcp:unknown` de 120/min, suffisant pour un seul propriétaire
- **Redéploiement** : le compteur par IP repart à zéro, les requêtes en cours sont coupées et le client sans état les rejoue
- **Panne de base pendant `verifyApiKey`** : le plugin attrape toute erreur et rend `valid: false` avec le code `INVALID_API_KEY` (`dist/index.mjs:1990-2008`), le même qu'une clé inconnue (l.1627) : la route répond 401, `mcp:rejected` raison `invalid_key`, sans la distinguer d'une clé fausse. Le logger de Better Auth écrit en plus une ligne `error` « Failed to validate API key » hors Pino, notée dans `docs/PRODUCTION.md`. Pas de sonde de base : une base en panne fait tomber toute l'app et `/api/health` la signale déjà
- **Scopes `read` et `write` des `permissions`** : la route ne les contrôle pas, seule la présence du domaine compte. Sans effet tant que l'UI du sub-project 02 les émet ensemble
- **Compteur par clé** : cumulatif, sans fenêtre glissante (cf. Plugin). Une clé qui dépasse 1 000 requêtes acceptées reçoit 429 jusqu'à une heure après sa dernière requête acceptée
- **Réglage du plugin changé plus tard** : seules les clés créées ensuite le prennent, les autres gardent leurs `rateLimitMax` et `rateLimitTimeWindow`
- **Une condition en échec** : le plan s'arrête avant le passage en `accepted`, l'ADR-025 reste `proposed` avec la mesure relevée, et la suite revient au propriétaire. Le code de la route reste sur la branche. Pour la condition 1, l'ADR prévoit que l'Option B reprenne l'avantage pour `agent-os`

## Architectural decisions

### Décision : distinguer 401 et 403 hors du plugin

**Options envisagées :**
- **A. `verifyApiKey` avec `permissions`** : un seul appel, mais des permissions insuffisantes reviennent en `KEY_NOT_FOUND`, impossibles à séparer d'une clé inconnue
- **B. `verifyApiKey` sans `permissions`, puis comparaison du domaine aux `permissions` de la clé** : toujours un seul appel, 401 et 403 distincts

**Choix : B**

**Rationale :**
- Un agent refusé pour un mauvais domaine doit le savoir, pas croire sa clé fausse
- Un second appel au plugin consommerait deux fois son rate limit

### Décision : rate limit en deux couches

**Options envisagées :**
- **A. Le seul rate limit du plugin, par clé** : une rafale de clés fausses atteint la base à chaque requête, et le chemin interne d'`agent-os` n'a pas Traefik devant lui
- **B. Un compteur par IP en mémoire avant toute lecture en base, puis le rate limit du plugin par clé** : la rafale s'arrête sans requête SQL, une clé fuitée reste bornée

**Choix : B**

**Rationale :**
- Seuils fixés par le propriétaire le 2026-11-06 : 120 requêtes par minute et par IP, 1 000 requêtes cumulées par clé (comportement réel du plugin décrit dans Architecture approach > Plugin)
- Le compteur en mémoire suffit tant que l'app tourne en instance unique, comme pour le formulaire de contact

### Décision : logger propre à la route MCP

**Options envisagées :**
- **A. Réutiliser `createActionLogger`** : il pose un span de Server Action et lit `headers()`, faux sens dans un route handler
- **B. Un logger enfant par requête, le tracing natif des route handlers de Sentry** : mêmes champs que les actions (`action`, `requestId`, `ip_hash`), sans span inventé

**Choix : B**

**Rationale :**
- Sentry trace déjà les route handlers, contrairement aux Server Actions sous Turbopack
- Les filtres existants par `event` et `action` restent valables
