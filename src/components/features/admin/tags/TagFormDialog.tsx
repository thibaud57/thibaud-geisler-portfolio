"use client"

import {
  useActionState,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type ReactNode,
} from "react"
import { Pencil, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { Tag } from "@/generated/prisma/client"
import { TAG_ICON_KEYS } from "@/lib/icons"
import { TAG_KIND_LABELS } from "@/lib/tags"
import { createTag, updateTag } from "@/server/actions/tags"
import { initialTagFormState } from "@/server/actions/tags.types"

const NO_ICON_OPTION = "aucune"

interface Props {
  tag: Tag | null
}

export function TagFormDialog({ tag }: Props) {
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
      <DialogTrigger asChild>
        {tag ? (
          <Button variant="ghost" size="icon-sm" aria-label={`Modifier ${tag.nameFr}`}>
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau tag
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-160">
        <TagForm key={instanceKey} tag={tag} onSaved={handleSaved} />
      </DialogContent>
    </Dialog>
  )
}

function TagForm({ tag, onSaved }: { tag: Tag | null; onSaved: () => void }) {
  const formId = useId()
  const [iconValue, setIconValue] = useState(tag?.icon ?? "")
  const action = tag ? updateTag.bind(null, tag.id) : createTag
  const [state, formAction, pending] = useActionState(action, initialTagFormState)

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
    <form action={formAction} noValidate className="contents">
      <DialogHeader>
        <DialogTitle>{tag ? `Modifier ${tag.nameFr}` : "Nouveau tag"}</DialogTitle>
        <DialogDescription>
          {tag
            ? "Modifier les informations de ce tag."
            : "Créer un tag pour catégoriser les projets."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <Field id={`${formId}-slug`} label="Slug" errors={state.errors.slug}>
          <Input
            id={`${formId}-slug`}
            name="slug"
            defaultValue={state.values?.slug ?? tag?.slug ?? ""}
            aria-invalid={!!state.errors.slug?.length}
            aria-describedby={`${formId}-slug-error`}
            placeholder="mon-tag"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${formId}-nameFr`} label="Nom (français)" errors={state.errors.nameFr}>
            <Input
              id={`${formId}-nameFr`}
              name="nameFr"
              defaultValue={state.values?.nameFr ?? tag?.nameFr ?? ""}
              aria-invalid={!!state.errors.nameFr?.length}
              aria-describedby={`${formId}-nameFr-error`}
            />
          </Field>
          <Field id={`${formId}-nameEn`} label="Nom (anglais)" errors={state.errors.nameEn}>
            <Input
              id={`${formId}-nameEn`}
              name="nameEn"
              defaultValue={state.values?.nameEn ?? tag?.nameEn ?? ""}
              aria-invalid={!!state.errors.nameEn?.length}
              aria-describedby={`${formId}-nameEn-error`}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${formId}-kind`} label="Catégorie" errors={state.errors.kind}>
            <Select name="kind" defaultValue={state.values?.kind ?? tag?.kind ?? undefined}>
              <SelectTrigger
                id={`${formId}-kind`}
                className="w-full"
                aria-invalid={!!state.errors.kind?.length}
                aria-describedby={`${formId}-kind-error`}
              >
                <SelectValue placeholder="Choisir une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TAG_KIND_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id={`${formId}-icon`} label="Icône" errors={state.errors.icon}>
            <Select
              value={iconValue === "" ? NO_ICON_OPTION : iconValue}
              onValueChange={(value) => {
                setIconValue(value === NO_ICON_OPTION ? "" : value)
              }}
            >
              <SelectTrigger
                id={`${formId}-icon`}
                className="w-full"
                aria-invalid={!!state.errors.icon?.length}
                aria-describedby={`${formId}-icon-error`}
              >
                <SelectValue placeholder="Aucune" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ICON_OPTION}>Aucune</SelectItem>
                {TAG_ICON_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="icon" value={iconValue} />
          </Field>
        </div>

        <Field
          id={`${formId}-displayOrder`}
          label="Ordre d'affichage"
          errors={state.errors.displayOrder}
        >
          <Input
            id={`${formId}-displayOrder`}
            name="displayOrder"
            type="number"
            min={0}
            step={1}
            defaultValue={state.values?.displayOrder ?? String(tag?.displayOrder ?? 0)}
            aria-invalid={!!state.errors.displayOrder?.length}
            aria-describedby={`${formId}-displayOrder-error`}
          />
        </Field>
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
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <div id={`${id}-error`} aria-live="polite">
        {errors?.[0] ? <p className="text-sm text-destructive">{errors[0]}</p> : null}
      </div>
    </div>
  )
}
