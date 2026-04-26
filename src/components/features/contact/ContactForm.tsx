'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type Labels = {
  name: string
  company: string
  companyOptional: string
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
  stubToast: string
}

type Props = {
  labels: Labels
  defaultSubject?: string
}

export function ContactForm({ labels, defaultSubject = '' }: Props) {
  const [, formAction] = useActionState(
    async (_prev: null, formData: FormData) => {
      const payload = {
        name: String(formData.get('name') ?? ''),
        company: String(formData.get('company') ?? ''),
        email: String(formData.get('email') ?? ''),
        subject: String(formData.get('subject') ?? ''),
        message: String(formData.get('message') ?? ''),
      }
      // TODO: brancher Server Action SMTP + validation Zod (Feature 4)
      console.log('[ContactForm stub] payload:', payload)
      toast.success(labels.stubToast)
      return null
    },
    null,
  )

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={formAction} className="flex flex-col gap-5">
          <Field id="name" label={labels.name} required>
            <Input
              id="name"
              name="name"
              type="text"
              required
              placeholder={labels.namePlaceholder}
            />
          </Field>

          <Field id="company" label={`${labels.company} ${labels.companyOptional}`}>
            <Input
              id="company"
              name="company"
              type="text"
              placeholder={labels.companyPlaceholder}
            />
          </Field>

          <Field id="email" label={labels.email} required>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder={labels.emailPlaceholder}
            />
          </Field>

          <Field id="subject" label={labels.subject} required>
            <Input
              id="subject"
              name="subject"
              type="text"
              required
              defaultValue={defaultSubject}
              placeholder={labels.subjectPlaceholder}
            />
          </Field>

          <Field id="message" label={labels.message} required>
            <Textarea
              id="message"
              name="message"
              required
              rows={6}
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
  children,
}: {
  id: string
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  )
}

function SubmitButton({
  label,
  submittingLabel,
}: {
  label: string
  submittingLabel: string
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="mt-2 w-full sm:w-auto">
      {pending ? submittingLabel : label}
    </Button>
  )
}
