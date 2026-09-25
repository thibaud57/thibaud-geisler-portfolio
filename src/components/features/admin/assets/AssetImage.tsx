import Image, { type ImageProps } from "next/image"

import { buildAssetUrl, buildGuardedAssetUrl } from "@/lib/assets"
import { isAdminAssetKey } from "@/lib/schemas/asset"

interface Props extends Omit<ImageProps, "src" | "unoptimized"> {
  assetKey: string
}

// Dans l'espace admin, tout le bucket admin se lit par la route gardée, y compris un logo
// d'entreprise que la vitrine ne montrerait pas encore (aucun projet publié). next/image rejoue
// la requête en interne pour l'optimiser, sans cookie de session : la garde getCurrentUser() la
// rejetterait, d'où unoptimized sur ces clés seulement.
export function AssetImage({ assetKey, alt, ...props }: Props) {
  const guarded = isAdminAssetKey(assetKey)
  return (
    <Image
      src={guarded ? buildGuardedAssetUrl(assetKey) : buildAssetUrl(assetKey)}
      alt={alt}
      unoptimized={guarded}
      {...props}
    />
  )
}
