"use client"

import { useState, type ReactNode } from "react"
import { X, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileBottomSheetProps {
  children: ReactNode
  title: string
  trigger?: ReactNode
}

export function MobileBottomSheet({ children, title, trigger }: MobileBottomSheetProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Trigger Button */}
      <div onClick={() => setIsOpen(true)} className="md:hidden">
        {trigger || (
          <button className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95">
            <ChevronUp className="w-5 h-5" />
            <span className="font-medium">{title}</span>
          </button>
        )}
      </div>

      {/* Backdrop */}
      {isOpen && <div className="fixed inset-0 bg-black/60 z-50 md:hidden" onClick={() => setIsOpen(false)} />}

      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 md:hidden transition-transform duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="glass rounded-t-2xl max-h-[85vh] overflow-hidden">
          {/* Handle */}
          <div className="flex items-center justify-center py-3">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-accent transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto max-h-[70vh]">{children}</div>
        </div>
      </div>
    </>
  )
}
