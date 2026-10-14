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

// Échelle markdown admin (docs/DESIGN.md, Champ markdown), commune éditeur/lecture.
// Retraits et marges des listes de tâches de `prose` annulés ici : le CSS de l'éditeur (couche components) perd contre ces utilitaires.
export const ADMIN_MARKDOWN_CLASS = [
  "prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed",
  "prose-h1:mt-5 prose-h1:mb-1.5 prose-h1:text-lg prose-h1:font-semibold",
  "prose-h2:mt-3.5 prose-h2:mb-1 prose-h2:text-base prose-h2:font-semibold",
  "prose-h3:mt-3 prose-h3:mb-1 prose-h3:text-sm prose-h3:font-semibold",
  "prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5",
  "prose-blockquote:my-2 prose-blockquote:border-l-2 prose-blockquote:pl-3 prose-blockquote:font-normal prose-blockquote:not-italic prose-blockquote:text-muted-foreground",
  "[&_ul[data-type=taskList]]:ps-0 [&_li[data-checked]]:ps-0 [&_li[data-checked]_p]:my-0",
  "[&>:first-child]:mt-0 [&>:last-child]:mb-0",
].join(" ")
