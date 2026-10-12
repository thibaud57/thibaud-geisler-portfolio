import type { ReactNode } from "react"
import { X } from "lucide-react"

import { AssetFrame } from "@/components/features/admin/assets/AssetFrame"
import { AssetPicker } from "@/components/features/admin/assets/AssetPicker"
import { Button } from "@/components/ui/button"
import { nameOfAssetKey } from "@/lib/assets"
import type { AssetEntry } from "@/server/queries/assets"

interface Props {
  name: string
  value: string | null
  onChange: (key: string | null) => void
  assets: AssetEntry[]
  picker: { title: string; description: string; triggerLabel: string }
  sizes: string
  caption?: string | null
  actions?: ReactNode
  error?: string
}

export function AssetField({
  name,
  value,
  onChange,
  assets,
  picker,
  sizes,
  caption,
  actions,
  error,
}: Props) {
  const legend = caption ?? (value !== null ? nameOfAssetKey(value) : null)

  return (
    <div className="flex flex-col gap-2">
      <AssetFrame assetKey={value} sizes={sizes} className="rounded-lg" />
      {legend ? <p className="text-xs text-muted-foreground">{legend}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <AssetPicker
          value={value}
          onChange={onChange}
          assets={assets}
          title={picker.title}
          description={picker.description}
          triggerLabel={picker.triggerLabel}
        />
        {actions}
        {value !== null ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Retirer ${nameOfAssetKey(value)}`}
            className="ml-auto"
            onClick={() => {
              onChange(null)
            }}
          >
            <X aria-hidden />
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <input type="hidden" name={name} value={value ?? ""} />
    </div>
  )
}
