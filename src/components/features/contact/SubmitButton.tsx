'use client'

import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'

type Props = {
  label: string
  submittingLabel: string
}

export function SubmitButton({ label, submittingLabel }: Props) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="mt-2 w-full sm:w-auto">
      {pending ? submittingLabel : label}
    </Button>
  )
}
