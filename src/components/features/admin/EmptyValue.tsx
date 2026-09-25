// Valeur absente d'une cellule, d'une carte ou d'une ligne de vue détail : un seul rendu partout,
// là où « — » en dur tantôt muted, tantôt pleine encre, se lisait comme deux états différents.
export function EmptyValue() {
  return <span className="text-muted-foreground">—</span>
}
