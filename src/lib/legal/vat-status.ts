// Assujetti = date de bascule renseignée et déjà passée ; la franchise ne porte aucune valeur.
export function isVatLiable(
  publisher: { vatLiableSince: Date | null } | null | undefined,
  now: Date = new Date(),
): boolean {
  return !!publisher?.vatLiableSince && publisher.vatLiableSince <= now
}
