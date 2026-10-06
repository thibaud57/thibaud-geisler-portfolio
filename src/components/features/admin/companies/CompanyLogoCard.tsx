"use client"

import { useState, useTransition } from "react"
import { Globe } from "lucide-react"

import { AssetField } from "@/components/features/admin/assets/AssetField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { COMPANY_SECTION_TITLES } from "@/lib/companies"
import { fetchCompanyLogo } from "@/server/actions/company-logo"
import type { CompanyLogoFailure } from "@/server/actions/company-logo.types"
import type { CompanyLogo } from "@/server/company-logo/fetch-company-logo"
import type { AssetEntry } from "@/server/queries/assets"

function failureText(failure: CompanyLogoFailure): string {
  switch (failure.message) {
    case "invalid_input":
      return "L'adresse du site ou le slug n'est pas valide."
    case "address_blocked":
      return "Adresse refusée : elle mène vers un réseau interne."
    case "site_unreachable":
      return failure.status === null ? "Site injoignable." : `Site injoignable (${failure.status}).`
    case "no_icon_found":
      return "Le site ne déclare aucune icône exploitable. Choisissez un logo déposé dans Assets."
    case "icon_too_small":
      return `Icône trop petite (${failure.size} px). Choisissez un logo déposé dans Assets.`
    case "unknown_error":
      return "Une erreur est survenue, réessayez."
  }
}

interface Props {
  logoFilename: string | null
  onLogoFilenameChange: (key: string | null) => void
  logoAssets: AssetEntry[]
  websiteUrl: string
  slug: string
  error: string | undefined
}

export function CompanyLogoCard({
  logoFilename,
  onLogoFilenameChange,
  logoAssets,
  websiteUrl,
  slug,
  error,
}: Props) {
  const [fetching, startFetching] = useTransition()
  const [fetched, setFetched] = useState<CompanyLogo | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const canFetch = websiteUrl.trim() !== "" && slug.trim() !== "" && !fetching
  // La légende suit le logo affiché : un choix dans Assets ou un retrait la fait retomber sur le nom du fichier.
  const caption =
    fetched !== null && fetched.key === logoFilename
      ? `${fetched.width} × ${fetched.height} px · ${fetched.source}`
      : null

  function handlePick(key: string | null) {
    setFetchError(null)
    onLogoFilenameChange(key)
  }

  function handleFetch() {
    setFetchError(null)
    startFetching(async () => {
      // Une action qui lève (session expirée) remonterait au error boundary et perdrait la saisie en cours.
      const result = await fetchCompanyLogo(websiteUrl, slug).catch((): CompanyLogoFailure => ({
        ok: false,
        message: "unknown_error",
      }))
      if (result.ok) {
        setFetched(result)
        onLogoFilenameChange(result.key)
      } else {
        setFetchError(failureText(result))
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{COMPANY_SECTION_TITLES.logo}</CardTitle>
        <CardDescription>
          Choisi parmi les logos déposés dans l&apos;espace Assets, ou récupéré depuis le site web.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AssetField
          name="logoFilename"
          value={logoFilename}
          onChange={handlePick}
          assets={logoAssets}
          picker={{
            title: "Choisir un logo",
            description: "Une image du dossier entreprises. Le dépôt se fait depuis Assets.",
            triggerLabel: "Choisir un logo",
          }}
          sizes="(min-width: 1024px) 35vw, 100vw"
          caption={caption}
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canFetch}
              onClick={handleFetch}
            >
              <Globe aria-hidden data-icon="inline-start" />
              {fetching ? "Récupération…" : "Récupérer depuis le site"}
            </Button>
          }
          error={fetchError ?? error}
        />
      </CardContent>
    </Card>
  )
}
