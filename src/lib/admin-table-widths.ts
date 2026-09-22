// Largeurs de colonnes (px) des écrans de liste admin. Module sans "use client" : importable à la
// fois par les tables clientes (DataTable applique ces nombres aux <th>) et par les pages serveur
// (DataTableSkeleton, fallback de <Suspense>, en a besoin pour annoncer le nombre et la largeur de
// colonnes réels). Une seule source évite que le squelette dérive silencieusement de la table.

export const ORDER_COLUMN_WIDTH = 52

export const TAG_COLUMN_WIDTHS = {
  name: 280,
  nameEn: 210,
  kind: 110,
  icon: 170,
  usage: 84,
  actions: 76,
} as const

export const TAG_SKELETON_WIDTHS: readonly number[] = [
  ORDER_COLUMN_WIDTH,
  ...Object.values(TAG_COLUMN_WIDTHS),
]

export const COMPANY_COLUMN_WIDTHS = {
  logo: 44,
  name: 211,
  sectors: 179,
  size: 96,
  legalEntity: 160,
  websiteUrl: 150,
  projects: 96,
  actions: 88,
} as const

export const COMPANY_SKELETON_WIDTHS: readonly number[] = Object.values(COMPANY_COLUMN_WIDTHS)

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
  actions: 88,
} as const

export type ProjectColumnKey = keyof typeof PROJECT_COLUMN_WIDTHS

export type ProjectView = "tous" | "client" | "perso"

// Colonnes masquables visibles par défaut par vue (arbitrage "Colonnes par vue"). Source unique
// lue par ProjectsTable (defaultVisible de chaque colonne) et par projectSkeletonWidths ci-dessous :
// sans elle, le squelette annoncerait une vue qui n'arrive pas.
export const PROJECT_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<
  ProjectView,
  readonly ProjectColumnKey[]
> = {
  tous: [
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
  client: ["nature", "formats", "entreprise", "debut", "duree", "statut"],
  perso: ["formats", "debut", "fin", "liens", "statut"],
}

export function projectSkeletonWidths(view: ProjectView): readonly number[] {
  const keys: readonly ProjectColumnKey[] = [
    "titre",
    ...PROJECT_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
    "actions",
  ]
  return [ORDER_COLUMN_WIDTH, ...keys.map((key) => PROJECT_COLUMN_WIDTHS[key])]
}
