import { useCallback, useMemo, useState, type ReactNode } from "react"

import { DetailDialog, type DetailContent } from "@/components/features/admin/detail/DetailDialog"

interface Options<T extends { id: string }> {
  rows: readonly T[]
  initialDetailId?: string
  // À mémoïser par l'appelant : le contenu n'est reconstruit que si `build` change. `open` permet de naviguer d'une fiche à une autre sans quitter la modale.
  build: (row: T, open: (row: T) => void) => DetailContent | null
  onClose?: () => void
}

export function useRowDetail<T extends { id: string }>({
  rows,
  initialDetailId,
  build,
  onClose,
}: Options<T>) {
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    rows.some((row) => row.id === initialDetailId) ? (initialDetailId ?? null) : null,
  )

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  )

  // Ligne disparue après une revalidation : l'id est lâché pour qu'une réapparition ne rouvre pas le détail.
  if (selectedId !== null && selected === null) setSelectedId(null)

  const open = useCallback((row: T) => {
    setSelectedId(row.id)
  }, [])

  const detail = useMemo(() => (selected ? build(selected, open) : null), [selected, build, open])

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) return
      setSelectedId(null)
      onClose?.()
    },
    [onClose],
  )

  const dialog: ReactNode = <DetailDialog detail={detail} onOpenChange={handleOpenChange} />

  return { open, dialog }
}
