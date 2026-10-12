// Module sans "use client" : partagé entre les tables clientes (DataTable) et les pages serveur
// (DataTableSkeleton), pour que le squelette ne dérive jamais silencieusement de la table.

import type { ActionView } from "@/lib/crm/action-views"
import type { CompanyView } from "@/lib/crm/company-views"
import type { InterviewView } from "@/lib/crm/interview-views"
import type { LeadView } from "@/lib/crm/lead-views"
import type { OpportunityView } from "@/lib/crm/opportunity-views"
import type { ReviewView } from "@/lib/crm/review-views"
import type { ProjectView } from "@/lib/project-views"

export const ORDER_COLUMN_WIDTH = 52

// Une seule largeur pour toutes les listes : une ligne porte au plus trois actions.
export const ACTIONS_COLUMN_WIDTH = 88

function skeletonWidths<K extends string>(
  widths: Record<K | "actions", number>,
  leadKeys: readonly K[],
  visible: readonly K[],
): readonly number[] {
  return [...leadKeys, ...visible, "actions" as const].map((key) => widths[key])
}

export const TAG_COLUMN_WIDTHS = {
  name: 280,
  nameEn: 210,
  kind: 110,
  icon: 170,
  usage: 84,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export const TAG_SKELETON_WIDTHS: readonly number[] = [
  ORDER_COLUMN_WIDTH,
  ...Object.values(TAG_COLUMN_WIDTHS),
]

export const COMPANY_COLUMN_WIDTHS = {
  logo: 44,
  name: 211,
  types: 179,
  sectors: 179,
  zones: 160,
  size: 140,
  relationStatus: 150,
  worked: 104,
  firstContactAt: 150,
  endClients: 220,
  legalEntity: 160,
  websiteUrl: 150,
  notes: 220,
  projects: 96,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type CompanyColumnKey = keyof typeof COMPANY_COLUMN_WIDTHS

const ALL_COMPANY_COLUMNS: readonly CompanyColumnKey[] = [
  "types",
  "sectors",
  "zones",
  "size",
  "relationStatus",
  "worked",
  "firstContactAt",
  "endClients",
  "legalEntity",
  "websiteUrl",
  "notes",
  "projects",
]

// Source unique des colonnes visibles par défaut par vue, lue par la table comme par son squelette.
export const COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<
  CompanyView,
  readonly CompanyColumnKey[]
> = {
  all: ALL_COMPANY_COLUMNS,
  travaillees: ["types", "sectors", "zones", "size", "relationStatus", "endClients", "projects"],
  recrutement: ["types", "zones", "relationStatus", "worked", "firstContactAt", "endClients"],
  // Une entreprise prospect n'est jamais travaillée : Travaillée y serait constante, Clients finaux
  // (lus sur les opportunités acceptées) et Projets (projets client seuls) toujours vides.
  prospects: ALL_COMPANY_COLUMNS.filter(
    (key) => key !== "worked" && key !== "endClients" && key !== "projects",
  ),
}

export const COMPANY_PAGE_SKELETON: string[] = [
  "h-[24px]",
  "h-[260px]",
  "h-[160px]",
  "h-[140px]",
  "h-[220px]",
]

export function companySkeletonWidths(view: CompanyView): readonly number[] {
  return skeletonWidths(
    COMPANY_COLUMN_WIDTHS,
    ["logo", "name"],
    COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
  )
}

export const PROJECT_COLUMN_WIDTHS = {
  titre: 240,
  nature: 104,
  formats: 150,
  entreprise: 180,
  contrat: 130,
  debut: 150,
  fin: 150,
  duree: 130,
  equipe: 110,
  liens: 130,
  statut: 112,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type ProjectColumnKey = keyof typeof PROJECT_COLUMN_WIDTHS

export const PROJECT_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<
  ProjectView,
  readonly ProjectColumnKey[]
> = {
  all: [
    "nature",
    "formats",
    "entreprise",
    "contrat",
    "debut",
    "fin",
    "duree",
    "equipe",
    "liens",
    "statut",
  ],
  client: ["formats", "entreprise", "debut", "duree", "statut"],
  perso: ["formats", "debut", "fin", "liens", "statut"],
}

export function projectSkeletonWidths(view: ProjectView): readonly number[] {
  return [
    ORDER_COLUMN_WIDTH,
    ...skeletonWidths(PROJECT_COLUMN_WIDTHS, ["titre"], PROJECT_VIEW_DEFAULT_VISIBLE_COLUMNS[view]),
  ]
}

export const PROJECT_PAGE_SKELETON: string[] = [
  "h-[24px]",
  "h-[320px]",
  "h-[260px]",
  "h-[160px]",
  "h-[320px]",
  "h-[220px]",
  "h-[160px]",
  "h-[220px]",
  "h-[220px]",
]

export const LEAD_COLUMN_WIDTHS = {
  // Une colonne triable tient son en-tête sur une ligne : libellé, icône de tri et marges du bouton dictent sa largeur.
  name: 200,
  status: 130,
  interest: 104,
  score: 90,
  origin: 110,
  channel: 130,
  metAt: 160,
  jobRole: 140,
  company: 180,
  zone: 140,
  linkedinUrl: 170,
  email: 200,
  phone: 140,
  actionsCount: 110,
  interviewsCount: 110,
  retentionEnd: 180,
  notes: 220,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type LeadColumnKey = keyof typeof LEAD_COLUMN_WIDTHS

export const LEAD_PAGE_SKELETON: string[] = ["h-[24px]", "h-[280px]", "h-[200px]", "h-[320px]"]

export const CONTACT_PAGE_SKELETON = LEAD_PAGE_SKELETON

const ALL_LEAD_COLUMNS: readonly LeadColumnKey[] = [
  "status",
  "interest",
  "score",
  "origin",
  "channel",
  "metAt",
  "jobRole",
  "company",
  "zone",
  "linkedinUrl",
  "email",
  "phone",
  "actionsCount",
  "notes",
]

export const LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<LeadView, readonly LeadColumnKey[]> = {
  "en-cours": ALL_LEAD_COLUMNS,
  chauds: [
    "status",
    "score",
    "origin",
    "channel",
    "metAt",
    "jobRole",
    "company",
    "zone",
    "linkedinUrl",
    "email",
    "phone",
    "actionsCount",
    "notes",
  ],
  "a-qualifier": [
    "origin",
    "channel",
    "metAt",
    "jobRole",
    "company",
    "zone",
    "linkedinUrl",
    "email",
    "phone",
    "actionsCount",
    "notes",
  ],
  "stand-by": [
    "interest",
    "score",
    "origin",
    "channel",
    "metAt",
    "jobRole",
    "company",
    "zone",
    "actionsCount",
    "notes",
  ],
  all: ALL_LEAD_COLUMNS.flatMap((key) =>
    key === "actionsCount" ? [key, "interviewsCount" as const, "retentionEnd" as const] : [key],
  ),
}

export function leadSkeletonWidths(view: LeadView): readonly number[] {
  return skeletonWidths(LEAD_COLUMN_WIDTHS, ["name"], LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS[view])
}

export const CONTACT_COLUMN_WIDTHS = {
  name: 200,
  types: 190,
  company: 180,
  status: 130,
  lastInteractionAt: 170,
  zone: 140,
  email: 200,
  phone: 140,
  linkedinUrl: 170,
  reviewAt: 180,
  notes: 220,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type ContactColumnKey = keyof typeof CONTACT_COLUMN_WIDTHS

export const CONTACT_DEFAULT_VISIBLE_COLUMNS: readonly ContactColumnKey[] = [
  "types",
  "company",
  "status",
  "lastInteractionAt",
  "zone",
  "email",
  "linkedinUrl",
  "notes",
]

export function contactSkeletonWidths(): readonly number[] {
  return skeletonWidths(CONTACT_COLUMN_WIDTHS, ["name"], CONTACT_DEFAULT_VISIBLE_COLUMNS)
}

export const ACTION_COLUMN_WIDTHS = {
  title: 240,
  channel: 160,
  status: 120,
  occurredAt: 150,
  person: 210,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type ActionColumnKey = keyof typeof ACTION_COLUMN_WIDTHS

export const ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<ActionView, readonly ActionColumnKey[]> = {
  "a-faire": ["channel", "occurredAt", "person"],
  connexions: ["occurredAt", "person"],
  discussions: ["channel", "occurredAt", "person"],
  candidatures: ["occurredAt", "person"],
  journal: ["channel", "status", "occurredAt", "person"],
}

export function actionSkeletonWidths(view: ActionView): readonly number[] {
  return skeletonWidths(ACTION_COLUMN_WIDTHS, ["title"], ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS[view])
}

export const OPPORTUNITY_COLUMN_WIDTHS = {
  title: 220,
  status: 130,
  referrer: 180,
  intermediary: 180,
  client: 180,
  dailyRate: 90,
  contract: 120,
  workMode: 120,
  rhythm: 170,
  zone: 160,
  startMonth: 130,
  duration: 100,
  notes: 220,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type OpportunityColumnKey = keyof typeof OPPORTUNITY_COLUMN_WIDTHS

export const OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<
  OpportunityView,
  readonly OpportunityColumnKey[]
> = {
  "en-cours": ["status", "intermediary", "client", "dailyRate", "workMode", "rhythm", "startMonth"],
  acceptees: [
    "intermediary",
    "client",
    "dailyRate",
    "contract",
    "rhythm",
    "startMonth",
    "duration",
  ],
  all: [
    "status",
    "referrer",
    "intermediary",
    "client",
    "dailyRate",
    "contract",
    "workMode",
    "rhythm",
    "zone",
    "startMonth",
    "duration",
    "notes",
  ],
}

export function opportunitySkeletonWidths(view: OpportunityView): readonly number[] {
  return skeletonWidths(
    OPPORTUNITY_COLUMN_WIDTHS,
    ["title"],
    OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
  )
}

export const OPPORTUNITY_PAGE_SKELETON: string[] = [
  "h-[24px]",
  "h-[200px]",
  "h-[220px]",
  "h-[320px]",
]

export const INTERVIEW_COLUMN_WIDTHS = {
  title: 210,
  opportunity: 200,
  side: 180,
  scheduledAt: 150,
  type: 140,
  status: 110,
  outcome: 110,
  zone: 150,
  workMode: 120,
  dailyRate: 90,
  score: 90,
  decision: 210,
  correspondents: 200,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type InterviewColumnKey = keyof typeof INTERVIEW_COLUMN_WIDTHS

// À venir masque Statut, toujours Planifié dans cette vue, et Issue, Score et Décision, qui n'existent
// qu'une fois l'entretien fait. Journal, la vue complète, montre toutes ses colonnes (arbitrage « Colonnes par vue »).
export const INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<
  InterviewView,
  readonly InterviewColumnKey[]
> = {
  "a-venir": [
    "opportunity",
    "side",
    "scheduledAt",
    "type",
    "zone",
    "workMode",
    "dailyRate",
    "correspondents",
  ],
  journal: [
    "opportunity",
    "side",
    "scheduledAt",
    "type",
    "status",
    "outcome",
    "zone",
    "workMode",
    "dailyRate",
    "score",
    "decision",
    "correspondents",
  ],
}

export function interviewSkeletonWidths(view: InterviewView): readonly number[] {
  return skeletonWidths(
    INTERVIEW_COLUMN_WIDTHS,
    ["title"],
    INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
  )
}

export const INTERVIEW_PAGE_SKELETON: string[] = ["h-[24px]", "h-[180px]", "h-[260px]", "h-[320px]"]

export const REVIEW_COLUMN_WIDTHS = {
  // Libellé le plus long : « S53 · Semaine du 28/12/2026 ».
  week: 240,
  friday: 110,
  connectionsSent: 180,
  connectionsAccepted: 190,
  acceptanceRate: 150,
  messagesSent: 160,
  conversationsEngaged: 210,
  responseRate: 130,
  meetingsBooked: 140,
  meetingConversion: 150,
  interviewsHeld: 110,
  activeLeads: 120,
  status: 110,
  motivation: 110,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type ReviewColumnKey = keyof typeof REVIEW_COLUMN_WIDTHS

const REVIEW_REVUE_COLUMNS: readonly ReviewColumnKey[] = [
  "friday",
  "connectionsSent",
  "connectionsAccepted",
  "acceptanceRate",
  "messagesSent",
  "responseRate",
  "meetingsBooked",
  "activeLeads",
  "status",
  "motivation",
]

export const REVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<ReviewView, readonly ReviewColumnKey[]> = {
  revue: REVIEW_REVUE_COLUMNS,
  // Calendrier n'a pas de table : son squelette de chargement reprend les colonnes de Revue.
  calendrier: REVIEW_REVUE_COLUMNS,
  journal: [
    "friday",
    "connectionsSent",
    "connectionsAccepted",
    "acceptanceRate",
    "messagesSent",
    "conversationsEngaged",
    "responseRate",
    "meetingsBooked",
    "meetingConversion",
    "interviewsHeld",
    "activeLeads",
    "status",
    "motivation",
  ],
}

export function reviewSkeletonWidths(view: ReviewView): readonly number[] {
  return skeletonWidths(REVIEW_COLUMN_WIDTHS, ["week"], REVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS[view])
}
