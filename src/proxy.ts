import { getSessionCookie } from "better-auth/cookies"
import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"

import { ADMIN_LOGIN_PATH, isAdminPath, requiresSession } from "@/lib/admin-routes"
import { routing } from "@/i18n/routing"

const intlHandler = createMiddleware(routing)

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isAdminPath(pathname)) {
    if (requiresSession(pathname) && !getSessionCookie(request)) {
      return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url))
    }
    return NextResponse.next()
  }

  return intlHandler(request)
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
