"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

// Partagé entre DataTable et AssetsBrowser, sur le modèle de FacetFilter.
export function SearchInput({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative max-w-[320px] min-w-[200px] flex-1">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        className="pl-[34px]"
      />
    </div>
  )
}
