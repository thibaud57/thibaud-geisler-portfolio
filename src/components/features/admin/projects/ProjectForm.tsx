"use client"

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useState,
  type SubmitEvent,
} from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Calendar as CalendarIcon, Save } from "lucide-react"
import { fr } from "date-fns/locale"
import { toast } from "sonner"

import { AssetImage } from "@/components/features/admin/assets/AssetImage"
import { AssetPicker } from "@/components/features/admin/assets/AssetPicker"
import { ClientMetaFields } from "@/components/features/admin/projects/ClientMetaFields"
import { ProjectTagsField } from "@/components/features/admin/projects/ProjectTagsField"
import { useImageFallback } from "@/components/features/projects/useImageFallback"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

import type { ProjectFormat, ProjectStatus, ProjectType } from "@/generated/prisma/client"
import {
  formatShortDate,
  parseIsoDate,
  PROJECT_FORMAT_LABELS,
  PROJECT_FIELD_LABELS,
  PROJECT_SECTION_TITLES,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  toIsoDate,
} from "@/lib/projects"
import { cn } from "@/lib/utils"
import { createProject, updateProject } from "@/server/actions/projects"
import { initialProjectFormState } from "@/server/actions/projects.types"
import type { AdminCompany } from "@/server/queries/companies"
import type { AssetEntry } from "@/server/queries/assets"
import type { AdminProjectDetail } from "@/server/queries/projects"
import type { AdminTag } from "@/server/queries/tags"

const PROJECT_STATUSES = Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]
const PROJECT_FORMATS = Object.keys(PROJECT_FORMAT_LABELS) as ProjectFormat[]
const PROJECT_TYPES = Object.keys(PROJECT_TYPE_LABELS) as ProjectType[]

function stringValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined
}

function arrayValue(value: string | string[] | undefined): string[] | undefined {
  return Array.isArray(value) ? value : undefined
}

function fieldDefault(
  formValue: string | string[] | undefined,
  projectValue: string | null | undefined,
): string {
  return stringValue(formValue) ?? projectValue ?? ""
}

function resolveDate(
  value: string | undefined,
  fallback: Date | null | undefined,
): Date | undefined {
  if (value !== undefined) return value === "" ? undefined : parseIsoDate(value)
  return fallback ?? undefined
}

interface Props {
  project: AdminProjectDetail | null
  tags: AdminTag[]
  companies: AdminCompany[]
  coverAssets: AssetEntry[]
  defaultDisplayOrder: number
}

