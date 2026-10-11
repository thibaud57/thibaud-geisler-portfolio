---
paths:
  - "Dockerfile*"
  - ".dockerignore"
---

# Docker — Dockerfile (multi-stage, cache, base image)

## À faire
- Utiliser un **Dockerfile multi-stage** avec stages nommés via `AS <name>` pour isoler toolchain/devDeps du runtime image. Le projet enchaîne `base` (Node + pnpm, hérité par tous) → `deps` → `builder` → `deploy-prisma` → `runner`
- Image de base **`node:<ligne LTS>-alpine`** : runtime sur une ligne LTS uniquement. La ligne exécutée et ses dates de bascule vivent dans `docs/VERSIONS.md` § Montées Bloquées, pas ici. Le tag de ligne flottant est assumé (chaque build suit le dernier patch), le digest `@sha256:` reste l'option si la reproductibilité stricte devient nécessaire
- Activer pnpm via **`corepack enable`** dans le stage `base`, pas `npm install -g pnpm` : la version se lit dans `packageManager`
- Copier **`package.json`**, **`pnpm-lock.yaml`** et **`pnpm-workspace.yaml`** AVANT le code source pour maximiser le cache de layers. Le troisième porte `allowBuilds` : sans lui, une dépendance à scripts de build fait échouer l'install (`strictDepBuilds`, cf. `pnpm/setup.md`)
- **`pnpm install --frozen-lockfile`** pour garantir la reproductibilité du build (échoue si lockfile désynchronisé)
- Monter un **cache BuildKit** sur le store pnpm (`RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store`) : il profite aux builds locaux. Le build de production tourne sur un runner GitHub Actions éphémère, où seul le cache de couches (`cache-from: type=gha`) évite de réinstaller
- Créer un **utilisateur non-root** dédié (`addgroup` + `adduser`) et l'activer via `USER` dans le stage final `runner`
- Lancer le process en **forme exec**. Un enchaînement par `sh -c` (migration puis serveur) finit par **`exec node server.js`** : sinon `sh` reste parent de Node, ne lui relaie pas le `SIGTERM` de `docker stop`, et Docker tue le conteneur au bout de 10 s
- Maintenir un **`.dockerignore`** excluant `node_modules`, `.next`, `.git`, `.env*`, `*.md`, et tout fichier qui change sans entrer dans le build (`.github`, `compose*.yaml`, `Justfile`, `Dockerfile`) : chaque fichier du contexte peut invalider `COPY . .`, donc `next build`
- Pour les règles **Next.js spécifiques** au conteneur (`output: standalone`, `HOSTNAME`, `/api/health`, `instrumentation.ts`) : voir `nextjs/production-deployment.md`

## À éviter
- `COPY . .` avant l'installation des dépendances : invalide le cache de layers à chaque modification de code
- Épingler le tag **`latest`** pour l'image de base en production : non reproductible, un rebuild peut casser sans changement code
- Utiliser une ligne Node arrivée en fin de vie (`node:20-*` depuis le 30 avril 2026)
- Lancer le stage final en **root** : risque de sécurité, toujours un USER non-root dédié
- Copier `node_modules` depuis l'hôte via le build context : toujours réinstaller dans le build pour des binaires natifs corrects (cross-arch Alpine vs host)

## Gotchas
- **Corepack est distribué avec Node jusqu'à la ligne 24 incluse** : à partir de Node 25, `npm install -g corepack` avant `corepack enable`. À traiter avec la montée de ligne, et le `runner` supprime npm (alertes Trivy) : l'installer dans `base`
- `init: true` du compose relaie les signaux à son enfant direct, `sh`, pas au Node lancé par `sh -c` : il ne remplace pas `exec`
- **Docker Engine 29 ulimit nofile** : valeur par défaut tombée à 1024 (depuis 1048576). Ajuster côté `daemon.json` ou par `ulimits:` dans le compose si le service a beaucoup de connexions, jamais dans le Dockerfile (détail : `docs/knowledges/docker.md` § ulimit nofile v29)

## Exemples
```dockerfile
# ✅ Stage base commun, manifests avant le code, runner non-root, exec en fin de sh -c
FROM node:24-alpine AS base
WORKDIR /app
RUN corepack enable

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
# ❌ COPY . . avant install, et sh reste parent de node (SIGTERM jamais relayé)
FROM node:24-alpine AS deps
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
CMD ["sh", "-c", "node migrate.js && node server.js"]
```
