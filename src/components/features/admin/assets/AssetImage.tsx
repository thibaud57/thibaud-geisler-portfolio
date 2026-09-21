import Image, { type ImageProps } from "next/image"

import { buildAssetUrl } from "@/lib/assets"
import { isAdminAssetKey } from "@/lib/schemas/asset"

interface Props extends Omit<ImageProps, "src" | "unoptimized"> {
  assetKey: string
}

// next/image rejoue la requête en interne pour l'optimiser, sans en-têtes ni cookie de session :
// la garde getCurrentUser() de /admin/api/assets la rejette systématiquement. Les clés du bucket
// admin doivent donc être servies sans optimisation, celles du bucket public la gardent.
export function AssetImage({ assetKey, alt, ...props }: Props) {
  return (
    <Image
      src={buildAssetUrl(assetKey)}
      alt={alt}
      unoptimized={isAdminAssetKey(assetKey)}
      {...props}
    />
  )
}
