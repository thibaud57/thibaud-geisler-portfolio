"use client"

import { useId } from "react"
import { Copy, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Label } from "@/components/ui/label"

interface Props {
  name: string
  value: string
  onDone: () => void
}

export function ApiKeyCreatedView({ name, value, onDone }: Props) {
  const fieldId = useId()

  // `navigator.clipboard` est absent hors contexte sécurisé : l'accès lève avant toute promesse
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      toast.error("La copie a échoué", { description: "Copiez-la manuellement." })
      return
    }
    toast.success("Clé copiée", { description: "Collez-la dans la configuration du client." })
  }

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <DialogHeader className="shrink-0">
        <DialogTitle>{`Clé « ${name} » créée`}</DialogTitle>
        <DialogDescription>
          Copiez-la maintenant : seule son empreinte est gardée, elle ne s&apos;affichera plus.
        </DialogDescription>
      </DialogHeader>
      <DialogBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId}>Clé</Label>
          <InputGroup>
            <InputGroupInput
              id={fieldId}
              readOnly
              value={value}
              aria-describedby={`${fieldId}-help`}
              className="font-mono"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton variant="ghost" size="xs" onClick={() => void handleCopy()}>
                <Copy aria-hidden />
                Copier
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <p id={`${fieldId}-help`} className="text-xs text-muted-foreground">
            Le client MCP l&apos;envoie en en-tête Authorization: Bearer.
          </p>
        </div>
        <Alert>
          <TriangleAlert aria-hidden />
          <AlertTitle>Affichée une seule fois</AlertTitle>
          <AlertDescription>
            Perdue, elle ne se récupère pas : supprimez-la et créez-en une autre.
          </AlertDescription>
        </Alert>
      </DialogBody>
      <DialogFooter className="shrink-0">
        <Button type="button" onClick={onDone}>
          J&apos;ai copié la clé
        </Button>
      </DialogFooter>
    </div>
  )
}
