"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

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
        // appearance-none : un champ `search` réserve à droite la place de sa croix native, même
        // vide, et coupe le placeholder bien avant le bord. Échap efface toujours le champ.
        className="appearance-none pl-[34px] [&::-webkit-search-cancel-button]:hidden"
      />
    </div>
  )
}
