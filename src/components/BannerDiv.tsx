import type { ReactNode } from "react"
import { motion } from "framer-motion"

import { softRiseItem } from "@/lib/motion"
import { cn } from "@/lib/utils"

type BannerDivProps = {
  title: string
  subtitle: string
  children: ReactNode
  className?: string
  headerClassName?: string
  bodyClassName?: string
  titleClassName?: string
  subtitleClassName?: string
  showSubtitle?: boolean
}

export function BannerDiv({
  title,
  subtitle,
  children,
  className,
  headerClassName,
  bodyClassName,
  titleClassName,
  subtitleClassName,
  showSubtitle = false,
}: BannerDivProps) {
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
      <div className={cn("bg-black px-6 py-5 text-white sm:px-8", headerClassName)}>
        <p
          className={cn(
            "text-left text-sm font-semibold tracking-[0.18em] uppercase text-white sm:text-base",
            titleClassName
          )}
        >
          {title}
        </p>
        {showSubtitle ? (
          <p className={cn("mt-2 text-sm text-white/70 sm:text-base", subtitleClassName)}>
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className={cn("px-6 py-6 sm:px-8 sm:py-8", bodyClassName)}>
        {children}
      </div>
    </motion.section>
  )
}
