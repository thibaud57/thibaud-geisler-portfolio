// Un seul rendu de la valeur absente : un « — » en dur, tantôt muted, tantôt pleine encre, se lirait comme deux états.
export function EmptyValue() {
  return <span className="text-muted-foreground">—</span>
}
