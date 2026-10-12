"use client"

import { useActionState, useId, useState, type ChangeEvent, type DragEvent } from "react"
import { Upload } from "lucide-react"

import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { FormDialog, FormDialogForm } from "@/components/features/admin/form/FormDialog"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { CONTENT_TYPE_MAP } from "@/lib/asset-content-types"
import { ASSET_FOLDERS, buildAssetKey, folderNeedsSlug, MAX_ASSET_BYTES } from "@/lib/asset-keys"
import { uploadAsset } from "@/server/actions/assets"
import { initialAssetFormState } from "@/server/actions/assets.types"
import type { AssetFormMessage } from "@/server/actions/assets.types"

const MAX_SIZE_MB = MAX_ASSET_BYTES / (1024 * 1024)

// Capitalisation d'affichage seulement : la liste des extensions acceptées reste dérivée de
// CONTENT_TYPE_MAP, une extension oubliée ici retombe sur sa forme majuscule brute.
const EXTENSION_LABELS: Record<string, string> = {
  png: "PNG",
  jpg: "JPG",
  jpeg: "JPG",
  webp: "WebP",
  svg: "SVG",
  pdf: "PDF",
}

function buildAcceptedExtensionsLabel(): string {
  const labels: string[] = []
  for (const extension of Object.keys(CONTENT_TYPE_MAP)) {
    const label = EXTENSION_LABELS[extension] ?? extension.toUpperCase()
    if (!labels.includes(label)) labels.push(label)
  }
  return new Intl.ListFormat("fr", { type: "disjunction" }).format(labels)
}

const ACCEPTED_EXTENSIONS_LABEL = buildAcceptedExtensionsLabel()
const FILE_ACCEPT = Object.keys(CONTENT_TYPE_MAP)
  .map((extension) => `.${extension}`)
  .join(",")

const OVERSIZED_MESSAGE = `Fichier trop volumineux (${MAX_SIZE_MB} Mo maximum).`

const FILE_MESSAGE_LABELS: Partial<Record<NonNullable<AssetFormMessage>, string>> = {
  file_too_large: OVERSIZED_MESSAGE,
  file_empty: "Choisissez un fichier à déposer.",
  file_type_mismatch: "Le type du fichier ne correspond pas à son extension.",
}

interface Props {
  existingKeys: readonly string[]
}

export function AssetUploadDialog({ existingKeys }: Props) {
  return (
    <FormDialog
      trigger={
        <Button>
          <Upload aria-hidden data-icon="inline-start" />
          Déposer un fichier
        </Button>
      }
    >
      {(onDone) => <UploadForm existingKeys={existingKeys} onDone={onDone} />}
    </FormDialog>
  )
}

type FolderValue = (typeof ASSET_FOLDERS)[number] | ""

const FOLDER_LABELS = Object.fromEntries(ASSET_FOLDERS.map((value) => [value, `${value}/`]))

