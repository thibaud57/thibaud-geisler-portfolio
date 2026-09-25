"use client"

import {
  useActionState,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type Ref,
} from "react"
import { Pencil, Plus, Save } from "lucide-react"
import { toast } from "sonner"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { Button } from "@/components/ui/button"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { Tag, TagKind } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { TAG_ICON_KEYS, TagIcon } from "@/lib/icons"
import { normalizeForSearch } from "@/lib/search"
import { KIND_ORDER, TAG_FIELD_LABELS, TAG_KIND_LABELS, type TagCountByKind } from "@/lib/tags"
import { createTag, updateTag } from "@/server/actions/tags"
import { initialTagFormState } from "@/server/actions/tags.types"

function filterIconOption(value: string, search: string): number {
  return normalizeForSearch(value).includes(normalizeForSearch(search)) ? 1 : 0
}

const NO_ICON_OPTION = "aucune"

interface Props {
  tag: Tag | null
  counts: TagCountByKind
  // La vue détail (DetailDialog) ouvre ce même dialogue en cliquant ce bouton par ref plutôt que
  // de dupliquer sa logique d'édition : évite un second TagFormDialog contrôlé en parallèle.
  triggerRef?: Ref<HTMLButtonElement>
}

export function TagFormDialog({ tag, counts, triggerRef }: Props) {
  const [open, setOpen] = useState(false)
  const [instanceKey, setInstanceKey] = useState(0)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      // TagForm porte state (useActionState) et iconValue ; il est démonté/remonté avec cette key
      // à chaque ouverture pour repartir d'un state neuf. TagFormDialog lui-même reste monté en
      // permanence (son déclencheur doit rester cliquable), donc ne peut pas porter ce state.
      setInstanceKey((key) => key + 1)
    }
  }

  // Identité stable sur toute la durée de vie de TagFormDialog (deps [], setOpen lui-même stable) :
  // TagForm reste monté pendant l'animation de fermeture du Dialog (Presence), donc se re-render
  // avec ce callback en prop après le succès. Une closure inline serait recréée à chaque fois et
  // redéclencherait l'effet de TagForm (state.ok toujours true), doublant le toast de succès.
  const handleSaved = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {tag ? (
        <DialogTrigger asChild>
          <RowActionButton ref={triggerRef} aria-label={`Modifier ${tag.nameFr}`}>
            <Pencil className="size-4" />
          </RowActionButton>
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button>
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau tag
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-160">
        <TagForm key={instanceKey} tag={tag} counts={counts} onSaved={handleSaved} />
      </DialogContent>
    </Dialog>
  )
}

