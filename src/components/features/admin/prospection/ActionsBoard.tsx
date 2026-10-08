"use client"

import { startTransition, useMemo, useState } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"

import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { EmptyState } from "@/components/features/admin/EmptyState"
import { EnumSelectItems } from "@/components/features/admin/EnumSelectItems"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import {
  buildActionDetail,
  channelBadge,
} from "@/components/features/admin/prospection/action-detail"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospection/ProspectingActionFormDialog"
import {
  Kanban,
  KanbanBoard,
  KanbanColumn,
  KanbanColumnContent,
  KanbanItem,
  KanbanItemHandle,
  KanbanOverlay,
  type KanbanCommitMeta,
} from "@/components/reui/kanban"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ActionStatus } from "@/generated/prisma/client"
import {
  BOARD_PERIOD_LABELS,
  BOARD_PERIOD_VALUES,
  BOARD_STATUSES,
  actionsInPeriod,
  boardColumns,
  isBoardPeriod,
  statusMoveFrom,
  type BoardPeriod,
} from "@/lib/action-board"
import { rankActions } from "@/lib/action-rank"
import { formatShortInstantDate, formatShortInstantTime } from "@/lib/date-time"
import { personDisplayName } from "@/lib/persons"
import { ACTION_STATUS_ICONS, ACTION_STATUS_LABELS } from "@/lib/prospecting-actions"
import { LABEL_CLASS } from "@/lib/typography"
import { cn } from "@/lib/utils"
import { changeProspectingActionStatus } from "@/server/actions/prospecting-actions"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

type BoardValue = Record<string, AdminProspectingAction[]>

interface DragState {
  id: string
  origin: ActionStatus | undefined
}

const COLUMN_ICON_CLASSES: Record<ActionStatus, string> = {
  A_FAIRE: "text-muted-foreground",
  FAIT: "text-info",
  REPONDU: "text-success",
  CONVERTI: "text-primary",
  IGNORE: "text-destructive",
}

const DRAG_INSTRUCTIONS =
  "Entrée ou Espace ouvre le détail de l'action, d'où son statut se modifie. À la souris ou au toucher, glisser la carte vers une autre colonne change son statut."

function getActionId(action: AdminProspectingAction): string {
  return action.id
}

function columnHolding(columns: BoardValue, id: string): ActionStatus | undefined {
  return BOARD_STATUSES.find((status) => columns[status]?.some((action) => action.id === id))
}

function BoardCard({
  action,
  onOpen,
}: {
  action: AdminProspectingAction
  onOpen: (action: AdminProspectingAction) => void
}) {
  return (
    <KanbanItem
      value={action.id}
      className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      // Un appui qui ne parcourt pas 10px reste un clic : le capteur souris du Kanban n'active le glisser qu'au-delà.
      onClick={() => {
        onOpen(action)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpen(action)
        }
      }}
    >
      <KanbanItemHandle>
        <Card size="sm">
          <CardContent className="flex flex-col gap-2.5">
            <span className="text-sm font-medium">{action.title}</span>
            <span className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <TruncateTooltip className="min-w-0">
                {personDisplayName(action.person)}
              </TruncateTooltip>
              <time dateTime={action.occurredAt.toISOString()} className="shrink-0 tabular-nums">
                {formatShortInstantDate(action.occurredAt)} ·{" "}
                {formatShortInstantTime(action.occurredAt)}
              </time>
            </span>
            {channelBadge(action, "self-start")}
          </CardContent>
        </Card>
      </KanbanItemHandle>
    </KanbanItem>
  )
}

