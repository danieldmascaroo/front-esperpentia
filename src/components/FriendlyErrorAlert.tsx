import { AlertCircle } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

type FriendlyErrorAlertProps = {
  message: string
  className?: string
}

export function FriendlyErrorAlert({ message, className }: FriendlyErrorAlertProps) {
  return (
    <Alert variant="destructive" className={cn("border-destructive/30 bg-destructive/10", className)}>
      <AlertCircle className="size-4" />
      <AlertTitle>No pudimos completar esta acción</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
