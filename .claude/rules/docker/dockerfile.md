---
paths:
  - "Dockerfile*"
  - ".dockerignore"
---

# Docker : Dockerfile (multi-stage, cache, base image)

## À faire
- Utiliser un **Dockerfile multi-stage** avec stages nommés via `AS <name>` pour isoler toolchain/devDeps du runtime image. Le projet enchaîne `base` (Node + pnpm, hérité par tous) → `deps` → `builder` → `deploy-prisma` → `runner`
- Image de base **`node:<x.y.z>-alpine`** : tag complet de patch, égal à `devEngines.runtime.version` de `package.json`, sur une ligne LTS uniquement. Dependabot (écosystème `docker`) monte le tag mais pas `devEngines.runtime` (dependabot-core#13722) : monter les deux ensemble, à la main. La ligne exécutée et ses dates de bascule vivent dans `docs/VERSIONS.md`, pas ici. Le digest `@sha256:` reste l'option si la reproductibilité stricte devient nécessaire
- Installer un pnpm 12 quelconque par **`npm install -g pnpm@12`** dans le stage `base` : `devEngines.packageManager` de `package.json` impose ensuite la version exacte (`onFail: download`). Pas de Corepack, retiré de Node à partir de la 25
- Copier **`package.json`**, **`pnpm-lock.yaml`** et **`pnpm-workspace.yaml`** AVANT le code source pour maximiser le cache de layers. Le troisième porte `allowBuilds` : sans lui, une dépendance à scripts de build fait échouer l'install (`strictDepBuilds`, cf. `pnpm/setup.md`)
- **`pnpm install --frozen-lockfile`** pour garantir la reproductibilité du build (échoue si lockfile désynchronisé)
- Monter un **cache BuildKit** sur le store pnpm (`RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store`) : il profite aux builds locaux. Le build de production tourne sur un runner GitHub Actions éphémère, où seul le cache de couches (`cache-from: type=gha`) évite de réinstaller
- Créer un **utilisateur non-root** dédié (`addgroup` + `adduser`) et l'activer via `USER` dans le stage final `runner`
- Lancer le process en **forme exec**. Un enchaînement par `sh -c` (migration puis serveur) finit par **`exec node server.js`** : sinon `sh` reste parent de Node, ne lui relaie pas le `SIGTERM` de `docker stop` et Docker tue le conteneur au bout de 10 s
- Maintenir un **`.dockerignore`** excluant `node_modules`, `.next`, `.git`, `.env*`, `*.md` et tout fichier qui change sans entrer dans le build (`.github`, `compose*.yaml`, `Justfile`, `Dockerfile`) : chaque fichier du contexte peut invalider `COPY . .`, donc `next build`
- Pour les règles **Next.js spécifiques** au conteneur (`output: standalone`, `HOSTNAME`, `/api/health`) : voir `nextjs/production-deployment.md`

## À éviter
- Utiliser une ligne Node arrivée en fin de vie (`node:20-*` depuis le 30 avril 2026)

## Gotchas
- Le `runner` supprime npm (alertes Trivy) : pnpm s'installe dans `base`, jamais dans `runner`
- `init: true` du compose relaie les signaux à son enfant direct, `sh`, pas au Node lancé par `sh -c` : il ne remplace pas `exec`
- **Docker Engine 29 ulimit nofile** : valeur par défaut tombée à 1024 (depuis 1048576). Ajuster côté `daemon.json` ou par `ulimits:` dans le compose si le service a beaucoup de connexions, jamais dans le Dockerfile (détail : `docs/knowledges/docker.md` § ulimit nofile v29)

## Exemples
```dockerfile
# ✅ Stage base commun, manifests avant le code, runner non-root, exec en fin de sh -c
FROM node:26.13.0-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@12

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS runner
RUN addgroup -S app && adduser -S -G app appuser
COPY --from=builder --chown=appuser:app /app/dist ./
USER appuser
CMD ["sh", "-c", "node migrate.js && exec node server.js"]
```

```dockerfile
# ❌ COPY . . avant install et sh parent de node (SIGTERM jamais relayé)
FROM node:26.13.0-alpine AS deps
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile   # Corepack : absent de Node 25+
CMD ["sh", "-c", "node migrate.js && node server.js"]
```
