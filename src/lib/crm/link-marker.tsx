import type { LinkMarker } from "@/components/features/admin/detail/RelatedLinksList"
import type { IconComponent } from "@/lib/icons"

// L'icône est rendue ici en élément React : un composant ne traverse pas la frontière serveur/client, un élément oui.
export function toLinkMarker(Icon: IconComponent | null, emphasized = false): LinkMarker {
  return { icon: Icon ? <Icon /> : null, emphasized }
}
