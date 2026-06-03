import type { PropsWithChildren, ReactNode } from "react"

import { cn } from "@/lib/utils"

export const formInputClassName =
  "h-11 rounded-none border-0 border-b border-border bg-white px-3 py-0 text-sm shadow-none focus-visible:border-foreground focus-visible:ring-0"

export const formSelectClassName =
  "h-11 w-full rounded-none border-0 border-b border-border bg-white px-3 py-0 text-sm shadow-none outline-none transition-colors focus:border-foreground focus:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive"

export const formTextareaClassName =
  "min-h-28 rounded-none border-0 border-b border-border bg-white px-3 py-3 text-sm shadow-none focus-visible:border-foreground focus-visible:ring-0"

export const formFileInputClassName =
  "h-11 w-full rounded-none border-0 border-b border-border bg-white px-0 py-2 text-sm text-foreground file:mr-4 file:border-0 file:bg-black file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"

export const formCheckboxRowClassName =
  "flex min-h-11 items-center gap-3 border-b border-border py-2 text-sm text-foreground"

export const formActionButtonClassName = "h-11 rounded-none text-sm font-medium shadow-none"

export const formSectionClassName = "space-y-6 border border-border/70 bg-background p-6 sm:p-8"

export const formToggleButtonClassName = "h-11 rounded-none px-4 text-sm font-medium shadow-none"

export function FormSection({
  eyebrow,
  title,
  description,
  className,
  children,
}: PropsWithChildren<{
  eyebrow?: string
  title: string
  description?: ReactNode
  className?: string
}>) {
  return (
    <section className={cn(formSectionClassName, className)}>
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-medium tracking-[0.22em] uppercase text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