export function ProjectForm({ project, tags, companies, coverAssets, defaultDisplayOrder }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = project ? updateProject.bind(null, project.id) : createProject
  const [state, formAction, pending] = useActionState(action, initialProjectFormState)

  const [type, setType] = useState<ProjectType>(
    () => (stringValue(state.values?.type) as ProjectType | undefined) ?? project?.type ?? "CLIENT",
  )
  const [coverFilename, setCoverFilename] = useState<string | null>(
    () => stringValue(state.values?.coverFilename) ?? project?.coverFilename ?? null,
  )
  const { showImage: showCover, onError: onCoverError } = useImageFallback(coverFilename)

  const [startedAt, setStartedAt] = useState<Date | undefined>(() =>
    resolveDate(stringValue(state.values?.startedAt), project?.startedAt),
  )
  const [startOpen, setStartOpen] = useState(false)
  const [endedAt, setEndedAt] = useState<Date | undefined>(() =>
    resolveDate(stringValue(state.values?.endedAt), project?.endedAt),
  )
  const [endOpen, setEndOpen] = useState(false)

  useEffect(() => {
    if (state.ok === true) {
      toast.success(project ? "Projet mis à jour" : "Projet créé")
      router.push("/admin/projets")
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, project, router])

  // onSubmit plutôt que <form action> : ce formulaire porte trois Select (Statut, Mode de travail,
  // Statut de contrat), que React réinitialiserait à leur valeur du premier rendu à la première
  // erreur de validation.
  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => {
      formAction(formData)
    })
  }

  const defaultSlug = fieldDefault(state.values?.slug, project?.slug)
  const defaultTitleFr = fieldDefault(state.values?.titleFr, project?.titleFr)
  const defaultTitleEn = fieldDefault(state.values?.titleEn, project?.titleEn)
  const defaultDescriptionFr = fieldDefault(state.values?.descriptionFr, project?.descriptionFr)
  const defaultDescriptionEn = fieldDefault(state.values?.descriptionEn, project?.descriptionEn)
  const defaultCaseStudyFr = fieldDefault(
    state.values?.caseStudyMarkdownFr,
    project?.caseStudyMarkdownFr,
  )
  const defaultCaseStudyEn = fieldDefault(
    state.values?.caseStudyMarkdownEn,
    project?.caseStudyMarkdownEn,
  )
  const defaultGithubUrl = fieldDefault(state.values?.githubUrl, project?.githubUrl)
  const defaultDemoUrl = fieldDefault(state.values?.demoUrl, project?.demoUrl)

  const displayOrderValue = stringValue(state.values?.displayOrder) ?? String(defaultDisplayOrder)
  const defaultStatus = stringValue(state.values?.status) ?? project?.status ?? "DRAFT"
  const defaultFormats = arrayValue(state.values?.formats) ?? project?.formats ?? []
  const defaultTagIds = arrayValue(state.values?.tagIds) ?? project?.tags.map((t) => t.tag.id) ?? []

  const clientMetaDefaults = {
    companyId: stringValue(state.values?.companyId) ?? project?.clientMeta?.companyId,
    workMode: stringValue(state.values?.workMode) ?? project?.clientMeta?.workMode,
    contractStatus:
      stringValue(state.values?.contractStatus) ?? project?.clientMeta?.contractStatus ?? undefined,
    teamSize:
      stringValue(state.values?.teamSize) ??
      (project?.clientMeta?.teamSize != null ? String(project.clientMeta.teamSize) : undefined),
    deliverablesCount:
      stringValue(state.values?.deliverablesCount) ??
      (project?.clientMeta ? String(project.clientMeta.deliverablesCount) : undefined),
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {project ? project.titleFr : "Nouveau projet"}
        </h1>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link href="/admin/projets">Annuler</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            <Save aria-hidden data-icon="inline-start" />
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{PROJECT_SECTION_TITLES.identity}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                id={`${formId}-slug`}
                label={PROJECT_FIELD_LABELS.slug}
                errors={state.errors.slug}
                help="Identifiant d'URL, minuscules et tirets."
              >
                <Input
                  id={`${formId}-slug`}
                  name="slug"
                  defaultValue={defaultSlug}
                  aria-invalid={!!state.errors.slug?.length}
                  aria-describedby={`${formId}-slug-help ${formId}-slug-error`}
                />
              </FormField>
              <FormField
                id={`${formId}-displayOrder`}
                label={PROJECT_FIELD_LABELS.displayOrder}
                errors={state.errors.displayOrder}
              >
                <Input
                  id={`${formId}-displayOrder`}
                  name="displayOrder"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="3"
                  defaultValue={displayOrderValue}
                  aria-invalid={!!state.errors.displayOrder?.length}
                  aria-describedby={`${formId}-displayOrder-error`}
                />
              </FormField>
              <FormField
                id={`${formId}-titleFr`}
                label={PROJECT_FIELD_LABELS.titleFr}
                errors={state.errors.titleFr}
              >
                <Input
                  id={`${formId}-titleFr`}
                  name="titleFr"
                  defaultValue={defaultTitleFr}
                  aria-invalid={!!state.errors.titleFr?.length}
                  aria-describedby={`${formId}-titleFr-error`}
                />
              </FormField>
              <FormField
                id={`${formId}-titleEn`}
                label={PROJECT_FIELD_LABELS.titleEn}
                errors={state.errors.titleEn}
              >
                <Input
                  id={`${formId}-titleEn`}
                  name="titleEn"
                  defaultValue={defaultTitleEn}
                  aria-invalid={!!state.errors.titleEn?.length}
                  aria-describedby={`${formId}-titleEn-error`}
                />
              </FormField>
              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium">{PROJECT_FIELD_LABELS.formats}</span>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                  {PROJECT_FORMATS.map((format) => (
                    <label
                      key={format}
                      className="-mx-2 flex min-h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <Checkbox
                        name="formats"
                        value={format}
                        defaultChecked={defaultFormats.includes(format)}
                        aria-invalid={!!state.errors.formats?.length}
                        aria-describedby={`${formId}-formats-error`}
                      />
                      {PROJECT_FORMAT_LABELS[format]}
                    </label>
                  ))}
                </div>
                <div id={`${formId}-formats-error`} aria-live="polite">
                  {state.errors.formats?.[0] ? (
                    <p className="text-sm text-destructive">{state.errors.formats[0]}</p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PROJECT_SECTION_TITLES.description}</CardTitle>
              <CardDescription>
                Deux à quatre phrases : ce que c&apos;est, la partie difficile, le résultat.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                id={`${formId}-descriptionFr`}
                label={PROJECT_FIELD_LABELS.descriptionFr}
                errors={state.errors.descriptionFr}
              >
                <Textarea
                  id={`${formId}-descriptionFr`}
                  name="descriptionFr"
                  rows={4}
                  defaultValue={defaultDescriptionFr}
                  aria-invalid={!!state.errors.descriptionFr?.length}
                  aria-describedby={`${formId}-descriptionFr-error`}
                />
              </FormField>
              <FormField
                id={`${formId}-descriptionEn`}
                label={PROJECT_FIELD_LABELS.descriptionEn}
                errors={state.errors.descriptionEn}
              >
                <Textarea
                  id={`${formId}-descriptionEn`}
                  name="descriptionEn"
                  rows={4}
                  defaultValue={defaultDescriptionEn}
                  aria-invalid={!!state.errors.descriptionEn?.length}
                  aria-describedby={`${formId}-descriptionEn-error`}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PROJECT_SECTION_TITLES.tags}</CardTitle>
              <CardDescription>
                Cherchez puis sélectionnez. L&apos;ordre d&apos;affichage suit l&apos;ordre de
                sélection.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <ProjectTagsField tags={tags} defaultSelectedIds={defaultTagIds} />
              {state.errors.tagIds?.[0] ? (
                <p className="text-sm text-destructive">{state.errors.tagIds[0]}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PROJECT_SECTION_TITLES.caseStudy}</CardTitle>
              <CardDescription>
                Markdown brut, une zone par langue. Le rendu se relit sur le site public.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <FormField
                id={`${formId}-caseStudyMarkdownFr`}
                label={PROJECT_FIELD_LABELS.caseStudyMarkdownFr}
                errors={state.errors.caseStudyMarkdownFr}
              >
                <Textarea
                  id={`${formId}-caseStudyMarkdownFr`}
                  name="caseStudyMarkdownFr"
                  rows={8}
                  defaultValue={defaultCaseStudyFr}
                  className="resize-y font-mono text-sm"
                  aria-invalid={!!state.errors.caseStudyMarkdownFr?.length}
                  aria-describedby={`${formId}-caseStudyMarkdownFr-error`}
                />
              </FormField>
              <FormField
                id={`${formId}-caseStudyMarkdownEn`}
                label={PROJECT_FIELD_LABELS.caseStudyMarkdownEn}
                errors={state.errors.caseStudyMarkdownEn}
              >
                <Textarea
                  id={`${formId}-caseStudyMarkdownEn`}
                  name="caseStudyMarkdownEn"
                  rows={4}
                  defaultValue={defaultCaseStudyEn}
                  className="resize-y font-mono text-sm"
                  aria-invalid={!!state.errors.caseStudyMarkdownEn?.length}
                  aria-describedby={`${formId}-caseStudyMarkdownEn-error`}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-18">
          <Card>
            <CardHeader>
              <CardTitle>{PROJECT_SECTION_TITLES.publication}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id={`${formId}-status`}
                  label={PROJECT_FIELD_LABELS.status}
                  errors={state.errors.status}
                >
                  <Select name="status" defaultValue={defaultStatus}>
                    <SelectTrigger
                      id={`${formId}-status`}
                      className="w-full"
                      aria-invalid={!!state.errors.status?.length}
                      aria-describedby={`${formId}-status-error`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {PROJECT_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField
                  id={`${formId}-type`}
                  label={PROJECT_FIELD_LABELS.type}
                  errors={state.errors.type}
                >
                  <RadioGroup
                    id={`${formId}-type`}
                    value={type}
                    onValueChange={(v) => {
                      setType(v as ProjectType)
                    }}
                    aria-invalid={!!state.errors.type?.length}
                    aria-describedby={`${formId}-type-error`}
                    className="flex h-8 items-center gap-4"
                  >
                    {PROJECT_TYPES.map((value) => (
                      <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
                        <RadioGroupItem value={value} />
                        {PROJECT_TYPE_LABELS[value]}
                      </label>
                    ))}
                  </RadioGroup>
                  <input type="hidden" name="type" value={type} />
                </FormField>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id={`${formId}-startedAt`}
                  label={PROJECT_FIELD_LABELS.startedAt}
                  errors={state.errors.startedAt}
                >
                  <Popover open={startOpen} onOpenChange={setStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        id={`${formId}-startedAt`}
                        aria-invalid={!!state.errors.startedAt?.length}
                        aria-describedby={`${formId}-startedAt-error`}
                        className={cn(
                          "w-full justify-start font-normal",
                          !startedAt && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon aria-hidden data-icon="inline-start" />
                        {startedAt ? formatShortDate(startedAt) : "Choisir une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        locale={fr}
                        mode="single"
                        selected={startedAt}
                        defaultMonth={startedAt ?? new Date()}
                        onSelect={(date) => {
                          setStartedAt(date)
                          setStartOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <input
                    type="hidden"
                    name="startedAt"
                    value={startedAt ? toIsoDate(startedAt) : ""}
                  />
                </FormField>

                <FormField
                  id={`${formId}-endedAt`}
                  label={PROJECT_FIELD_LABELS.endedAt}
                  errors={state.errors.endedAt}
                >
                  <Popover open={endOpen} onOpenChange={setEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        id={`${formId}-endedAt`}
                        aria-invalid={!!state.errors.endedAt?.length}
                        aria-describedby={`${formId}-endedAt-error`}
                        className={cn(
                          "w-full justify-start font-normal",
                          !endedAt && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon aria-hidden data-icon="inline-start" />
                        {endedAt ? formatShortDate(endedAt) : "En cours"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        locale={fr}
                        mode="single"
                        selected={endedAt}
                        defaultMonth={endedAt ?? startedAt ?? new Date()}
                        onSelect={(date) => {
                          setEndedAt(date)
                          setEndOpen(false)
                        }}
                      />
                      <div className="flex justify-end border-t border-border p-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEndedAt(undefined)
                            setEndOpen(false)
                          }}
                        >
                          Aucune date de fin
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <input type="hidden" name="endedAt" value={endedAt ? toIsoDate(endedAt) : ""} />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PROJECT_SECTION_TITLES.links}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                id={`${formId}-githubUrl`}
                label={PROJECT_FIELD_LABELS.githubUrl}
                errors={state.errors.githubUrl}
              >
                <Input
                  id={`${formId}-githubUrl`}
                  name="githubUrl"
                  type="url"
                  placeholder="github.com/…"
                  defaultValue={defaultGithubUrl}
                  aria-invalid={!!state.errors.githubUrl?.length}
                  aria-describedby={`${formId}-githubUrl-error`}
                />
              </FormField>
              <FormField
                id={`${formId}-demoUrl`}
                label={PROJECT_FIELD_LABELS.demoUrl}
                errors={state.errors.demoUrl}
              >
                <Input
                  id={`${formId}-demoUrl`}
                  name="demoUrl"
                  type="url"
                  placeholder="https://"
                  defaultValue={defaultDemoUrl}
                  aria-invalid={!!state.errors.demoUrl?.length}
                  aria-describedby={`${formId}-demoUrl-error`}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PROJECT_SECTION_TITLES.cover}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
                {showCover && coverFilename ? (
                  <AssetImage
                    assetKey={coverFilename}
                    alt=""
                    fill
                    sizes="100vw"
                    className="object-contain"
                    onError={onCoverError}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-linear-to-br from-primary/20 to-accent/20 text-xs text-muted-foreground">
                    Aucune couverture
                  </div>
                )}
              </div>
              <AssetPicker
                value={coverFilename}
                onChange={setCoverFilename}
                assets={coverAssets}
                title="Choisir la couverture"
                description="Une image du bucket, servie par /api/assets. Le fichier se dépose depuis Assets."
                triggerLabel="Choisir une couverture"
              />
              {state.errors.coverFilename?.[0] ? (
                <p className="text-sm text-destructive">{state.errors.coverFilename[0]}</p>
              ) : null}
              <input type="hidden" name="coverFilename" value={coverFilename ?? ""} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PROJECT_SECTION_TITLES.clientMeta}</CardTitle>
              <CardDescription>
                Entreprise, contrat et mode de travail apparaissent sur la fiche publique du projet.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientMetaFields
                companies={companies}
                defaultValues={clientMetaDefaults}
                errors={state.errors}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
