import type { PropsWithChildren, ReactNode } from "react"

import { formSectionClassName } from "@/components/form-styles"
import { cn } from "@/lib/utils"

type PurchaseFormRowProps = PropsWithChildren<{
  label: string
  description?: ReactNode
  className?: string
}>

export function PurchaseForm({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn(formSectionClassName, className)}>
      {children}
    </div>
  )
}

export function PurchaseFormRow({ label, description, className, children }: PurchaseFormRowProps) {
  return (
    <div className={cn("grid gap-2 border-b border-border/70 py-4 last:border-b-0 md:grid-cols-[11rem_minmax(0,1fr)] md:gap-5", className)}>
      <p className="text-xs font-medium tracking-[0.22em] uppercase text-muted-foreground">{label}</p>
      <div className="min-w-0 space-y-2">
        {children}
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  )
}
