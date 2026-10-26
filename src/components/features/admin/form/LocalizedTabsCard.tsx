"use client"

import { type ReactNode, useId, useState } from "react"

import { FormCard } from "@/components/features/admin/form/FormCard"
import { StatusDot } from "@/components/ui/status-dot"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { requireOption } from "@/lib/is-one-of"

const LANGS = ["fr", "en"] as const
type Lang = (typeof LANGS)[number]

const LANG_LABELS: Record<Lang, string> = { fr: "Français", en: "Anglais" }

interface LocalizedText {
  label: string
  value: string
  errors: readonly string[] | undefined
  render: (labelledBy: string) => ReactNode
}

interface Props {
  title: ReactNode
  description?: ReactNode
  texts: Record<Lang, LocalizedText>
}

export function LocalizedTabsCard({ title, description, texts }: Props) {
  const id = useId()
  const [lang, setLang] = useState<Lang>("fr")

  // Une erreur dans l'onglet caché resterait invisible : chaque retour du serveur ouvre la langue en faute.
  const [seenErrors, setSeenErrors] = useState([texts.fr.errors, texts.en.errors])
  if (texts.fr.errors !== seenErrors[0] || texts.en.errors !== seenErrors[1]) {
    setSeenErrors([texts.fr.errors, texts.en.errors])
    const inError = LANGS.find((l) => texts[l].errors?.length)
    if (inError) setLang(inError)
  }

  return (
    <Tabs
      value={lang}
      onValueChange={(v) => {
        setLang(requireOption(LANGS, v))
      }}
    >
      <FormCard
        title={title}
        description={description}
        action={
          <TabsList>
            {LANGS.map((l) => (
              <TabsTrigger key={l} value={l}>
                {LANG_LABELS[l]}
                {tabMarker(texts[l])}
              </TabsTrigger>
            ))}
          </TabsList>
        }
      >
        {/* Montés tous deux : chaque langue part avec le formulaire. */}
        {LANGS.map((l) => {
          const labelId = `${id}-${l}-label`
          return (
            <TabsContent key={l} value={l} forceMount className="data-[state=inactive]:hidden">
              <span id={labelId} className="sr-only">
                {texts[l].label}
              </span>
              {texts[l].render(labelId)}
            </TabsContent>
          )
        })}
      </FormCard>
    </Tabs>
  )
}

function tabMarker({ errors, value }: LocalizedText): ReactNode {
  if (errors?.length) {
    return (
      <>
        <StatusDot tone="destructive" />
        <span className="sr-only">(erreur)</span>
      </>
    )
  }
  if (value.trim() === "") {
    return (
      <>
        <StatusDot tone="warning" />
        <span className="text-xs text-muted-foreground">vide</span>
      </>
    )
  }
  return null
}
