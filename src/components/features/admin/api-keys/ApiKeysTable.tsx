"use client"

import { KeyRound } from "lucide-react"

import { HEADER_BADGE_PROPS } from "@/components/features/admin/display/badges"
import { DataTable, type Column } from "@/components/features/admin/table/DataTable"
import { TitleCell } from "@/components/features/admin/table/TitleCell"
import { actionsColumn } from "@/components/features/admin/table/table-cells"
import { DeleteApiKeyDialog } from "@/components/features/admin/api-keys/DeleteApiKeyDialog"
import {
  API_KEY_EXPIRY_LABELS,
  API_KEY_FIELD_LABELS,
  API_KEY_NEVER_USED_LABEL,
  apiKeyDisplayName,
} from "@/components/features/admin/api-keys/api-key-labels"
import { API_KEY_COLUMN_WIDTHS } from "@/components/features/admin/api-keys/api-key-table-widths"
import { Badge } from "@/components/ui/badge"
import { formatShortDateTime, formatShortInstantDate } from "@/lib/date-time"
import { MCP_DOMAIN_LABELS } from "@/lib/mcp-domains"
import type { AdminApiKey } from "@/server/queries/api-keys"

const columns: readonly Column<AdminApiKey>[] = [
  {
    key: "name",
    header: API_KEY_FIELD_LABELS.name,
    width: API_KEY_COLUMN_WIDTHS.name,
    sortValue: apiKeyDisplayName,
    searchValue: (apiKey) => `${apiKey.name ?? ""} ${apiKey.start ?? ""}`,
    cell: (apiKey) => (
      <TitleCell
        title={apiKeyDisplayName(apiKey)}
        subtitle={apiKey.start === null ? null : `${apiKey.start}…`}
        mono
      />
    ),
  },
  {
    key: "domains",
    header: API_KEY_FIELD_LABELS.domains,
    width: API_KEY_COLUMN_WIDTHS.domains,
    cell: (apiKey) => (
      <span className="inline-flex gap-1">
        {apiKey.domains.map((domain) => (
          <Badge key={domain} {...HEADER_BADGE_PROPS}>
            {MCP_DOMAIN_LABELS[domain]}
          </Badge>
        ))}
      </span>
    ),
  },
  {
    key: "createdAt",
    header: API_KEY_FIELD_LABELS.createdAt,
    width: API_KEY_COLUMN_WIDTHS.createdAt,
    className: "tabular-nums",
    sortValue: (apiKey) => apiKey.createdAt.getTime(),
    cell: (apiKey) => formatShortInstantDate(apiKey.createdAt),
  },
  {
    key: "lastRequest",
    header: API_KEY_FIELD_LABELS.lastRequest,
    width: API_KEY_COLUMN_WIDTHS.lastRequest,
    className: "tabular-nums text-muted-foreground",
    cell: (apiKey) =>
      apiKey.lastRequest ? formatShortDateTime(apiKey.lastRequest) : API_KEY_NEVER_USED_LABEL,
  },
  {
    key: "expiresAt",
    header: API_KEY_FIELD_LABELS.expiresAt,
    width: API_KEY_COLUMN_WIDTHS.expiresAt,
    className: "tabular-nums",
    cell: (apiKey) =>
      apiKey.expiresAt ? formatShortInstantDate(apiKey.expiresAt) : API_KEY_EXPIRY_LABELS.none,
  },
  actionsColumn<AdminApiKey>((apiKey) => <DeleteApiKeyDialog apiKey={apiKey} />),
]

interface Props {
  apiKeys: readonly AdminApiKey[]
}

export function ApiKeysTable({ apiKeys }: Props) {
  return (
    <DataTable
      rows={apiKeys}
      columns={columns}
      getRowId={(apiKey) => apiKey.id}
      searchPlaceholder="Rechercher un nom"
      noun="clé"
      rowLabel={apiKeyDisplayName}
      empty={{
        icon: KeyRound,
        title: "Aucune clé",
        description: "Aucune clé pour le moment. Créez-en une par usage via le bouton ci-dessus.",
      }}
    />
  )
}
