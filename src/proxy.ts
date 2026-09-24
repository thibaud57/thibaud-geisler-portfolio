import { getSessionCookie } from "better-auth/cookies"
import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"

import { ADMIN_LOGIN_PATH, isAdminPath, requiresSession } from "@/lib/admin-routes"
import { prisma } from "@/lib/prisma"
import { routing } from "@/i18n/routing"

const intlHandler = createMiddleware(routing)

const PROJECT_PAGE_PATTERN = new RegExp(`^/(${routing.locales.join("|")})/projets/([^/]+)$`)

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isAdminPath(pathname)) {
    if (requiresSession(pathname) && !getSessionCookie(request)) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url))
    }
    return NextResponse.next()
  }

  // Seul un check avant le stream peut poser un vrai 404 (notFound() ne peut plus une fois le
  // stream commencé). `'use cache'` ne marche pas hors du rendu React, d'où cette requête à part.
  const projectMatch = PROJECT_PAGE_PATTERN.exec(pathname)
  const locale = projectMatch?.[1]
  const slug = projectMatch?.[2]
  if (locale && slug) {
    try {
      const project = await prisma.project.findFirst({
        where: { slug: decodeURIComponent(slug), status: "PUBLISHED" },
        select: { id: true },
      })
      if (!project) {
        // Chemin sans page.tsx dans [locale] : Next rend not-found.tsx nativement, avec un vrai
        // 404 posé avant tout Suspense.
        return NextResponse.rewrite(new URL(`/${locale}/_unmatched-project-slug`, request.url))
      }
    } catch {
      // Panne base : laisser passer plutôt que de transformer une page valide en 404.
    }
  }

  return intlHandler(request)
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
