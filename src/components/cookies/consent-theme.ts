import type { ConsentProviderOptions } from "c15t/react"

const themeColors = {
  primary: "var(--primary)",
  primaryHover: "var(--primary)",
  surface: "var(--card)",
  surfaceHover: "var(--muted)",
  border: "var(--border)",
  text: "var(--foreground)",
  textMuted: "var(--muted-foreground)",
  textOnPrimary: "var(--primary-foreground)",
  switchTrackActive: "var(--primary)",
} as const

export const consentTheme = {
  colors: themeColors,
  // Sans dark explicite, les valeurs par défaut de c15t en mode sombre l'emportent sur nos tokens.
  dark: themeColors,
  radius: {
    md: "var(--radius)",
  },
  typography: {
    fontFamily: "var(--font-sans)",
  },
  // Rendu aligné sur c15t 2 : le pied de la modale reprend son filet et rétrécit ses boutons au
  // lieu de déborder, les liens restent non soulignés. Le `!` est requis, les classes de c15t 3
  // se doublent (spécificité 0,2,0) et battent un utilitaire seul.
  slots: {
    consentBannerDescription: "[&_a]:text-primary [&_a]:no-underline",
    consentBannerFooter: "gap-3!",
    consentDialogDescription: "[&_a]:block [&_a]:mt-2 [&_a]:text-primary [&_a]:no-underline",
    consentWidgetFooter: "gap-4! flex-nowrap! border-t! border-border!",
    consentWidgetFooterSubGroup:
      "min-w-0! shrink! [&_button]:h-auto [&_button]:min-w-0 [&_button]:shrink [&_button]:whitespace-normal",
  },
} as const satisfies NonNullable<ConsentProviderOptions["theme"]>
