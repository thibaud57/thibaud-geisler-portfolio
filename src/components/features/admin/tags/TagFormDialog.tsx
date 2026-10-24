"use client"

import { useActionState, useId, useState } from "react"
import { Plus } from "lucide-react"

import { ComboboxPopover } from "@/components/features/admin/form/ComboboxPopover"
import { describedBy } from "@/components/features/admin/form/field-aria"
import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { FormDialog, FormDialogForm } from "@/components/features/admin/form/FormDialog"
import { EditRowButton } from "@/components/features/admin/table/EditRowButton"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { TruncateTooltip } from "@/components/features/admin/display/TruncateTooltip"
import { Button } from "@/components/ui/button"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { FormField } from "@/components/ui/form-field"
import type { Tag, TagKind } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { TAG_ICON_KEYS, TagIcon } from "@/lib/icons"
import { KIND_ORDER, TAG_FIELD_LABELS, TAG_KIND_LABELS, type TagCountByKind } from "@/lib/tags"
import { createTag, updateTag } from "@/server/actions/tags"
import { initialTagFormState } from "@/server/actions/tags.types"

const NO_ICON_OPTION = "aucune"
const ICON_HELP = "Restreinte au registre : une clé inconnue passerait sans icône, sans erreur."

interface Props {
  tag: Tag | null
  counts: TagCountByKind
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function TagFormDialog({ tag, counts, open, onOpenChange }: Props) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        tag ? (
          <EditRowButton label={`Modifier ${tag.nameFr}`} />
        ) : (
          <Button>
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau tag
          </Button>
        )
      }
    >
      {(onDone) => <TagForm tag={tag} counts={counts} onDone={onDone} />}
    </FormDialog>
  )
}

function TagForm({
  tag,
  counts,
  onDone,
}: {
  tag: Tag | null
  counts: TagCountByKind
  onDone: () => void
}) {
  const formId = useId()
  const [iconValue, setIconValue] = useState<string | null>(tag?.icon ?? null)
  const action = tag ? updateTag.bind(null, tag.id) : createTag
  const [state, formAction, pending] = useActionState(action, initialTagFormState)
  const handleSubmit = useFormActionSubmit(formAction)

  // Contrôlés : changer de catégorie recalcule l'ordre affiché sans aller-retour serveur.
  const [kindValue, setKindValue] = useState<TagKind | null>(tag?.kind ?? null)
  const [displayOrderValue, setDisplayOrderValue] = useState(tag ? String(tag.displayOrder) : "")

  function handleKindChange(kind: TagKind) {
    setKindValue(kind)
    const tagKind = tag?.kind
    const tagOrder = tag?.displayOrder
    const nextOrder = kind === tagKind && tagOrder !== undefined ? tagOrder : counts[kind] + 1
    setDisplayOrderValue(String(nextOrder))
  }

  useSaveFeedback(state, {
    saved: tag ? "Tag mis à jour" : "Tag créé",
    onSaved: onDone,
    gone: { code: "tag_not_found", toast: "Ce tag a été supprimé" },
  })

  return (
    <FormDialogForm
      title={tag ? `Modifier ${tag.nameFr}` : "Nouveau tag"}
      description={
        tag ? "Modifier les informations de ce tag." : "Créer un tag pour catégoriser les projets."
      }
      pending={pending}
      onSubmit={handleSubmit}
    >
      <FieldInput
        id={`${formId}-nameFr`}
        name="nameFr"
        label={TAG_FIELD_LABELS.nameFr}
        defaultValue={tag?.nameFr ?? ""}
        errors={state.errors.nameFr}
      />

      <FieldInput
        id={`${formId}-nameEn`}
        name="nameEn"
        label={TAG_FIELD_LABELS.nameEn}
        defaultValue={tag?.nameEn ?? ""}
        errors={state.errors.nameEn}
      />

      <FieldInput
        id={`${formId}-slug`}
        name="slug"
        label={TAG_FIELD_LABELS.slug}
        defaultValue={tag?.slug ?? ""}
        placeholder="mon-tag"
        errors={state.errors.slug}
      />

      <FieldInput
        id={`${formId}-displayOrder`}
        name="displayOrder"
        label={TAG_FIELD_LABELS.displayOrder}
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={displayOrderValue}
        onChange={(event) => {
          setDisplayOrderValue(event.target.value)
        }}
        errors={state.errors.displayOrder}
      />

      <SelectField
        id={`${formId}-kind`}
        name="kind"
        label={TAG_FIELD_LABELS.kind}
        options={KIND_ORDER}
        labels={TAG_KIND_LABELS}
        value={kindValue}
        onValueChange={handleKindChange}
        placeholder="Choisir une catégorie"
        errors={state.errors.kind}
      />

      <FormField
        id={`${formId}-icon`}
        label={TAG_FIELD_LABELS.icon}
        errors={state.errors.icon}
        help={ICON_HELP}
      >
        <IconCombobox
          id={`${formId}-icon`}
          value={iconValue}
          onValueChange={setIconValue}
          ariaInvalid={!!state.errors.icon?.length}
        />
        <input type="hidden" name="icon" value={iconValue ?? ""} />
      </FormField>
    </FormDialogForm>
  )
}

function IconCombobox({
  id,
  value,
  onValueChange,
  ariaInvalid,
}: {
  id: string
  value: string | null
  onValueChange: (value: string | null) => void
  ariaInvalid: boolean
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
          {value !== null ? (
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
      ariaDescribedby={describedBy(id, ICON_HELP)}
      searchPlaceholder="Chercher une icône"
      emptyMessage="Aucune icône ne correspond."
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
          data-checked={value === null}
          onSelect={() => {
            onValueChange(null)
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
