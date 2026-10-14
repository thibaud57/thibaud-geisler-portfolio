import type { Route } from "next"
import type { ComponentType } from "react"
import {
  Briefcase,
  Building2,
  CalendarClock,
  ChartLine,
  ChartPie,
  Coins,
  Columns3,
  Folder,
  FolderKanban,
  Handshake,
  House,
  ImageIcon,
  Landmark,
  MessageCircle,
  ReceiptEuro,
  Search,
  Send,
  ShieldCheck,
  Tags,
  User,
  UserPlus,
  Wallet,
} from "lucide-react"

import {
  ADMIN_CONTACTS_PATH,
  ADMIN_INTERVIEWS_PATH,
  ADMIN_OPPORTUNITIES_PATH,
  ADMIN_WEEKLY_REVIEWS_PATH,
} from "@/lib/admin/routes"
import { LinkedinIcon } from "@/lib/icons"

// LinkedinIcon (src/lib/icons.tsx) n'est pas un LucideIcon (Simple Icons a retiré ce logo) : type
// large pour accepter aussi bien les icônes Lucide que ce composant SVG maison.
type NavIcon = ComponentType<{ className?: string }>

export interface AdminNavSubItem {
  label: string
  href?: Route
}

export interface AdminNavItem {
  label: string
  icon: NavIcon
  href?: Route
  subItems?: readonly AdminNavSubItem[]
}

export interface AdminNavGroup {
  label?: string
  items: readonly AdminNavItem[]
}

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  { items: [{ label: "Accueil", icon: House, href: "/admin" }] },
  {
    label: "Portfolio",
    items: [
      {
        label: "Projets",
        icon: FolderKanban,
        href: "/admin/projets",
        subItems: [
          { label: "Clients", href: "/admin/projets/client" },
          { label: "Perso", href: "/admin/projets/perso" },
          { label: "Tous", href: "/admin/projets" },
        ],
      },
      { label: "Tags", icon: Tags, href: "/admin/tags" },
      { label: "Assets", icon: ImageIcon, href: "/admin/assets" },
    ],
  },
  {
    label: "Documents",
    items: [
      { label: "Bibliothèque", icon: Folder },
      { label: "Recherche", icon: Search },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        label: "Entreprises",
        icon: Building2,
        href: "/admin/entreprises",
        subItems: [
          { label: "Travaillées", href: "/admin/entreprises/travaillees" },
          { label: "Recrutement", href: "/admin/entreprises/recrutement" },
          { label: "Prospects", href: "/admin/entreprises/prospects" },
          { label: "Toutes", href: "/admin/entreprises" },
        ],
      },
      {
        label: "Leads",
        icon: UserPlus,
        href: "/admin/leads",
        subItems: [
          { label: "En cours", href: "/admin/leads/en-cours" },
          { label: "Chauds", href: "/admin/leads/chauds" },
          { label: "À qualifier", href: "/admin/leads/a-qualifier" },
          { label: "Stand-by", href: "/admin/leads/stand-by" },
          { label: "Tous", href: "/admin/leads" },
        ],
      },
      {
        label: "Actions prospection",
        icon: Send,
        href: "/admin/actions-prospection",
        subItems: [
          { label: "À faire", href: "/admin/actions-prospection/a-faire" },
          { label: "Connexions", href: "/admin/actions-prospection/connexions" },
          { label: "Discussions", href: "/admin/actions-prospection/discussions" },
          { label: "Candidatures", href: "/admin/actions-prospection/candidatures" },
          { label: "Pipeline", href: "/admin/actions-prospection/pipeline" },
          { label: "Calendrier", href: "/admin/actions-prospection/calendrier" },
          { label: "Journal", href: "/admin/actions-prospection" },
        ],
      },
      {
        label: "Revues hebdo",
        icon: CalendarClock,
        href: ADMIN_WEEKLY_REVIEWS_PATH,
        subItems: [
          { label: "Revue", href: "/admin/revues-hebdo/revue" },
          { label: "Calendrier", href: "/admin/revues-hebdo/calendrier" },
          { label: "Journal", href: ADMIN_WEEKLY_REVIEWS_PATH },
        ],
      },
      {
        label: "Opportunités",
        icon: Handshake,
        href: ADMIN_OPPORTUNITIES_PATH,
        subItems: [
          { label: "En cours", href: "/admin/opportunites/en-cours" },
          { label: "Acceptées", href: "/admin/opportunites/acceptees" },
          { label: "Toutes", href: ADMIN_OPPORTUNITIES_PATH },
        ],
      },
      {
        label: "Entretiens",
        icon: MessageCircle,
        href: ADMIN_INTERVIEWS_PATH,
        subItems: [
          { label: "À venir", href: "/admin/entretiens/a-venir" },
          { label: "Journal", href: ADMIN_INTERVIEWS_PATH },
        ],
      },
      { label: "Contacts", icon: User, href: ADMIN_CONTACTS_PATH },
    ],
  },
  {
    label: "Contenu",
    items: [{ label: "Publications", icon: LinkedinIcon }],
  },
  {
    label: "Suivi mission",
    // Une entrée par mission cliente demanderait une donnée absente du schéma :
    // d'où une entrée générique unique, désactivée comme le reste du groupe.
    items: [{ label: "Missions", icon: Briefcase }],
  },
  {
    label: "Comptabilité",
    items: [
      { label: "Facturation", icon: ReceiptEuro },
      { label: "Déclarations", icon: Landmark },
    ],
  },
  {
    label: "Finances",
    items: [
      { label: "Trésorerie", icon: Wallet },
      { label: "Prévisionnel", icon: ChartLine },
      { label: "Budget", icon: Coins },
      { label: "Investissement", icon: ChartPie },
    ],
  },
  {
    label: "Dev",
    items: [
      { label: "Kanban", icon: Columns3 },
      { label: "Audits", icon: ShieldCheck },
    ],
  },
]

// La première sous-entrée est la vue d'arrivée : la racine reste la vue complète, seule cible des liens ?detail=.
export function entryHref({
  href,
  subItems,
}: Pick<AdminNavItem, "subItems"> & { href: Route }): Route {
  return subItems?.[0]?.href ?? href
}

export function isAdminNavItemActive(pathname: string, href: string) {
  // "/admin" (Accueil) est un préfixe de toute route admin : un match préfixe l'allumerait partout.
  if (href === "/admin") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export const ADMIN_NAV_QUICK_LINKS: readonly (AdminNavItem & { href: Route })[] =
  ADMIN_NAV_GROUPS.filter((group) => group.label)
    .flatMap((group) => group.items)
    .filter((item): item is AdminNavItem & { href: Route } => Boolean(item.href))
