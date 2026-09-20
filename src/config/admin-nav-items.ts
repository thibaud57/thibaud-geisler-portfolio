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
      { label: "Projets", icon: FolderKanban, href: "/admin/projets" },
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
          { label: "Toutes", href: "/admin/entreprises" },
          { label: "Travaillées", href: "/admin/entreprises/travaillees" },
          { label: "Recrutement" },
          { label: "Prospects" },
        ],
      },
      { label: "Leads", icon: UserPlus },
      { label: "Actions prospection", icon: Send },
      { label: "Revues hebdo", icon: CalendarClock },
      { label: "Entretiens", icon: MessageCircle },
      { label: "Contacts", icon: User },
    ],
  },
  {
    label: "Contenu",
    items: [{ label: "Publications", icon: LinkedinIcon }],
  },
  {
    label: "Suivi mission",
    // La maquette génère une entrée par mission cliente active (donnée hors du schéma actuel) :
    // représentée ici par une entrée générique unique, désactivée comme le reste du groupe.
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

export function isAdminNavItemActive(pathname: string, href: string) {
  // "/admin" (Accueil) est un préfixe de toute route admin : un match préfixe l'allumerait partout.
  if (href === "/admin") return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export const ADMIN_NAV_QUICK_LINKS: readonly (AdminNavItem & { href: Route })[] =
  ADMIN_NAV_GROUPS.filter((group) => group.label)
    .flatMap((group) => group.items)
    .filter((item): item is AdminNavItem & { href: Route } => Boolean(item.href))
