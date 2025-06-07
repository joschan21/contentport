"use client"

import { cn } from "@/lib/utils"
import {
  Children,
  cloneElement,
  createContext,
  useContext,
  ReactNode,
} from "react"
import { useDropzone, Accept } from "react-dropzone"
import toast from "react-hot-toast"

type FileUploadContextValue = {
  isDragging: boolean
  open: () => void
  multiple?: boolean
}

const FileUploadContext = createContext<FileUploadContextValue | null>(null)

const ACCEPTED_FILE_TYPES: Accept = {
  "image/jpeg": [],
  "image/png": [],
  "image/svg+xml": [],
  "image/webp": [],
  "text/plain": [],
  "application/pdf": [],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [],
}

export type FileUploadProps = {
  onFilesAdded: (files: File[]) => void
  children: ReactNode
  multiple?: boolean
  accept?: string
}

function FileUpload({
  onFilesAdded,
  children,
  multiple = true,
}: FileUploadProps) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (acceptedFiles, fileRejections) => {
      if (fileRejections.length > 0) {
        const unsupportedFiles = fileRejections.map(({ file }) => file.name)
        toast.error(
          `Unsupported file type${fileRejections.length > 1 ? "s" : ""}: ${unsupportedFiles.join(", ")}. Only image and text files are allowed.`
        )
        return
      }

      if (acceptedFiles.length > 0) {
        onFilesAdded(acceptedFiles)
      }
    },
    accept: ACCEPTED_FILE_TYPES,
    multiple,
    noClick: true,
    noKeyboard: true,
  })

  return (
    <FileUploadContext.Provider
      value={{ isDragging: isDragActive, open, multiple }}
    >
      <div {...getRootProps()}>
        <input {...getInputProps()} />
        {children}
      </div>
    </FileUploadContext.Provider>
  )
}

export type FileUploadTriggerProps =
  React.ComponentPropsWithoutRef<"button"> & {
    asChild?: boolean
  }

function FileUploadTrigger({
  asChild = false,
  className,
  children,
  ...props
}: FileUploadTriggerProps) {
  const context = useContext(FileUploadContext)

  const handleClick = () => context?.open()

  if (asChild) {
    const child = Children.only(children) as React.ReactElement<
      React.HTMLAttributes<HTMLElement>
    >
    return cloneElement(child, {
      ...props,
      role: "button",
      className: cn(className, child.props.className),
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation()
        handleClick()
        child.props.onClick?.(e as React.MouseEvent<HTMLElement>)
      },
    })
  }

  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        e.stopPropagation()
        handleClick()
      }}
      {...props}
    >
      {children}
    </button>
  )
}

type FileUploadContentProps = React.HTMLAttributes<HTMLDivElement>

function FileUploadContent({ className, ...props }: FileUploadContentProps) {
  const context = useContext(FileUploadContext)

  return context?.isDragging ? (
    <div
      className={cn(
        "bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm",
        "animate-in fade-in-0 slide-in-from-bottom-10 zoom-in-90 duration-150",
        className
      )}
      {...props}
    />
  ) : null
}

export { FileUpload, FileUploadTrigger, FileUploadContent, FileUploadContext }
