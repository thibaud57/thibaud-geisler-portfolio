// Une personne opposée ne se modifie plus et ne se supprime qu'après son échéance : sa fiche ne garde que ce qui la reconnaît.
export class PersonLockedError extends Error {}

export interface PersonActionState {
  ok: boolean
  message: "unknown_error" | null
}
