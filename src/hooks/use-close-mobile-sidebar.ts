import { useSidebar } from "@/components/ui/sidebar"

// À refermer nous-mêmes au clic : le layout protégé survit à la navigation, donc rien ne remet l'état du tiroir à zéro
export function useCloseMobileSidebar() {
  const { setOpenMobile } = useSidebar()

  return () => {
    setOpenMobile(false)
  }
}
