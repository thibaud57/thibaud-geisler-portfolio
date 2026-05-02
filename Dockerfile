FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS builder
# .env exclu par .dockerignore (vars injectées par Dokploy au runtime) → bypass la validation
# t3-env au build, sinon Zod crashe au chargement des modules qui importent @/env et la
# collecte de page data Next échoue (ex: opengraph-image).
ENV SKIP_ENV_VALIDATION=true
# NEXT_PUBLIC_* sont inlinées dans le bundle JS au moment de `next build` (cf. doc Next.js
# environment-variables). Sans ces ARG → `process.env.NEXT_PUBLIC_*` = undefined littéral
# dans le bundle final, sitemap/canonicals/OG cassés en prod. Propagation via compose.yaml
# build.args (cf. doc Dokploy core/docker-compose/example).
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CALENDLY_URL_FR
ARG NEXT_PUBLIC_CALENDLY_URL_EN
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_CALENDLY_URL_FR=$NEXT_PUBLIC_CALENDLY_URL_FR
ENV NEXT_PUBLIC_CALENDLY_URL_EN=$NEXT_PUBLIC_CALENDLY_URL_EN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma 7 génère le client dans src/generated/ (gitignored), non ramené par `COPY . .`.
COPY --from=deps /app/src/generated ./src/generated
# --webpack : workaround Prisma 7 + Turbopack WASM (query_compiler_fast_bg.postgresql.mjs not found)
# À retirer quand l'issue upstream sera corrigée
RUN pnpm exec next build --webpack

# Stage dédié à l'extraction des deps runtime (node_modules flat, sans symlinks .pnpm).
# Permet au runner standalone de lancer `prisma migrate deploy` au startup.
FROM base AS deploy-prisma
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
RUN pnpm deploy --legacy --prod --filter=. /prod

FROM base AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=deploy-prisma --chown=nextjs:nodejs /prod/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && node server.js"]
