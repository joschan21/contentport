import React from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type ModalProps = {
  showModal: boolean
  setShowModal: (show: boolean) => void
  preventDefaultClose?: boolean
  children: React.ReactNode
  className?: string
}

export const Modal = ({
  showModal,
  setShowModal,
  preventDefaultClose = false,
  children,
  className,
}: ModalProps) => {
  return (
    <Dialog open={showModal} onOpenChange={preventDefaultClose ? undefined : setShowModal}>
      <DialogContent 
        className={cn("p-0 border-none max-w-md", className)}
        onInteractOutside={(e) => {
          if (preventDefaultClose) {
            e.preventDefault()
          }
        }}
        onEscapeKeyDown={(e) => {
          if (preventDefaultClose) {
            e.preventDefault()
          }
        }}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
} 