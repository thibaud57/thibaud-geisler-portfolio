import type { LeadOrigin } from "@/generated/prisma/client"

export const DETAILS_EDITOR_HELP =
  "Raccourcis : « # » un titre, « - » une liste, « > » une citation, « / » le menu des blocs."

// Titres seuls, séparés d'une ligne vide : le propriétaire remplit le corps depuis l'éditeur.
export const COMPANY_DETAILS_TEMPLATE = `# 🏢 À propos

# 📊 Chiffres clés

# 🌐 Activités

# 🤝 Contexte de la relation

# 🔗 Liens

# 📝 Notes libres
`

const LEAD_OUTBOUND_DETAILS_TEMPLATE = `# 💡 Hypothèse / Angle

- **Hypothèse de besoin** :
- **Angle de pitch** :
- **Objectif du contact** :

# 🎯 Contexte
`

const LEAD_INBOUND_DETAILS_TEMPLATE = `# 🎯 Contexte
`

const LEAD_DETAILS_TEMPLATES: Record<LeadOrigin, string> = {
  INBOUND: LEAD_INBOUND_DETAILS_TEMPLATE,
  OUTBOUND: LEAD_OUTBOUND_DETAILS_TEMPLATE,
}

export function leadDetailsTemplate(origin: LeadOrigin | ""): string {
  return origin === "" ? "" : LEAD_DETAILS_TEMPLATES[origin]
}

// L'éditeur peut réécrire les espaces du gabarit dès son affichage : la comparaison les ignore.
function sameText(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim()
}

// Un texte saisi n'est jamais écrasé : seul un Détails vide, ou resté tel que le gabarit de l'origine précédente l'a posé, suit le changement d'origine.
export function detailsAfterOriginChange(
  details: string,
  previousOrigin: LeadOrigin | "",
  nextOrigin: LeadOrigin | "",
): string {
  const untouched = details.trim() === "" || sameText(details, leadDetailsTemplate(previousOrigin))
  return untouched ? leadDetailsTemplate(nextOrigin) : details
}