function BoardColumn({
  status,
  actions,
  isDropTarget,
  onOpen,
}: {
  status: ActionStatus
  actions: readonly AdminProspectingAction[]
  isDropTarget: boolean
  onOpen: (action: AdminProspectingAction) => void
}) {
  const Icon = ACTION_STATUS_ICONS[status]

  return (
    <KanbanColumn value={status} className="min-h-0 min-w-0">
      <Card
        className={cn(
          "min-h-0 flex-1",
          isDropTarget && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2">
            {Icon ? (
              <Icon aria-hidden className={cn("size-4 shrink-0", COLUMN_ICON_CLASSES[status])} />
            ) : null}
            <span className={cn(LABEL_CLASS, "text-xs whitespace-nowrap")}>
              {ACTION_STATUS_LABELS[status]}
            </span>
          </span>
          <Badge variant="outline">{actions.length}</Badge>
        </CardHeader>
        {/* Les cartes défilent dans leur colonne, le py-1 gardant entier l'anneau de focus de la première et de la dernière. */}
        <CardContent className="no-scrollbar min-h-0 flex-1 overflow-y-auto py-1">
          <KanbanColumnContent value={status} className="gap-2.5">
            {actions.map((action) => (
              <BoardCard key={action.id} action={action} onOpen={onOpen} />
            ))}
          </KanbanColumnContent>
        </CardContent>
      </Card>
    </KanbanColumn>
  )
}

interface Props {
  actions: readonly AdminProspectingAction[]
  personOptions: readonly PersonOption[]
}

export function ActionsBoard({ actions, personOptions }: Props) {
  // Instant figé au montage : le filtre Période reste stable pendant la consultation.
  const [now] = useState(() => Date.now())
  const [period, setPeriod] = useState<BoardPeriod>("tout")
  const columnsFor = (rows: readonly AdminProspectingAction[], shown: BoardPeriod): BoardValue =>
    boardColumns(actionsInPeriod(rows, shown, now))
  const [syncedActions, setSyncedActions] = useState<readonly AdminProspectingAction[] | null>(
    actions,
  )
  const [columns, setColumns] = useState<BoardValue>(() => columnsFor(actions, period))
  const [drag, setDrag] = useState<DragState | null>(null)
  const [selectedAction, setSelectedAction] = useState<AdminProspectingAction | null>(null)
  const [editingAction, setEditingAction] = useState<AdminProspectingAction | null>(null)

  // Nouvelle lecture du serveur (revalidation après une écriture) : le tableau s'y réaligne pendant le rendu plutôt que par un effet qui peindrait d'abord l'état périmé.
  if (actions !== syncedActions) {
    setSyncedActions(actions)
    setColumns(columnsFor(actions, period))
  }

  // Le rang se calcule sur toutes les actions, jamais sur la seule période affichée ; seule la vue détail le lit.
  const detail = useMemo<DetailContent | null>(
    () =>
      selectedAction
        ? buildActionDetail(
            selectedAction,
            rankActions(actions).get(selectedAction.id) ?? 0,
            () => {
              setEditingAction(selectedAction)
            },
          )
        : null,
    [selectedAction, actions],
  )

  // L'aperçu direct du Kanban déplace la carte pendant le geste : la colonne qui la porte est la cible.
  const dropTarget = drag ? columnHolding(columns, drag.id) : undefined
  const highlightedStatus = dropTarget !== drag?.origin ? dropTarget : undefined

  function handlePeriodChange(value: string) {
    if (!isBoardPeriod(value)) return
    setPeriod(value)
    setColumns(columnsFor(actions, value))
  }

  function clearDrag() {
    setDrag(null)
  }

  function handleCommit(_value: BoardValue, meta: KanbanCommitMeta<AdminProspectingAction>) {
    const move = statusMoveFrom(meta)
    if (!move) return
    startTransition(async () => {
      // Un rejet (réseau coupé, redéploiement) laisserait la carte dans une colonne que la base ignore : il suit le chemin d'échec.
      const result = await changeProspectingActionStatus(move.id, move.status).catch(() => null)
      if (!result?.ok) {
        // Réaligné sur la dernière lecture du serveur, pas sur l'instantané du geste : un autre déplacement enregistré entre-temps et la période choisie restent.
        setSyncedActions(null)
        toast.error("Une erreur est survenue, réessayez")
      }
    })
  }

  if (actions.length === 0) {
    return (
      <EmptyState
        icon={Send}
        title="Aucune action"
        description="Aucune action pour le moment. Créez-en une via le bouton ci-dessus."
        // Bordure pleine des surfaces admin, pas le border-dashed du registry.
        className="border border-solid"
      />
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Select value={period} onValueChange={handlePeriodChange}>
        <SelectTrigger className="w-45" aria-label="Période">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <EnumSelectItems values={BOARD_PERIOD_VALUES} labels={BOARD_PERIOD_LABELS} />
        </SelectContent>
      </Select>

      {/* Marge compensée : l'anneau de la colonne cible déborde de 3px, l'overflow le rognerait aux deux bords. */}
      <div className="-mx-1 min-h-0 flex-1 overflow-x-auto px-1 py-1">
        <Kanban
          value={columns}
          onValueChange={setColumns}
          getItemValue={getActionId}
          onValueCommit={handleCommit}
          className="h-full"
          onDragStart={(event) => {
            const id = String(event.active.id)
            setDrag({ id, origin: columnHolding(columns, id) })
          }}
          onDragEnd={clearDrag}
          onDragCancel={clearDrag}
          restoreOnCancel
          accessibility={{ screenReaderInstructions: { draggable: DRAG_INSTRUCTIONS } }}
        >
          <KanbanBoard className="h-full auto-cols-[minmax(13.75rem,1fr)] grid-flow-col sm:grid-cols-none">
            {BOARD_STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                actions={columns[status] ?? []}
                isDropTarget={status === highlightedStatus}
                onOpen={setSelectedAction}
              />
            ))}
          </KanbanBoard>
          <KanbanOverlay className="rounded-xl border-2 border-dashed bg-muted/10" />
        </Kanban>
      </div>

      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedAction(null)
        }}
      />
      {editingAction ? (
        <ProspectingActionFormDialog
          key={editingAction.id}
          action={editingAction}
          personOptions={personOptions}
          open
          onOpenChange={(open) => {
            if (!open) setEditingAction(null)
          }}
        />
      ) : null}
    </div>
  )
}
