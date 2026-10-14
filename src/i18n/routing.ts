import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["fr", "en"],
  defaultLocale: "fr",
  localePrefix: "always",
  // Les hreflang (x-default compris) viennent des métadonnées de seo.ts : le header `Link` que
  // next-intl pose par défaut en serait une seconde source, calculée sans elles.
  alternateLinks: false,
})
