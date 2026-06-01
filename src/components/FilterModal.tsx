import { useEffect } from "react"

type FilterModalProps = {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

export function FilterModal({ isOpen, onClose, children }: FilterModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "auto"
    }

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="fixed inset-0 z-50 flex items-end overflow-y-auto">
        <div
          className="w-full bg-card p-6 sm:rounded-t-2xl animate-in slide-in-from-bottom"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  )
}
