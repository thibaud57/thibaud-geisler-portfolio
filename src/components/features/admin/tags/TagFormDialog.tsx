"use client"

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type SubmitEvent,
  type ReactNode,
} from "react"
import { ChevronsUpDown, Pencil, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { Tag, TagKind } from "@/generated/prisma/client"
import { TAG_ICON_KEYS, TagIcon } from "@/lib/icons"
import { normalizeForSearch } from "@/lib/search"
import { KIND_ORDER, TAG_KIND_LABELS, type TagCountByKind } from "@/lib/tags"
import { createTag, updateTag } from "@/server/actions/tags"
import { initialTagFormState } from "@/server/actions/tags.types"

function filterIconOption(value: string, search: string): number {
  return normalizeForSearch(value).includes(normalizeForSearch(search)) ? 1 : 0
}

const NO_ICON_OPTION = "aucune"

interface Props {
  tag: Tag | null
  counts: TagCountByKind
}

export function TagFormDialog({ tag, counts }: Props) {
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
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                // Les deux actions d'une ligne se lisent comme une paire, pas comme deux boutons
                // séparés : d'où une largeur plus étroite que la hauteur.
                className="w-5 min-w-5"
                aria-label={`Modifier ${tag.nameFr}`}
              >
                <Pencil className="size-4" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Modifier</TooltipContent>
        </Tooltip>
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

  // onSubmit plutôt que <form action> : React réinitialise un formulaire à action après chaque envoi,
  // et Radix Select répond à ce reset en rappelant onValueChange avec sa valeur du premier rendu. La
  // catégorie et l'ordre saisis étaient effacés dès la première erreur de validation.
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => {
      formAction(formData)
    })
  }

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
          <Field id={`${formId}-slug`} label="Slug" errors={state.errors.slug}>
            <Input
              id={`${formId}-slug`}
              name="slug"
              defaultValue={tag?.slug ?? ""}
              aria-invalid={!!state.errors.slug?.length}
              aria-describedby={`${formId}-slug-error`}
              placeholder="mon-tag"
            />
          </Field>

          <Field
            id={`${formId}-displayOrder`}
            label="Ordre d'affichage"
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
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${formId}-nameFr`} label="Nom (français)" errors={state.errors.nameFr}>
            <Input
              id={`${formId}-nameFr`}
              name="nameFr"
              defaultValue={tag?.nameFr ?? ""}
              aria-invalid={!!state.errors.nameFr?.length}
              aria-describedby={`${formId}-nameFr-error`}
            />
          </Field>
          <Field id={`${formId}-nameEn`} label="Nom (anglais)" errors={state.errors.nameEn}>
            <Input
              id={`${formId}-nameEn`}
              name="nameEn"
              defaultValue={tag?.nameEn ?? ""}
              aria-invalid={!!state.errors.nameEn?.length}
              aria-describedby={`${formId}-nameEn-error`}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${formId}-kind`} label="Catégorie" errors={state.errors.kind}>
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
          </Field>

          <Field id={`${formId}-icon`} label="Icône" errors={state.errors.icon}>
            <IconCombobox
              id={`${formId}-icon`}
              value={iconValue}
              onValueChange={setIconValue}
              ariaInvalid={!!state.errors.icon?.length}
              ariaDescribedby={`${formId}-icon-error`}
            />
            <input type="hidden" name="icon" value={iconValue} />
            <p className="text-xs text-muted-foreground">
              Restreinte au registre : une clé inconnue passerait sans icône, sans erreur.
            </p>
          </Field>
        </div>
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Annuler
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
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

  // modal : le verrou de scroll du Dialog parent annule le wheel sur ce contenu, portalisé hors de
  // lui. Seul le Popover modal monte son propre verrou, qui passe au-dessus et rend la liste
  // scrollable à la molette.
  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          id={id}
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
          className="w-full justify-between font-normal"
        >
          <span className="flex min-w-0 items-center gap-2">
            {value ? (
              <>
                <TagIcon icon={value} className="size-4 shrink-0" />
                <span className="truncate font-mono text-xs">{value}</span>
              </>
            ) : (
              <span className="text-muted-foreground">Aucune</span>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        avoidCollisions={false}
        className="max-h-(--radix-popover-content-available-height) w-(--radix-popper-anchor-width) overflow-hidden p-0"
      >
        <Command filter={filterIconOption}>
          <CommandInput placeholder="Chercher une icône" />
          {/* 3rem : la hauteur du champ de recherche, que la place annoncée par Radix inclut. */}
          <CommandList className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-3rem))]">
            <CommandEmpty>Aucune icône ne correspond.</CommandEmpty>
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
                  <span className="truncate font-mono text-xs">{key}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function Field({
  id,
  label,
  errors,
  children,
}: {
  id: string
  label: string
  errors?: string[]
  children: ReactNode
}) {
  return (
    <FormField
      id={id}
      label={label}
      error={errors?.[0] ? <p className="text-sm text-destructive">{errors[0]}</p> : null}
    >
      {children}
    </FormField>
  )
}
