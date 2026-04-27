'use client'

import { useActionState, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { submitContact } from '@/server/actions/contact'
import { initialContactFormState } from '@/server/actions/contact.types'

import { SubmitButton } from './SubmitButton'

type Labels = {
  name: string
  company: string
  email: string
  subject: string
  message: string
  namePlaceholder: string
  companyPlaceholder: string
  emailPlaceholder: string
  subjectPlaceholder: string
  messagePlaceholder: string
  submit: string
  submitting: string
  successToast: string
}

type Props = {
  labels: Labels
  defaultSubject?: string
}

export function ContactForm({ labels, defaultSubject = '' }: Props) {
  const tErrors = useTranslations('ContactPage.form.errors')
  const translateError = useCallback(
    (code: string): string => tErrors(code as Parameters<typeof tErrors>[0]),
    [tErrors],
  )
  const [state, formAction] = useActionState(submitContact, initialContactFormState)

  useEffect(() => {
    if (state.ok === true) {
      toast.success(labels.successToast)
    } else if (state.ok === false && state.message !== null) {
      toast.error(translateError(state.message))
    }
  }, [state, labels.successToast, translateError])

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} noValidate className="flex flex-col gap-5">
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="sr-only"
          />

          <Field
            id="name"
            label={labels.name}
            required
            errors={state.errors.name}
            tError={translateError}
          >
            <Input
              id="name"
              name="name"
              type="text"
              required
              aria-invalid={!!state.errors.name?.length}
              defaultValue={state.values?.name ?? ''}
              placeholder={labels.namePlaceholder}
            />
          </Field>

          <Field
            id="company"
            label={labels.company}
            errors={state.errors.company}
            tError={translateError}
          >
            <Input
              id="company"
              name="company"
              type="text"
              aria-invalid={!!state.errors.company?.length}
              defaultValue={state.values?.company ?? ''}
              placeholder={labels.companyPlaceholder}
            />
          </Field>

          <Field
            id="email"
            label={labels.email}
            required
            errors={state.errors.email}
            tError={translateError}
          >
            <Input
              id="email"
              name="email"
              type="email"
              required
              aria-invalid={!!state.errors.email?.length}
              defaultValue={state.values?.email ?? ''}
              placeholder={labels.emailPlaceholder}
            />
          </Field>

          <Field
            id="subject"
            label={labels.subject}
            required
            errors={state.errors.subject}
            tError={translateError}
          >
            <Input
              id="subject"
              name="subject"
              type="text"
              required
              aria-invalid={!!state.errors.subject?.length}
              defaultValue={state.values?.subject ?? defaultSubject}
              placeholder={labels.subjectPlaceholder}
            />
          </Field>

          <Field
            id="message"
            label={labels.message}
            required
            errors={state.errors.message}
            tError={translateError}
          >
            <Textarea
              id="message"
              name="message"
              required
              rows={6}
              aria-invalid={!!state.errors.message?.length}
              defaultValue={state.values?.message ?? ''}
              placeholder={labels.messagePlaceholder}
            />
          </Field>

          <SubmitButton label={labels.submit} submittingLabel={labels.submitting} />
        </form>
      </CardContent>
    </Card>
  )
}

function Field({
  id,
  label,
  required = false,
  errors,
  tError,
  children,
}: {
  id: string
  label: string
  required?: boolean
  errors?: string[]
  tError: (code: string) => string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {errors?.map((code) => (
        <p key={code} className="mt-1 text-sm text-destructive">
          {tError(code)}
        </p>
      ))}
    </div>
  )
}
