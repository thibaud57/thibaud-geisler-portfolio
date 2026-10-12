import {
  CircleCheck,
  ClipboardList,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Reply,
  Target,
  UserPlus,
  VolumeX,
} from "lucide-react"

import type { ActionChannel, ActionStatus } from "@/generated/prisma/client"
import { formatShortDateTime } from "@/lib/date-time"
import type { IconComponent } from "@/lib/icons"

export const ACTION_CHANNEL_LABELS: Record<ActionChannel, string> = {
  CANDIDATURE: "Candidature",
  CONNEXION_LINKEDIN: "Connexion LinkedIn",
  DM_LINKEDIN: "DM LinkedIn",
  EMAIL: "Email",
  SMS_WHATSAPP: "SMS/WhatsApp",
  CALL: "Call",
  AUTRE: "Autre",
}

// Candidature et Autre sans glyphe : non décidés par le propriétaire pour ce canal.
export const ACTION_CHANNEL_ICONS: Record<ActionChannel, IconComponent | null> = {
  CANDIDATURE: null,
  CONNEXION_LINKEDIN: UserPlus,
  DM_LINKEDIN: MessageSquare,
  EMAIL: Mail,
  SMS_WHATSAPP: MessageCircle,
  CALL: Phone,
  AUTRE: null,
}

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  A_FAIRE: "À faire",
  FAIT: "Fait",
  REPONDU: "Répondu",
  CONVERTI: "Converti",
  IGNORE: "Ignoré",
}

export const ACTION_STATUS_ICONS: Record<ActionStatus, IconComponent | null> = {
  A_FAIRE: ClipboardList,
  FAIT: CircleCheck,
  REPONDU: Reply,
  CONVERTI: Target,
  IGNORE: VolumeX,
}

export function toActionLink(action: {
  id: string
  title: string
  channel: ActionChannel
  status: ActionStatus
  occurredAt: Date
}) {
  return {
    id: action.id,
    label: action.title,
    meta: `${ACTION_CHANNEL_LABELS[action.channel]} · ${ACTION_STATUS_LABELS[action.status]}`,
    trailing: formatShortDateTime(action.occurredAt),
  }
}

export const PROSPECTING_ACTION_SECTION_TITLES = {
  action: "Action",
} as const

// personId parle de « Personne » ici : le formulaire choisit une personne, pas un rôle.
export const PROSPECTING_ACTION_FIELD_LABELS = {
  title: "Action",
  personId: "Personne",
  channel: "Type",
  status: "Statut",
  occurredAt: "Date et heure",
  message: "Message",
  respondedAt: "Réponse reçue le",
  period: "Période",
} as const