function UploadForm({
  existingKeys,
  onDone,
}: {
  existingKeys: readonly string[]
  onDone: () => void
}) {
  const formId = useId()
  const [state, formAction, pending] = useActionState(uploadAsset, initialAssetFormState)

  const [folder, setFolder] = useState<FolderValue>("")
  const [slug, setSlug] = useState("")
  const [filename, setFilename] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [overwriteAckKey, setOverwriteAckKey] = useState<string | null>(null)

  const needsSlug = folder !== "" && folderNeedsSlug(folder)

  function handleFolderChange(next: string) {
    const nextFolder = next as FolderValue
    setFolder(nextFolder)
    if (!folderNeedsSlug(nextFolder)) setSlug("")
  }

  function selectFile(selected: File) {
    // Seul un nom repris d'un fichier précédent se remplace : un nom saisi à la main survit.
    if (!filename || filename === file?.name.toLowerCase()) setFilename(selected.name.toLowerCase())
    setFile(selected)
  }

  function handleFileInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0]
    if (selected) selectFile(selected)
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    const selected = event.dataTransfer.files[0]
    if (selected) selectFile(selected)
  }

  const predictedKey =
    folder !== "" && filename.trim() !== ""
      ? buildAssetKey({
          folder,
          slug: needsSlug ? slug.trim().toLowerCase() || undefined : undefined,
          filename: filename.trim().toLowerCase(),
        })
      : null
  const isOverwrite = predictedKey !== null && existingKeys.includes(predictedKey)
  // Ajustement pendant le rendu (pas un useEffect) : une confirmation ne doit pas survivre à un
  // changement de la clé visée (autre dossier, slug ou nom de fichier).
  if (overwriteAckKey !== null && overwriteAckKey !== predictedKey) setOverwriteAckKey(null)
  const overwriteAcknowledged = predictedKey !== null && overwriteAckKey === predictedKey

  const oversizedMessage = file && file.size > MAX_ASSET_BYTES ? OVERSIZED_MESSAGE : null
  const fileMessage =
    state.ok === false && state.message ? FILE_MESSAGE_LABELS[state.message] : undefined

  useSaveFeedback(state, { saved: "Fichier déposé", onSaved: onDone })

  const handleSubmit = useFormActionSubmit(formAction, (formData) => {
    if (oversizedMessage) return false
    if (isOverwrite && !overwriteAcknowledged) return false
    // L'input file n'a pas de name : seul l'état React porte le fichier (drop ou dialogue), posé ici.
    if (file) formData.set("file", file)
    return true
  })

  const filenameField = (
    <FieldInput
      id={`${formId}-filename`}
      name="filename"
      label="Nom du fichier"
      value={filename}
      onChange={(event) => {
        setFilename(event.target.value)
      }}
      placeholder="cover.webp"
      errors={state.errors.filename}
    />
  )

  return (
    <FormDialogForm
      title="Déposer un fichier"
      description={`Écrit dans le bucket correspondant à l'emplacement choisi. ${MAX_SIZE_MB} Mo maximum.`}
      pending={pending}
      onSubmit={handleSubmit}
      submit={{
        label: "Déposer",
        pendingLabel: "Envoi...",
        icon: Upload,
        disabled: oversizedMessage !== null || (isOverwrite && !overwriteAcknowledged),
      }}
    >
      <div className="sm:col-span-2">
        <SelectField
          id={`${formId}-folder`}
          name="folder"
          label="Dossier"
          options={ASSET_FOLDERS}
          labels={FOLDER_LABELS}
          value={folder}
          onValueChange={handleFolderChange}
          placeholder="Choisir un emplacement"
          errors={state.errors.folder}
          help="Jamais saisi librement : l'arborescence du bucket est fixée."
        />
      </div>

      {needsSlug ? (
        <>
          <FieldInput
            id={`${formId}-slug`}
            name="slug"
            label="Slug"
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value)
            }}
            placeholder="projet-exemple"
            errors={state.errors.slug}
            help="Requis pour cet emplacement : slug du projet ou de l'entreprise concerné."
          />
          {filenameField}
        </>
      ) : (
        <div className="sm:col-span-2">{filenameField}</div>
      )}

      <div className="flex flex-col gap-2 sm:col-span-2">
        <label
          htmlFor={`${formId}-file`}
          onDragOver={(event) => {
            event.preventDefault()
          }}
          onDrop={handleDrop}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted p-8 text-center hover:border-primary"
        >
          <Upload aria-hidden className="size-6 text-muted-foreground" />
          <span className="text-sm">
            {file ? file.name : "Glisser un fichier ici, ou cliquer pour choisir"}
          </span>
          <span className="text-xs text-muted-foreground">
            {ACCEPTED_EXTENSIONS_LABEL} · {MAX_SIZE_MB} Mo maximum
          </span>
          <input
            id={`${formId}-file`}
            type="file"
            accept={FILE_ACCEPT}
            className="sr-only"
            onChange={handleFileInputChange}
          />
        </label>
        {oversizedMessage ? <p className="text-sm text-destructive">{oversizedMessage}</p> : null}
        {!oversizedMessage && fileMessage ? (
          <p className="text-sm text-destructive">{fileMessage}</p>
        ) : null}
      </div>

      {isOverwrite ? (
        <div className="flex flex-col gap-2 sm:col-span-2">
          <p className="text-sm text-destructive">
            Un fichier existe déjà à cet emplacement. Le déposer l&apos;écrasera définitivement.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={overwriteAcknowledged}
              onCheckedChange={(checked) => {
                setOverwriteAckKey(checked === true ? predictedKey : null)
              }}
            />
            <span>Je confirme vouloir écraser ce fichier.</span>
          </label>
        </div>
      ) : null}
    </FormDialogForm>
  )
}
