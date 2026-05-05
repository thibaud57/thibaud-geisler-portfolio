# syntax=docker/dockerfile:1.7

# =============================================================================
# Base — Node 24 alpine + libc6-compat (sharp) + pnpm via corepack
# =============================================================================
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable


# =============================================================================
# Stage: deps — Install full (deps + devDeps) + génération client Prisma
# Cache mount sur le store pnpm pour accélérer les rebuilds Dokploy.
# =============================================================================
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile


# =============================================================================
# Stage: builder — Build Next.js (standalone) + bundle du seed Prisma
# =============================================================================
FROM base AS builder

# --- Env de build ----------------------------------------------------------
# Vars server (DATABASE_URL, SMTP_*, MAIL_TO) injectées par Dokploy au runtime,
# absentes au build → bypass validation t3-env.
ENV SKIP_ENV_VALIDATION=true

# NEXT_PUBLIC_* inlinées dans le bundle JS au build (sans ARG → undefined dans
# sitemap/canonicals/OG). Propagées via compose.yaml build.args.
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CALENDLY_URL_FR
ARG NEXT_PUBLIC_CALENDLY_URL_EN
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CALENDLY_URL_FR=$NEXT_PUBLIC_CALENDLY_URL_FR
ENV NEXT_PUBLIC_CALENDLY_URL_EN=$NEXT_PUBLIC_CALENDLY_URL_EN

# --- Sources + node_modules ------------------------------------------------
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma 7 génère le client dans src/generated/ (gitignored), non ramené par `COPY . .`.
COPY --from=deps /app/src/generated ./src/generated

# --- Build Next.js ---------------------------------------------------------
# --webpack : workaround Prisma 7 + Turbopack WASM
# (query_compiler_fast_bg.postgresql.mjs not found). À retirer quand l'issue
# upstream sera corrigée.
RUN pnpm exec next build --webpack

# --- Bundle du seed Prisma -------------------------------------------------
# Pre-bundle prisma/seed.ts → prisma/seed.js (deps externes resolues au runtime
# depuis node_modules). En prod, prisma.config.ts utilise `node prisma/seed.js`
# au lieu de `tsx prisma/seed.ts` :
#   - tsx est un devDep, exclu par `pnpm deploy --prod` → absent du runner
#   - même en deps, /app/node_modules/.bin n'est pas dans le PATH du runner
#     → spawn('tsx') échouerait avec ENOENT
# `node` est dans le PATH système, donc spawn passe.
RUN pnpm exec esbuild prisma/seed.ts \
    --bundle \
    --platform=node \
    --format=esm \
    --target=node24 \
    --packages=external \
    --alias:@=./src \
    --outfile=prisma/seed.js


# =============================================================================
# Stage: deploy-prisma — Extraction des deps runtime en node_modules flat
# `pnpm deploy --legacy --prod` produit un node_modules sans symlinks .pnpm,
# requis pour que le runner standalone puisse lancer `prisma migrate deploy`
# et `prisma db seed` au startup.
# =============================================================================
FROM base AS deploy-prisma
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm deploy --legacy --prod --filter=. /prod


# =============================================================================
# Stage: runner — Image finale, user non-root, Next standalone + Prisma
# =============================================================================
FROM base AS runner

# --- Env runtime -----------------------------------------------------------
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# --- User non-root ---------------------------------------------------------
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# --- Artifacts Next.js standalone ------------------------------------------
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# --- Artifacts Prisma (client + adapter en deps prod, schema, migrations, seed bundlé) ---
COPY --from=deploy-prisma --chown=nextjs:nodejs /prod/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./

# --- Run -------------------------------------------------------------------
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
