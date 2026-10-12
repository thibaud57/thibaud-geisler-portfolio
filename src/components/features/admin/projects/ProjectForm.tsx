"use client"

import { useActionState, useId, useState } from "react"
import { useRouter } from "next/navigation"

import { AssetField } from "@/components/features/admin/assets/AssetField"
import { CheckboxGroupField } from "@/components/features/admin/form/CheckboxGroupField"
import { DateField } from "@/components/features/admin/form/DateField"
import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { FormCard } from "@/components/features/admin/form/FormCard"
import { FormPage } from "@/components/features/admin/form/FormPage"
import { MarkdownEditorField } from "@/components/features/admin/form/MarkdownEditorField"
import { ClientMetaFields } from "@/components/features/admin/projects/ClientMetaFields"
import { ProjectTagsField } from "@/components/features/admin/projects/ProjectTagsField"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { TextareaField } from "@/components/features/admin/form/TextareaField"
import { FormField } from "@/components/ui/form-field"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { ProjectType } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { ADMIN_PROJECTS_PATH } from "@/lib/admin/routes"
import {
  PROJECT_FIELD_LABELS as LABELS,
  PROJECT_FORMAT_ICONS,
  PROJECT_FORMAT_LABELS,
  PROJECT_FORMATS,
  PROJECT_SECTION_TITLES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
  PROJECT_TYPE_LABELS,
  PROJECT_TYPES,
} from "@/lib/projects"
import { createProject, updateProject } from "@/server/actions/projects"
import { initialProjectFormState } from "@/server/actions/projects.types"
import type { AssetEntry } from "@/server/queries/assets"
import type { CompanyOption } from "@/server/queries/companies"
import type { AdminProjectDetail } from "@/server/queries/projects"
import type { AdminTag } from "@/server/queries/tags"

interface Props {
  project: AdminProjectDetail | null
  tags: AdminTag[]
  companies: readonly CompanyOption[]
  coverAssets: AssetEntry[]
  defaultDisplayOrder: number
}

