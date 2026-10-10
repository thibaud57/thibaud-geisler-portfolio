import type { InterviewType, LeadOrigin } from "@/generated/prisma/client"

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

// Un texte saisi n'est jamais écrasé : seul un Détails resté vide ou au gabarit précédent suit le changement.
export function detailsAfterTemplateChange(
  details: string,
  previousTemplate: string,
  nextTemplate: string,
): string {
  const untouched = details.trim() === "" || sameText(details, previousTemplate)
  return untouched ? nextTemplate : details
}

export function detailsAfterOriginChange(
  details: string,
  previousOrigin: LeadOrigin | "",
  nextOrigin: LeadOrigin | "",
): string {
  return detailsAfterTemplateChange(
    details,
    leadDetailsTemplate(previousOrigin),
    leadDetailsTemplate(nextOrigin),
  )
}

// Titres de la fiche Notion ; poste, entreprise et types restent des champs, pas du texte.
export const CONTACT_DETAILS_TEMPLATE = `# 💼 Profil

# 🤝 Relation

- **Rencontre** :

# 📅 Historique

- **JJ/MM/AAAA** :

# 🔗 Liens

# 📝 Notes libres
`

// Secteur et taille vivent sur l'entreprise, TJM/lieu/rythme sur l'opportunité : il ne reste ici que le texte.
export const OPPORTUNITY_DETAILS_TEMPLATE = `# 🎯 Contexte

# 👤 Profil recherché

# 🛠️ Contenu technique
`

// Réduits à l'échange : opportunité et package vivent sur l'opportunité, culture d'entreprise dans son Détails.
const INTERVIEW_FIRST_CONTACT_TEMPLATE = `# 📋 Contexte du contact

# 🚩 Red flags

# ✅ Green flags

# ➡️ Suite
`

const INTERVIEW_HEADINGS = [
  "# 🎯 Objectifs",
  "# 💪 Préparation ciblée",
  "# 🗒️ Déroulé",
  "# 🎯 Évaluation",
  "# 🚩 Red flags",
  "# ✅ Green flags",
  "# 🎬 Pourquoi et conditions",
  "# ➡️ Suite",
]

function headingsTemplate(headings: readonly string[]): string {
  return `${headings.join("\n\n")}\n`
}

const INTERVIEW_TEMPLATE = headingsTemplate(INTERVIEW_HEADINGS)
// L'exercice technique se prépare : il suit la préparation ciblée.
const TECHNICAL_INTERVIEW_TEMPLATE = headingsTemplate(
  INTERVIEW_HEADINGS.toSpliced(2, 0, "# 💻 Exercice technique"),
)

const INTERVIEW_TEMPLATES: Record<InterviewType, string> = {
  PREMIER_CONTACT: INTERVIEW_FIRST_CONTACT_TEMPLATE,
  RECRUTEUR_RH: INTERVIEW_TEMPLATE,
  MANAGER_EQUIPE: INTERVIEW_TEMPLATE,
  NEGOCIATION: INTERVIEW_TEMPLATE,
  TECHNIQUE: TECHNICAL_INTERVIEW_TEMPLATE,
}

export function interviewDetailsTemplate(type: InterviewType | ""): string {
  return type === "" ? "" : INTERVIEW_TEMPLATES[type]
}
