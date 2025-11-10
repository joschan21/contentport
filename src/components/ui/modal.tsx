'use client'

import * as Dialog from '@radix-ui/react-dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { useRouter } from 'next/navigation'
import { ComponentProps, Dispatch, SetStateAction, useEffect } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
} from '@/components/ui/drawer'
import { cn } from '@/lib/utils'
import { useMediaQuery } from '@/hooks/use-media-query'
import { XIcon } from '@phosphor-icons/react'

export function Modal({
  children,
  className,
  showModal,
  setShowModal,
  onClose,
  desktopOnly,
  preventDefaultClose,
  drawerRootProps,
}: {
  children: React.ReactNode
  className?: string
  showModal?: boolean
  setShowModal?: Dispatch<SetStateAction<boolean>>
  onClose?: () => void
  desktopOnly?: boolean
  preventDefaultClose?: boolean
  drawerRootProps?: ComponentProps<typeof Drawer>
}) {
  const router = useRouter()

  useEffect(() => {
    const cleanup = () => {
      document.body.style.pointerEvents = ''
      document.body.style.overflow = ''
      document.documentElement.style.scrollbarGutter = 'stable'
    }

    if (showModal) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.scrollbarGutter = 'unset'
    }

    if (!showModal) {
      const timeoutId = setTimeout(cleanup, 100)
      return () => clearTimeout(timeoutId)
    }

    return cleanup
  }, [showModal])

  const closeModal = ({ dragged }: { dragged?: boolean } = {}) => {
    if (preventDefaultClose && !dragged) {
      return
    }
    // fire onClose event if provided
    onClose && onClose()

    // if setShowModal is defined, use it to close modal
    if (setShowModal) {
      setShowModal(false)
      // else, this is intercepting route @modal
    } else {
      router.back()
    }
  }
  const { isMobile } = useMediaQuery()

  if (isMobile && !desktopOnly) {
    return (
      <Drawer
        open={showModal}
        onOpenChange={(open) => {
          if (!open) closeModal({ dragged: true })
        }}
        {...drawerRootProps}
      >
        <DrawerPortal>
          <DrawerOverlay className="fixed inset-0 z-50 bg-neutral-500 bg-opacity-10 backdrop-blur" />
          <DrawerContent
            onPointerDownOutside={(e) => {
              // Prevent dismissal when clicking inside a toast
              if (
                e.target instanceof Element &&
                e.target.closest('[data-sonner-toast]')
              ) {
                e.preventDefault()
              }
            }}
            className={cn(
              'fixed no-scrollbar w-full bottom-0 left-0 right-0 z-50 flex flex-col',
              'rounded-t-[10px] border-t border-neutral-200 bg-white',
              className,
            )}
          >
            <div className="no-scrollbar flex-1 overflow-y-auto rounded-t-[10px] bg-inherit">
              <VisuallyHidden.Root>
                <DrawerTitle>Modal</DrawerTitle>
                <DrawerDescription>This is a modal</DrawerDescription>
              </VisuallyHidden.Root>
              {children}
            </div>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>
    )
  }

  return (
    <Dialog.Root
      open={showModal}
      onOpenChange={(open) => {
        if (!open) {
          closeModal()
        }
      }}
    >
      <Dialog.Portal>
        <div className="fixed inset-0 z-40 pointer-events-none">
          <Dialog.Overlay
            id="modal-backdrop"
            className="fixed inset-0 bg-neutral-500 bg-opacity-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out duration-200"
          >
            <div className="no-scrollbar fixed inset-0 overflow-y-auto overflow-x-hidden py-8 px-4 flex flex-col pointer-events-auto">
              <Dialog.Content
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                onWheel={(e) => {
                  e.stopPropagation()
                }}
                onTouchMove={(e) => {
                  e.stopPropagation()
                }}
                onPointerDownOutside={(e) => {
                  if (
                    e.target instanceof Element &&
                    e.target.closest('[data-sonner-toast]')
                  ) {
                    e.preventDefault()
                  }
                }}
                className={cn(
                  'relative w-full max-w-md mx-auto',
                  'border border-neutral-200 bg-white p-0 shadow-xl sm:rounded-2xl',
                  'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-[.97]',
                  'data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-[.97]',
                  'duration-200',
                  className,
                )}
              >
                <VisuallyHidden.Root>
                  <Dialog.Title>Modal</Dialog.Title>
                  <Dialog.Description>This is a modal</Dialog.Description>
                </VisuallyHidden.Root>
                {!preventDefaultClose && (
                  <Dialog.Close className="absolute top-5 right-5 z-10">
                    <div className="rounded-full hover:bg-gray-100 size-10 flex items-center justify-center">
                      <XIcon className="size-5 text-gray-500" />
                    </div>
                  </Dialog.Close>
                )}
                {children}
              </Dialog.Content>
            </div>
          </Dialog.Overlay>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function DrawerIsland() {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-center rounded-t-[10px] bg-inherit">
      <div className="my-3 h-1 w-12 rounded-full bg-neutral-300" />
    </div>
  )
}
