import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const isDev = process.env.NODE_ENV !== 'production'

const cspDirectives = [
  ['default-src', "'self'"],
  ['script-src', isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'"],
  ['style-src', "'self' 'unsafe-inline'"],
  ['img-src', "'self' data: https:"],
  ['frame-src', 'https://calendly.com https://*.calendly.com'],
  ['connect-src', "'self' https://*.calendly.com"],
  ['font-src', "'self' data:"],
  ['frame-ancestors', "'none'"],
  ['base-uri', "'self'"],
  ['form-action', "'self'"],
  ['object-src', "'none'"],
] as const

const cspHeaderValue = cspDirectives.map(([directive, value]) => `${directive} ${value}`).join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: cspHeaderValue },
]

const nextConfig: NextConfig = {
  output: 'standalone',
  cacheComponents: true,
  typedRoutes: true,
  poweredByHeader: false,
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  outputFileTracingIncludes: {
    '/[locale]/mentions-legales': ['./content/legal/**/*.md'],
    '/[locale]/confidentialite': ['./content/legal/**/*.md'],
  },
  env: {
    NEXT_PUBLIC_BUILD_YEAR: String(new Date().getFullYear()),
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
}

export default withNextIntl(nextConfig)
