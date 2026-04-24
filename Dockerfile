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
