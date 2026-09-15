import "server-only"
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { APIError } from "better-auth/api"
import { nextCookies } from "better-auth/next-js"

import { env } from "@/env"
import { ADMIN_LOGIN_PATH } from "@/lib/admin-routes"
import { isAdminEmail } from "@/lib/admin-whitelist"
import { prisma } from "@/lib/prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  onAPIError: {
    // Le callback OAuth ne redirige vers errorURL que si l'APIError du hook porte un `code` (dist/api/routes/callback.mjs)
    errorURL: ADMIN_LOGIN_PATH,
  },
  databaseHooks: {
    user: {
      create: {
        before: (user) => {
          if (!isAdminEmail(user.email, env.ADMIN_EMAIL)) {
            throw new APIError("FORBIDDEN", { code: "FORBIDDEN" })
          }
          return Promise.resolve({ data: user })
        },
      },
    },
    session: {
      create: {
        // disableIpTracking couperait aussi le rate limiting : l'IP reste lue en mémoire pour lui mais n'est jamais persistée (docs/registre-traitements.md)
        before: (session) => Promise.resolve({ data: { ...session, ipAddress: null } }),
      },
    },
  },
  plugins: [nextCookies()],
})
