import bundleAnalyzer from "@next/bundle-analyzer"
import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"
import { withSentryConfig } from "@sentry/nextjs/config"

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts")
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env["ANALYZE"] === "true" })

const isDev = process.env.NODE_ENV !== "production"

const cspDirectives = [
  ["default-src", "'self'"],
  ["script-src", isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'"],
  ["style-src", "'self' 'unsafe-inline'"],
  ["img-src", "'self' data: https:"],
  ["frame-src", "https://calendly.com https://*.calendly.com"],
  ["connect-src", "'self' https://*.calendly.com https://o4511826481774592.ingest.de.sentry.io"],
  ["font-src", "'self' data:"],
  ["frame-ancestors", "'none'"],
  ["base-uri", "'self'"],
  ["form-action", "'self'"],
  ["object-src", "'none'"],
] as const

const cspHeaderValue = cspDirectives.map(([directive, value]) => `${directive} ${value}`).join("; ")

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "0" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Fallback : en production Traefik (`security-headers@file`) réécrit cette en-tête,
  // la valeur est alignée sur la sienne pour qu'un `curl -I` donne le même résultat partout.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Content-Security-Policy", value: cspHeaderValue },
]

const nextConfig: NextConfig = {
  // Empêche `next dev` de régénérer AGENTS.md / CLAUDE.md à la racine :
  // les instructions agent du projet vivent dans .claude/CLAUDE.md.
  agentRules: false,
  output: "standalone",
  cacheComponents: true,
  // Sans generateStaticParams sur /projets/[slug], la coquille d'un slug jamais visité est servie
  // à l'instant puis complétée en arrière-plan, y compris dès qu'un <Link> vers lui entre dans le
  // viewport (ISR avec Cache Components).
  partialPrefetching: true,
  // Reprend la liste par défaut de Next (l'option la remplace, elle ne l'étend pas) et y ajoute les
  // crawlers HTML-only que le prerender des slugs protégeait : sans rendu bloquant, ils liraient
  // les métadonnées streamées après </head>. Jamais /.*/ : bugs connus avec Cache Components
  // (.claude/rules/nextjs/metadata-seo.md).
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|TelegramBot|Bluesky|Mastodon/i,
  experimental: {
    // Requis car le root layout vit dans le segment [locale] (structure next-intl) :
    // global-not-found.tsx porte le 404 des URLs qui ne matchent aucune route.
    globalNotFound: true,
    authInterrupts: true,
    taint: true,
    serverActions: {
      // Porte sur le corps HTTP brut, overhead multipart compris : garder de la marge sur
      // MAX_ASSET_BYTES (8 Mo, la limite annoncée et vérifiée côté client/serveur).
      bodySizeLimit: "10mb",
    },
  },
  typedRoutes: true,
  poweredByHeader: false,
  // Traefik sert le brotli (`compress-br@file`) et ne compresse pas une réponse portant déjà
  // un Content-Encoding : le gzip de Next l'en empêcherait. Sans ce middleware, plus rien
  // n'est compressé. Cf. docs/knowledges/dokploy.md § Compression Brotli
  compress: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // Photo de profil Google du compte admin, affichée dans le menu du compte
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/a/**" },
    ],
  },
  serverExternalPackages: ["pino", "pino-pretty", "thread-stream"],
  outputFileTracingIncludes: {
    "/[locale]/mentions-legales": ["./content/legal/**/*.md"],
    "/[locale]/confidentialite": ["./content/legal/**/*.md"],
  },
  env: {
    NEXT_PUBLIC_BUILD_YEAR: String(new Date().getFullYear()),
  },
  // Retour synchrone accepte par le type Next : `async` sans `await` serait du bruit
  headers() {
    return [{ source: "/(.*)", headers: securityHeaders }]
  },
}

export default withSentryConfig(withBundleAnalyzer(withNextIntl(nextConfig)), {
  org: "tg-ws",
  project: "thibaud-geisler-portfolio",
  authToken: process.env["SENTRY_AUTH_TOKEN"],
  silent: !process.env["CI"],
  widenClientFileUpload: true,
  // @ts-expect-error useRunAfterProductionCompileHook is undocumented in types but required for Turbopack
  _experimental: { useRunAfterProductionCompileHook: true },
})
