import type { ReactNode } from "react"
import { motion } from "framer-motion"

import { softRiseItem } from "@/lib/motion"
import { cn } from "@/lib/utils"

type BannerDivProps = {
  title: string
  subtitle: string
  children: ReactNode
  className?: string
}

export function BannerDiv({ title, subtitle, children, className }: BannerDivProps) {
  return (
    <motion.section
      className={cn(
        "mx-auto w-full max-w-xl overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-sm",
        className
      )}
      variants={softRiseItem}
      initial="hidden"
      animate="show"
    >
      <div className="bg-black px-6 py-5 text-white sm:px-8">
        <p className="text-xl font-semibold tracking-[0.32em] uppercase text-white/75">
          {title}
        </p>
        <h1 className="mt-3 text-l font-semibold tracking-tight sm:text-l">
          {subtitle}
        </h1>
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-8">
        {children}
      </div>
    </motion.section>
  )
}
