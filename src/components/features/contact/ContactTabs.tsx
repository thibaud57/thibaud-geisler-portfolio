'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Props = {
  formLabel: string
  calendlyLabel: string
  formContent: ReactNode
  calendlyContent: ReactNode
}

export function ContactTabs({ formLabel, calendlyLabel, formContent, calendlyContent }: Props) {
  const pathname = usePathname()

  return (
    <Tabs key={pathname} defaultValue="form" className="mx-auto w-full max-w-4xl">
      <TabsList className="mx-auto grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="form">{formLabel}</TabsTrigger>
        <TabsTrigger value="calendly">{calendlyLabel}</TabsTrigger>
      </TabsList>

      <TabsContent value="form" className="mt-8 flex flex-col gap-6">
        {formContent}
      </TabsContent>

      <TabsContent
        value="calendly"
        forceMount
        className="mt-8 flex flex-col gap-6 data-[state=inactive]:hidden"
      >
        {calendlyContent}
      </TabsContent>
    </Tabs>
  )
}
