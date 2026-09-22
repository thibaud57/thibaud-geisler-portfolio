export const LABEL_CLASS = "text-sm font-medium tracking-[0.25em] text-muted-foreground uppercase"

// Lien dans du texte courant : soulignement permanent mais léger, plein au survol. Il doit se
// repérer sans la couleur (WCAG 1.4.1, le vert sombre ne contraste pas assez avec le texte),
// et un trait plein sur chaque lien d'une liste se lisait comme une erreur.
export const LINK_CLASS =
  "text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"

// Lien seul sur sa ligne (liste de liens, valeur sous un libellé) : sa place dit déjà ce qu'il
// est, la couleur suffit et le trait n'arrive qu'au survol.
export const STANDALONE_LINK_CLASS = "text-primary no-underline underline-offset-4 hover:underline"

// Le badge par défaut alourdirait un bouton sm.
export const COUNTER_BADGE_CLASS = "h-4 min-w-4 px-[5px] text-[10px] leading-none"