export function ProjectForm({ project, tags, companies, coverAssets, defaultDisplayOrder }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = project ? updateProject.bind(null, project.id) : createProject
  const [state, formAction, pending] = useActionState(action, initialProjectFormState)
  const handleSubmit = useFormActionSubmit(formAction)

  const [type, setType] = useState<ProjectType>(project?.type ?? "CLIENT")
  const [coverFilename, setCoverFilename] = useState<string | null>(project?.coverFilename ?? null)
  const [startedAt, setStartedAt] = useState<Date | undefined>(project?.startedAt ?? undefined)
  const [endedAt, setEndedAt] = useState<Date | undefined>(project?.endedAt ?? undefined)
  const [caseStudyMarkdownFr, setCaseStudyMarkdownFr] = useState(project?.caseStudyMarkdownFr ?? "")
  const [caseStudyMarkdownEn, setCaseStudyMarkdownEn] = useState(project?.caseStudyMarkdownEn ?? "")

  useSaveFeedback(state, {
    saved: project ? "Projet mis à jour" : "Projet créé",
    onSaved: () => {
      router.push(ADMIN_PROJECTS_PATH)
    },
    gone: { code: "project_not_found", toast: "Ce projet a été supprimé" },
  })

  return (
    <FormPage
      title={project ? project.titleFr : "Nouveau projet"}
      cancelHref={ADMIN_PROJECTS_PATH}
      pending={pending}
      onSubmit={handleSubmit}
      main={
        <>
          <FormCard title={PROJECT_SECTION_TITLES.identity} columns={2}>
            <FieldInput
              id={`${formId}-titleFr`}
              name="titleFr"
              label={LABELS.titleFr}
              defaultValue={project?.titleFr ?? ""}
              errors={state.errors.titleFr}
            />

            <FieldInput
              id={`${formId}-titleEn`}
              name="titleEn"
              label={LABELS.titleEn}
              defaultValue={project?.titleEn ?? ""}
              errors={state.errors.titleEn}
            />

            <FieldInput
              id={`${formId}-slug`}
              name="slug"
              label={LABELS.slug}
              defaultValue={project?.slug ?? ""}
              help="Identifiant d'URL, minuscules et tirets."
              errors={state.errors.slug}
            />

            <FieldInput
              id={`${formId}-displayOrder`}
              name="displayOrder"
              label={LABELS.displayOrder}
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="3"
              defaultValue={String(defaultDisplayOrder)}
              errors={state.errors.displayOrder}
            />

            <div className="sm:col-span-2">
              <CheckboxGroupField
                id={`${formId}-formats`}
                name="formats"
                label={LABELS.formats}
                options={PROJECT_FORMATS}
                labels={PROJECT_FORMAT_LABELS}
                icons={PROJECT_FORMAT_ICONS}
                defaultValue={project?.formats ?? []}
                errors={state.errors.formats}
                columns={3}
              />
            </div>
          </FormCard>

          <FormCard
            title={PROJECT_SECTION_TITLES.description}
            description="Deux à quatre phrases : ce que c'est, la partie difficile, le résultat."
          >
            <TextareaField
              id={`${formId}-descriptionFr`}
              name="descriptionFr"
              label={LABELS.descriptionFr}
              rows={4}
              defaultValue={project?.descriptionFr ?? ""}
              errors={state.errors.descriptionFr}
            />

            <TextareaField
              id={`${formId}-descriptionEn`}
              name="descriptionEn"
              label={LABELS.descriptionEn}
              rows={4}
              defaultValue={project?.descriptionEn ?? ""}
              errors={state.errors.descriptionEn}
            />
          </FormCard>

          <FormCard
            title={PROJECT_SECTION_TITLES.tags}
            description="Cherchez puis sélectionnez. L'ordre d'affichage suit l'ordre de sélection."
          >
            <div className="flex flex-col gap-2">
              <ProjectTagsField
                tags={tags}
                defaultSelectedIds={project?.tags.map((projectTag) => projectTag.tag.id) ?? []}
              />
              {state.errors.tagIds?.[0] ? (
                <p className="text-sm text-destructive">{state.errors.tagIds[0]}</p>
              ) : null}
            </div>
          </FormCard>

          <FormCard
            title={PROJECT_SECTION_TITLES.caseStudy}
            description="Une zone par langue. Le rendu se relit sur le site public."
          >
            <MarkdownEditorField
              id={`${formId}-caseStudyMarkdownFr`}
              name="caseStudyMarkdownFr"
              label={LABELS.caseStudyMarkdownFr}
              value={caseStudyMarkdownFr}
              onChange={setCaseStudyMarkdownFr}
              errors={state.errors.caseStudyMarkdownFr}
            />

            <MarkdownEditorField
              id={`${formId}-caseStudyMarkdownEn`}
              name="caseStudyMarkdownEn"
              label={LABELS.caseStudyMarkdownEn}
              value={caseStudyMarkdownEn}
              onChange={setCaseStudyMarkdownEn}
              errors={state.errors.caseStudyMarkdownEn}
            />
          </FormCard>
        </>
      }
      aside={
        <>
          <FormCard title={PROJECT_SECTION_TITLES.publication} columns={2}>
            <SelectField
              id={`${formId}-status`}
              name="status"
              label={LABELS.status}
              options={PROJECT_STATUSES}
              labels={PROJECT_STATUS_LABELS}
              defaultValue={project?.status ?? "DRAFT"}
              errors={state.errors.status}
            />

            <FormField id={`${formId}-type`} label={LABELS.type} errors={state.errors.type}>
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
                  <label key={value} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={value} />
                    {PROJECT_TYPE_LABELS[value]}
                  </label>
                ))}
              </RadioGroup>
              <input type="hidden" name="type" value={type} />
            </FormField>

            <DateField
              id={`${formId}-startedAt`}
              name="startedAt"
              label={LABELS.startedAt}
              value={startedAt}
              onChange={setStartedAt}
              errors={state.errors.startedAt}
            />

            <DateField
              id={`${formId}-endedAt`}
              name="endedAt"
              label={LABELS.endedAt}
              value={endedAt}
              onChange={setEndedAt}
              errors={state.errors.endedAt}
              placeholder="En cours"
              defaultMonth={startedAt}
              clearLabel="Aucune date de fin"
            />
          </FormCard>

          <FormCard title={PROJECT_SECTION_TITLES.links} columns={2}>
            <FieldInput
              id={`${formId}-githubUrl`}
              name="githubUrl"
              label={LABELS.githubUrl}
              type="url"
              placeholder="github.com/…"
              defaultValue={project?.githubUrl ?? ""}
              errors={state.errors.githubUrl}
            />

            <FieldInput
              id={`${formId}-demoUrl`}
              name="demoUrl"
              label={LABELS.demoUrl}
              type="url"
              placeholder="https://"
              defaultValue={project?.demoUrl ?? ""}
              errors={state.errors.demoUrl}
            />
          </FormCard>

          <FormCard title={PROJECT_SECTION_TITLES.cover}>
            <AssetField
              name="coverFilename"
              value={coverFilename}
              onChange={setCoverFilename}
              assets={coverAssets}
              picker={{
                title: "Choisir la couverture",
                description:
                  "Une image du bucket, servie par /api/assets. Le fichier se dépose depuis Assets.",
                triggerLabel: "Choisir une couverture",
              }}
              sizes="(min-width: 1024px) 35vw, 100vw"
              error={state.errors.coverFilename?.[0]}
            />
          </FormCard>

          <FormCard
            title={PROJECT_SECTION_TITLES.clientMeta}
            description="Entreprise, contrat et mode de travail apparaissent sur la fiche publique du projet."
          >
            <ClientMetaFields
              companies={companies}
              clientMeta={project?.clientMeta}
              errors={state.errors}
            />
          </FormCard>
        </>
      }
    />
  )
}