function TagForm({
  tag,
  counts,
  onSaved,
}: {
  tag: Tag | null
  counts: TagCountByKind
  onSaved: () => void
}) {
  const formId = useId()
  const [iconValue, setIconValue] = useState(tag?.icon ?? "")
  const action = tag ? updateTag.bind(null, tag.id) : createTag
  const [state, formAction, pending] = useActionState(action, initialTagFormState)

  // Contrôlés : changer de catégorie recalcule l'ordre affiché sans aller-retour serveur.
  const [kindValue, setKindValue] = useState<TagKind | "">(tag?.kind ?? "")
  const [displayOrderValue, setDisplayOrderValue] = useState(tag ? String(tag.displayOrder) : "")

  function handleKindChange(nextKind: string) {
    const kind = nextKind as TagKind
    setKindValue(kind)
    const tagKind = tag?.kind
    const tagOrder = tag?.displayOrder
    const nextOrder = kind === tagKind && tagOrder !== undefined ? tagOrder : counts[kind] + 1
    setDisplayOrderValue(String(nextOrder))
  }

  const handleSubmit = useFormActionSubmit(formAction)

  // tag ne sert qu'au libellé du toast : le lire via useEffectEvent évite de le lister en dep.
  // Son identité d'objet change à chaque refetch de la table parente (même ligne, nouvelle query
  // Prisma après revalidatePath dans updateTag), ce qui rouvrirait l'effet une seconde fois pendant
  // l'animation de fermeture du Dialog alors que state.ok est toujours true.
  const notifySaved = useEffectEvent(() => {
    toast.success(tag ? "Tag mis à jour" : "Tag créé")
  })

  useEffect(() => {
    if (state.ok === true) {
      onSaved()
      notifySaved()
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, onSaved])

  return (
    <form onSubmit={handleSubmit} noValidate className="contents">
      <DialogHeader>
        <DialogTitle>{tag ? `Modifier ${tag.nameFr}` : "Nouveau tag"}</DialogTitle>
        <DialogDescription>
          {tag
            ? "Modifier les informations de ce tag."
            : "Créer un tag pour catégoriser les projets."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={`${formId}-slug`} label={TAG_FIELD_LABELS.slug} errors={state.errors.slug}>
            <Input
              id={`${formId}-slug`}
              name="slug"
              defaultValue={tag?.slug ?? ""}
              aria-invalid={!!state.errors.slug?.length}
              aria-describedby={`${formId}-slug-error`}
              placeholder="mon-tag"
            />
          </FormField>

          <FormField
            id={`${formId}-displayOrder`}
            label={TAG_FIELD_LABELS.displayOrder}
            errors={state.errors.displayOrder}
          >
            <Input
              id={`${formId}-displayOrder`}
              name="displayOrder"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={displayOrderValue}
              onChange={(event) => {
                setDisplayOrderValue(event.target.value)
              }}
              aria-invalid={!!state.errors.displayOrder?.length}
              aria-describedby={`${formId}-displayOrder-error`}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={`${formId}-nameFr`}
            label={TAG_FIELD_LABELS.nameFr}
            errors={state.errors.nameFr}
          >
            <Input
              id={`${formId}-nameFr`}
              name="nameFr"
              defaultValue={tag?.nameFr ?? ""}
              aria-invalid={!!state.errors.nameFr?.length}
              aria-describedby={`${formId}-nameFr-error`}
            />
          </FormField>
          <FormField
            id={`${formId}-nameEn`}
            label={TAG_FIELD_LABELS.nameEn}
            errors={state.errors.nameEn}
          >
            <Input
              id={`${formId}-nameEn`}
              name="nameEn"
              defaultValue={tag?.nameEn ?? ""}
              aria-invalid={!!state.errors.nameEn?.length}
              aria-describedby={`${formId}-nameEn-error`}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={`${formId}-kind`} label={TAG_FIELD_LABELS.kind} errors={state.errors.kind}>
            <Select name="kind" value={kindValue} onValueChange={handleKindChange}>
              <SelectTrigger
                id={`${formId}-kind`}
                className="w-full"
                aria-invalid={!!state.errors.kind?.length}
                aria-describedby={`${formId}-kind-error`}
              >
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {KIND_ORDER.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {TAG_KIND_LABELS[kind]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>

          <FormField
            id={`${formId}-icon`}
            label={TAG_FIELD_LABELS.icon}
            errors={state.errors.icon}
            help="Restreinte au registre : une clé inconnue passerait sans icône, sans erreur."
          >
            <IconCombobox
              id={`${formId}-icon`}
              value={iconValue}
              onValueChange={setIconValue}
              ariaInvalid={!!state.errors.icon?.length}
              ariaDescribedby={`${formId}-icon-help ${formId}-icon-error`}
            />
            <input type="hidden" name="icon" value={iconValue} />
          </FormField>
        </div>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Annuler
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          <Save aria-hidden data-icon="inline-start" />
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  )
}

function IconCombobox({
  id,
  value,
  onValueChange,
  ariaInvalid,
  ariaDescribedby,
}: {
  id: string
  value: string
  onValueChange: (value: string) => void
  ariaInvalid: boolean
  ariaDescribedby: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <ComboboxPopover
      id={id}
      open={open}
      onOpenChange={setOpen}
      // modal : le verrou de scroll du Dialog parent annule le wheel sur ce contenu, portalisé hors
      // de lui. Seul le Popover modal monte son propre verrou, qui passe au-dessus et rend la liste
      // scrollable à la molette.
      modal
      triggerContent={
        <span className="flex min-w-0 items-center gap-2">
          {value ? (
            <>
              <TagIcon icon={value} className="size-4 shrink-0" />
              <TruncateTooltip className="font-mono text-xs">{value}</TruncateTooltip>
            </>
          ) : (
            <span className="text-muted-foreground">Aucune</span>
          )}
        </span>
      }
      ariaInvalid={ariaInvalid}
      ariaDescribedby={ariaDescribedby}
      searchPlaceholder="Chercher une icône"
      emptyMessage="Aucune icône ne correspond."
      filter={filterIconOption}
      popoverContentProps={{
        side: "bottom",
        avoidCollisions: false,
        className:
          "max-h-(--radix-popover-content-available-height) w-(--radix-popper-anchor-width) overflow-hidden p-0",
      }}
      // 3rem : la hauteur du champ de recherche, que la place annoncée par Radix inclut.
      commandListClassName="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-3rem))]"
    >
      <CommandGroup>
        <CommandItem
          value={NO_ICON_OPTION}
          data-checked={value === ""}
          onSelect={() => {
            onValueChange("")
            setOpen(false)
          }}
        >
          Aucune
        </CommandItem>
        {TAG_ICON_KEYS.map((key) => (
          <CommandItem
            key={key}
            value={key}
            data-checked={value === key}
            onSelect={() => {
              onValueChange(key)
              setOpen(false)
            }}
          >
            <TagIcon icon={key} className="size-4" />
            <TruncateTooltip className="font-mono text-xs">{key}</TruncateTooltip>
          </CommandItem>
        ))}
      </CommandGroup>
    </ComboboxPopover>
  )
}
