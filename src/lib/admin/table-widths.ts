// Module sans "use client" : partagé entre les tables clientes (DataTable) et les pages serveur
// (DataTableSkeleton), pour que le squelette ne dérive jamais silencieusement de la table.

import type { ActionView } from "@/lib/crm/action-views"
import type { CompanyView } from "@/lib/crm/company-views"
import type { InterviewView } from "@/lib/crm/interview-views"
import type { LeadView } from "@/lib/crm/lead-views"
import type { OpportunityView } from "@/lib/crm/opportunity-views"
import type { ReviewView } from "@/lib/crm/review-views"
import type { ProjectView } from "@/lib/project-views"

export const ORDER_COLUMN_WIDTH = 40

// Une seule largeur pour toutes les listes : l'en-tête « Actions » (74 px) dépasse ses deux boutons (64 px).
export const ACTIONS_COLUMN_WIDTH = 80

function skeletonWidths<K extends string>(
  widths: Record<K | "actions", number>,
  leadKeys: readonly K[],
  visible: readonly K[],
): readonly number[] {
  return [...leadKeys, ...visible, "actions" as const].map((key) => widths[key])
}

export const TAG_COLUMN_WIDTHS = {
  name: 120,
  nameEn: 112,
  kind: 120,
  icon: 232,
  usage: 96,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export const TAG_SKELETON_WIDTHS: readonly number[] = [
  ORDER_COLUMN_WIDTH,
  ...Object.values(TAG_COLUMN_WIDTHS),
]

export const COMPANY_COLUMN_WIDTHS = {
  name: 192,
  types: 160,
  sectors: 192,
  zones: 104,
  size: 128,
  relationStatus: 112,
  worked: 80,
  firstContactAt: 104,
  endClients: 120,
  legalEntity: 152,
  websiteUrl: 168,
  notes: 224,
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
  return skeletonWidths(COMPANY_COLUMN_WIDTHS, ["name"], COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS[view])
}

export const PROJECT_COLUMN_WIDTHS = {
  titre: 280,
  nature: 80,
  formats: 120,
  entreprise: 144,
  contrat: 112,
  debut: 104,
  fin: 104,
  duree: 104,
  equipe: 72,
  liens: 120,
  statut: 72,
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

// Colonnes communes aux personnes, leads et contacts : une même donnée, une même largeur dans chaque liste.
const PERSON_COLUMN_WIDTHS = {
  name: 208,
  zone: 104,
  linkedinUrl: 168,
  email: 168,
  phone: 168,
  notes: 224,
} as const

export const LEAD_COLUMN_WIDTHS = {
  ...PERSON_COLUMN_WIDTHS,
  status: 112,
  interest: 88,
  score: 88,
  origin: 112,
  channel: 120,
  metAt: 112,
  jobRole: 120,
  actionsCount: 96,
  interviewsCount: 112,
  retentionEnd: 112,
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
  ...PERSON_COLUMN_WIDTHS,
  types: 128,
  status: 88,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type ContactColumnKey = keyof typeof CONTACT_COLUMN_WIDTHS

export const CONTACT_DEFAULT_VISIBLE_COLUMNS: readonly ContactColumnKey[] = [
  "types",
  "status",
  "zone",
  "email",
  "linkedinUrl",
  "notes",
]

export function contactSkeletonWidths(): readonly number[] {
  return skeletonWidths(CONTACT_COLUMN_WIDTHS, ["name"], CONTACT_DEFAULT_VISIBLE_COLUMNS)
}

export const ACTION_COLUMN_WIDTHS = {
  title: 280,
  channel: 160,
  status: 104,
  occurredAt: 104,
  person: 184,
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
  title: 224,
  status: 128,
  referrer: 136,
  intermediary: 176,
  client: 144,
  dailyRate: 80,
  contract: 112,
  workMode: 96,
  rhythm: 128,
  zone: 104,
  startMonth: 120,
  duration: 88,
  notes: 224,
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
  title: 216,
  opportunity: 200,
  side: 144,
  scheduledAt: 152,
  type: 144,
  format: 80,
  status: 72,
  outcome: 112,
  zone: 104,
  workMode: 96,
  dailyRate: 80,
  score: 88,
  decision: 152,
  correspondents: 152,
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
    "format",
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
    "format",
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
  // Libellé le plus long : « S53 · 2026 », sous l'en-tête Semaine et son icône de tri.
  week: 104,
  friday: 112,
  connectionsSent: 120,
  connectionsAccepted: 120,
  acceptanceRate: 128,
  messagesSent: 112,
  conversationsEngaged: 136,
  responseRate: 104,
  meetingsBooked: 120,
  meetingConversion: 120,
  interviewsHeld: 112,
  activeLeads: 88,
  status: 104,
  motivation: 96,
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
