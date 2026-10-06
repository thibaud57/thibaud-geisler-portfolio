// Une personne opposée ne se modifie ni ne se supprime plus : sa fiche ne garde que ce qui la reconnaît.
export class PersonLockedError extends Error {}

export interface PersonActionState {
  ok: boolean
  message: "unknown_error" | null
}
