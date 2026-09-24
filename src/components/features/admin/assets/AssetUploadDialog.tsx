"use client"

import {
  useActionState,
  useCallback,
  useEffect,
  useId,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { CONTENT_TYPE_MAP } from "@/lib/asset-content-types"
import { ASSET_FOLDERS, buildAssetKey, folderNeedsSlug, MAX_ASSET_BYTES } from "@/lib/schemas/asset"
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
  const [open, setOpen] = useState(false)
  const [instanceKey, setInstanceKey] = useState(0)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      // UploadForm porte tout son state (useActionState, champs contrôlés) ; il est démonté/remonté
      // avec cette key à chaque ouverture pour repartir d'un state neuf.
      setInstanceKey((key) => key + 1)
    }
  }

  const handleUploaded = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Upload aria-hidden data-icon="inline-start" />
          Déposer un fichier
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-160">
        <UploadForm key={instanceKey} existingKeys={existingKeys} onUploaded={handleUploaded} />
      </DialogContent>
    </Dialog>
  )
}

type FolderValue = (typeof ASSET_FOLDERS)[number] | ""

function UploadForm({
  existingKeys,
  onUploaded,
}: {
  existingKeys: readonly string[]
  onUploaded: () => void
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
    setFile(selected)
    setFilename(selected.name.toLowerCase())
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
  // Ajustement pendant le rendu (pas un useEffect, cf. useImageFallback) : une confirmation ne doit
  // pas survivre à un changement de la clé visée (autre dossier, slug ou nom de fichier).
  if (overwriteAckKey !== null && overwriteAckKey !== predictedKey) setOverwriteAckKey(null)
  const overwriteAcknowledged = predictedKey !== null && overwriteAckKey === predictedKey

  const oversizedMessage = file && file.size > MAX_ASSET_BYTES ? OVERSIZED_MESSAGE : null
  const fileMessage =
    state.ok === false && state.message ? FILE_MESSAGE_LABELS[state.message] : undefined

  useEffect(() => {
    if (state.ok === true) {
      toast.success("Fichier déposé")
      onUploaded()
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, onUploaded])

  const handleSubmit = useFormActionSubmit(formAction, (formData) => {
    if (oversizedMessage) return false
    if (isOverwrite && !overwriteAcknowledged) return false
    // L'input file n'a pas de name : seul l'état React porte le fichier (drop ou dialogue), posé ici.
    if (file) formData.set("file", file)
    return true
  })

  const filenameField = (
    <FormField id={`${formId}-filename`} label="Nom du fichier" errors={state.errors.filename}>
      <Input
        id={`${formId}-filename`}
        name="filename"
        value={filename}
        onChange={(event) => {
          setFilename(event.target.value)
        }}
        placeholder="cover.webp"
        aria-invalid={!!state.errors.filename?.length}
        aria-describedby={`${formId}-filename-error`}
      />
    </FormField>
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="contents">
      <DialogHeader>
        <DialogTitle>Déposer un fichier</DialogTitle>
        <DialogDescription>
          Écrit dans le bucket correspondant à l&apos;emplacement choisi. {MAX_SIZE_MB} Mo maximum.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField
            id={`${formId}-folder`}
            label="Dossier"
            errors={state.errors.folder}
            help="Jamais saisi librement : l'arborescence du bucket est fixée."
          >
            <Select name="folder" value={folder} onValueChange={handleFolderChange}>
              <SelectTrigger
                id={`${formId}-folder`}
                className="w-full"
                aria-invalid={!!state.errors.folder?.length}
                aria-describedby={`${formId}-folder-help ${formId}-folder-error`}
              >
                <SelectValue placeholder="Choisir un emplacement" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_FOLDERS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}/
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        {needsSlug ? (
          <>
            <FormField
              id={`${formId}-slug`}
              label="Slug"
              errors={state.errors.slug}
              help="Requis pour cet emplacement : slug du projet ou de l'entreprise concerné."
            >
              <Input
                id={`${formId}-slug`}
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlug(event.target.value)
                }}
                placeholder="plateforme-ia-dentsu"
                aria-invalid={!!state.errors.slug?.length}
                aria-describedby={`${formId}-slug-help ${formId}-slug-error`}
              />
            </FormField>
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
      </div>

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Annuler
          </Button>
        </DialogClose>
        <Button
          type="submit"
          disabled={pending || oversizedMessage !== null || (isOverwrite && !overwriteAcknowledged)}
        >
          <Upload aria-hidden data-icon="inline-start" />
          {pending ? "Envoi..." : "Déposer"}
        </Button>
      </DialogFooter>
    </form>
  )
}
