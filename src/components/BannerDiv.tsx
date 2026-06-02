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
  void subtitle

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
        <p className="text-left text-sm font-semibold tracking-[0.18em] uppercase text-white sm:text-base">
          {title}
        </p>
      </div>
      <div className="px-6 py-6 sm:px-8 sm:py-8">
        {children}
      </div>
    </motion.section>
  )
}
