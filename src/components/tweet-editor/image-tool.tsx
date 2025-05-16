"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Toggle } from "@/components/ui/toggle"
import { cn } from "@/lib/utils"
import domtoimage from "dom-to-image"
import {
  Grip,
  ImagePlus
} from "lucide-react"
import { PropsWithChildren, useEffect, useRef, useState } from "react"
import { toast } from "react-hot-toast"
import { EnhancedSlider } from "../ui/enhanced-slider"
import { Separator } from "../ui/separator"

interface ImageBeautifierProps {
  onClose?: () => void
  onSave?: (image: {
    src: string
    width: number
    height: number
    editorState: {
      blob: {
        src: string
        w?: number
        h?: number
      }
      canvasWidth: number
      canvasHeight: number
      outlineSize: number
      outlineColor: string
      options: {
        aspectRatio: string
        theme: string
        customTheme: {
          colorStart: string
          colorEnd: string
        }
        rounded: number
        roundedWrapper: string
        shadow: number
        noise: boolean
        browserBar: string
        screenshotScale: number
        rotation: number
        pattern: {
          enabled: boolean
          intensity: number
          rotation: number
          opacity: number
          type: "waves" | "dots" | "stripes" | "zigzag" | "graphpaper" | "none"
        }
        frame: "none" | "arc" | "stack"
        outlineSize: number
        outlineColor: string
      }
    }
  }) => void
  initialEditorState?: {
    blob: {
      src: string
      w?: number
      h?: number
    }
    canvasWidth: number
    canvasHeight: number
    outlineSize: number
    outlineColor: string
    options: {
      aspectRatio: string
      theme: string
      customTheme: {
        colorStart: string
        colorEnd: string
      }
      rounded: number
      roundedWrapper: string
      shadow: number
      noise: boolean
      browserBar: string
      screenshotScale: number
      rotation: number
      pattern: {
        enabled: boolean
        intensity: number
        rotation: number
        opacity: number
        type: "waves" | "dots" | "stripes" | "zigzag" | "graphpaper" | "none"
      }
      frame: "none" | "arc" | "stack"
      outlineSize: number
      outlineColor: string
    }
  }
}

interface ScreenshotBlob {
  src: string
  w?: number
  h?: number
}

interface Options {
  aspectRatio: string
  theme: string
  customTheme: {
    colorStart: string
    colorEnd: string
  }
  rounded: number
  roundedWrapper: string
  shadow: number
  noise: boolean
  browserBar: string
  screenshotScale: number
  rotation: number
  pattern: {
    enabled: boolean
    intensity: number
    rotation: number
    opacity: number
    type: "waves" | "dots" | "stripes" | "zigzag" | "graphpaper" | "none"
  }
  frame: "none" | "arc" | "stack"
  outlineSize: number
  outlineColor: string
}

interface FrameProps extends PropsWithChildren {
  type: "none" | "arc" | "stack"
  backgroundColor: string
  borderRadius: number
}

const Frame = ({
  type,
  borderRadius,
  backgroundColor,
  children,
}: FrameProps) => {
  if (type === "arc") {
    return (
      <div className="relative pointer-events-none">
        <div
          style={{
            borderRadius: borderRadius + 10,
            boxShadow:
              "rgba(0, 0, 0, 0.22) 0px 18px 88px -4px, rgba(0, 0, 0, 0.22) 0px 8px 28px -6px",
            backgroundColor: "rgba(255, 255, 255, 0.314)",
            zIndex: 2,
            border: "1px solid rgba(255, 255, 255, 0.376)",
            padding: "10px",
          }}
        >
          {children}
        </div>
      </div>
    )
  }

  if (type === "stack") {
    return (
      <div className="relative pointer-events-none">
        <div className="absolute inset-0">
          {Array.from({ length: 3 }).map((_, index) => {
            const reverseIndex = 3 - index - 1
            const translateY = reverseIndex * -10
            const scale = 1 - reverseIndex * 0.06
            const opacity = Math.pow(0.7, reverseIndex)

            return (
              <div
                key={index}
                className="absolute w-full"
                style={{
                  height: borderRadius, // Make it as tall as the border radius
                  borderTopLeftRadius: borderRadius,
                  borderTopRightRadius: borderRadius,
                  backgroundColor,
                  transform: `translateY(${translateY}px) scaleX(${scale})`,
                  transformOrigin: "top center",
                  opacity,
                  clipPath: "inset(0 0 calc(100% - 10px) 0)", // Only show the top 10px
                }}
              />
            )
          })}
        </div>
        <div className="relative z-10">{children}</div>
      </div>
    )
  }

  return children
}

export function ImageTool({
  onClose,
  onSave,
  initialEditorState,
}: ImageBeautifierProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [blob, setBlob] = useState<ScreenshotBlob>({
    src: initialEditorState?.blob.src || "",
  })
  const [canvasWidth, setCanvasWidth] = useState(
    initialEditorState?.canvasWidth || 600
  )
  const [canvasHeight, setCanvasHeight] = useState(
    initialEditorState?.canvasHeight || 400
  )
  const [isResizing, setIsResizing] = useState(false)
  const [resizeStart, setResizeStart] = useState<{
    x: number
    y: number
    w: number
    h: number
  } | null>(null)
  const [outlineSize, setOutlineSize] = useState(
    initialEditorState?.outlineSize || 0
  )
  const [outlineColor, setOutlineColor] = useState(
    initialEditorState?.outlineColor || "#292524"
  )
  const [options, setOptions] = useState<Options>(
    initialEditorState?.options || {
      aspectRatio: "aspect-auto",
      theme: "bg-gradient-to-br from-cyan-300 to-sky-400",
      customTheme: {
        colorStart: "#f3f4f6",
        colorEnd: "#e5e7eb",
      },
      rounded: 12,
      roundedWrapper: "rounded-xl",
      shadow: 3,
      noise: true,
      browserBar: "hidden",
      screenshotScale: 1,
      rotation: 0,
      pattern: {
        enabled: true,
        intensity: 15,
        rotation: 0,
        opacity: 6,
        type: "stripes",
      },
      frame: "arc",
      outlineSize: 0,
      outlineColor: "#292524",
    }
  )
  const [userResized, setUserResized] = useState(
    !!initialEditorState?.canvasWidth
  )
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const preset = localStorage.getItem("options")
    if (preset) {
      setOptions(JSON.parse(preset))
    }
  }, [])

  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if ((e.key === "s" && e.ctrlKey) || (e.key === "s" && e.metaKey)) {
        e.preventDefault()
        saveImage()
      }
    }

    document.addEventListener("keydown", handleShortcuts)
    return () => {
      document.removeEventListener("keydown", handleShortcuts)
    }
  }, [blob])

  useEffect(() => {
    localStorage.setItem("options", JSON.stringify(options))
  }, [options])

  useEffect(() => {
    function setCanvasToContainer() {
      if (containerRef.current && !userResized) {
        const rect = containerRef.current.getBoundingClientRect()
        setCanvasWidth(Math.max(100, rect.width - outlineSize))
        setCanvasHeight(Math.max(100, rect.height - outlineSize))
      }
    }
    setCanvasToContainer()
    window.addEventListener("resize", setCanvasToContainer)
    return () => window.removeEventListener("resize", setCanvasToContainer)
  }, [userResized, outlineSize])

  useEffect(() => {
    if (!isResizing) return

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!resizeStart) return
      let clientX, clientY
      if (e instanceof TouchEvent) {
        clientX = e.touches[0]!.clientX
        clientY = e.touches[0]!.clientY
      } else {
        clientX = e.clientX
        clientY = e.clientY
      }
      console.log("calculating")
      const newWidth = Math.max(100, resizeStart.w + (clientX - resizeStart.x))
      const newHeight = Math.max(100, resizeStart.h + (clientY - resizeStart.y))
      setCanvasWidth(newWidth)
      setCanvasHeight(newHeight)
    }

    const onUp = () => setIsResizing(false)

    window.addEventListener("mousemove", onMove as any)
    window.addEventListener("mouseup", onUp)
    window.addEventListener("touchmove", onMove as any)
    window.addEventListener("touchend", onUp)

    return () => {
      window.removeEventListener("mousemove", onMove as any)
      window.removeEventListener("mouseup", onUp)
      window.removeEventListener("touchmove", onMove as any)
      window.removeEventListener("touchend", onUp)
    }
  }, [isResizing, resizeStart])

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (!item) continue

        if (item.kind === "file" && item.type.includes("image")) {
          const file = item.getAsFile()
          if (!file) continue

          const reader = new FileReader()
          reader.onload = (e) => {
            if (e.target && e.target.result) {
              setBlob({ src: e.target.result as string })
            }
          }
          reader.readAsDataURL(file)
          break
        }
      }
    }

    document.addEventListener("paste", handlePaste)
    return () => {
      document.removeEventListener("paste", handlePaste)
    }
  }, [])

  const saveImage = async (scale = 1) => {
    try {
      const element = wrapperRef.current
      if (!element) return

      const savingToast = toast.loading("Exporting image...")

      const dragHandle = element.querySelector('[role="slider"]') as HTMLElement
      const originalDisplay = dragHandle?.style.display
      if (dragHandle) {
        dragHandle.style.display = "none"
      }

      const data = await domtoimage.toPng(element, {
        height: element.offsetHeight * scale,
        width: element.offsetWidth * scale,
        style: {
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: `${element.offsetWidth}px`,
          height: `${element.offsetHeight}px`,
        },
      })

      if (dragHandle) {
        dragHandle.style.display = originalDisplay || ""
      }

      if (onSave) {
        onSave({
          src: data,
          width: element.offsetWidth * scale,
          height: element.offsetHeight * scale,
          editorState: {
            blob,
            canvasWidth,
            canvasHeight,
            outlineSize,
            outlineColor,
            options: {
              ...options,
              outlineSize,
              outlineColor,
            },
          },
        })
      }

      toast.success("Image exported!", { id: savingToast })
    } catch (error) {
      toast.error("something went wrong")
    }
  }

  const onPaste = (event: React.ClipboardEvent | React.DragEvent | Event) => {
    let items: DataTransferItemList | FileList | null = null

    if ((event as React.ClipboardEvent).clipboardData) {
      items = (event as React.ClipboardEvent).clipboardData.items
    } else if ((event as React.DragEvent).dataTransfer) {
      items = (event as React.DragEvent).dataTransfer.files
    } else if ((event as any).target && (event as any).target.files) {
      items = (event as any).target.files
    }

    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      if (
        (item as DataTransferItem).kind === "file" ||
        ((item as File).type && (item as File).type.includes("image"))
      ) {
        const file = (item as DataTransferItem).kind
          ? (item as DataTransferItem).getAsFile()
          : (item as File)

        if (!file) continue

        const reader = new FileReader()
        reader.onload = (e) => {
          if (e.target && e.target.result) {
            setBlob({ src: e.target.result as string })
          }
        }
        reader.readAsDataURL(file)
        break
      }
    }
  }

  const shadowMap: Record<number, string> = {
    0: "none",
    1: "rgba(0, 0, 0, 0.1) 0px 0px 10px",
    2: "rgba(0, 0, 0, 0.15) 0px 10px 35px 0px",
    3: "rgba(0, 0, 0, 0.2) 0px 20px 40px 0px",
    4: "rgba(0, 0, 0, 0.25) 0px 25px 45px 0px",
  }

  const renderBrowserBar = () => {
    switch (options.browserBar) {
      case "light":
        return (
          <div className="flex items-center w-full px-4 py-[10px] rounded-t-lg bg-white/80">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-400 rounded-full" />
              <div className="w-3 h-3 bg-yellow-300 rounded-full" />
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
          </div>
        )
      case "dark":
        return (
          <div className="flex items-center w-full px-4 py-[10px] rounded-t-lg bg-black/40">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-400 rounded-full" />
              <div className="w-3 h-3 bg-yellow-300 rounded-full" />
              <div className="w-3 h-3 bg-green-500 rounded-full" />
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const getMostCommonBorderColor = (
    imageSrc: string,
    callback: (color: string) => void
  ) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      const exec = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d", { willReadFrequently: true })
        if (!ctx) return

        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        const { width, height } = canvas
        const imageData = ctx.getImageData(0, 0, width, height).data
        const colorCount: Record<string, number> = {}

        const getColorKey = (r: number, g: number, b: number) =>
          `${r},${g},${b}`

        // Sample top and bottom rows
        for (let x = 0; x < width; x++) {
          for (const y of [0, height - 1]) {
            const i = (y * width + x) * 4
            const key = getColorKey(
              imageData[i]!,
              imageData[i + 1]!,
              imageData[i + 2]!
            )
            colorCount[key] = (colorCount[key] || 0) + 1
          }
        }

        // Sample left and right columns (skip corners)
        for (let y = 1; y < height - 1; y++) {
          for (const x of [0, width - 1]) {
            const i = (y * width + x) * 4
            const key = getColorKey(
              imageData[i]!,
              imageData[i + 1]!,
              imageData[i + 2]!
            )
            colorCount[key] = (colorCount[key] || 0) + 1
          }
        }

        // Find most common color
        let mostUsed = ["0,0,0", 0]
        for (const [key, count] of Object.entries(colorCount)) {
          // @ts-ignore
          if (count > mostUsed[1]) {
            mostUsed = [key, count]
          }
        }

        callback(`rgb(${mostUsed[0]})`)
      }

      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(exec)
      } else {
        setTimeout(exec, 0)
      }
    }

    img.src = imageSrc
  }

  const rgbToHex = (rgb: string): string => {
    const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb)
    if (!result) return "#e11d48"

    return (
      "#" +
      (
        (1 << 24) +
        (Number.parseInt(result[1]!) << 16) +
        (Number.parseInt(result[2]!) << 8) +
        Number.parseInt(result[3]!)
      )
        .toString(16)
        .slice(1)
    )
  }

  const previewSizes = {
    waves: "250%",
    dots: "250%",
    graphpaper: "225%",
  }

  return (
    <div className="flex flex-col pt-1" data-vaul-no-drag>
      <div className="relative w-full flex justify-between gap-6">
        {/* CANVAS */}
        <div
          className={cn(
            "relative w-full flex-1 flex items-start justify-center min-h-[500px] h-full rounded-lg",
            "bg-light-gray border border-stone-200 bg-[size:10px_10px] bg-fixed transition-all duration-200",
            {
              "items-center h-[80vh]": !Boolean(blob.src),
              "max-w-[calc(72rem-330px)] h-[80vh]": Boolean(blob.src),
              "ring-2 ring-indigo-500 ring-offset-2 bg-indigo-50/50":
                isDragging && !blob.src,
              "bg-[image:repeating-linear-gradient(315deg,rgba(209,213,219,0.4)_0,rgba(209,213,219,0.4)_1px,_transparent_0,_transparent_50%)]":
                !isDragging || blob.src,
              "bg-[image:repeating-linear-gradient(315deg,rgba(251,191,36,0.15)_0,rgba(251,191,36,0.15)_1px,_transparent_0,_transparent_50%)]":
                isDragging && !blob.src,
            }
          )}
          ref={containerRef}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!blob.src) {
              setIsDragging(true)
            }
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(false)
            onPaste(e)
          }}
        >
          {blob?.src ? (
            <div
              className={cn("overflow-hidden")}
              style={{
                width: canvasWidth + outlineSize,
                height: canvasHeight + outlineSize,
                minWidth: 100,
                minHeight: 100,
                maxWidth: "100%",
                maxHeight: "80vh",
                // borderRadius: `${options.rounded}px`,
              }}
            >
              <div
                ref={wrapperRef}
                style={{
                  position: "relative",
                  width: "100%",
                  height: "100%",
                  boxShadow: shadowMap[options.shadow],
                  //   borderRadius: `${options.rounded}px`,
                }}
                className={cn(
                  "transition-all duration-200 ease-in-out flex items-center justify-center overflow-hidden w-full h-full flex-col",
                  [options.theme],
                  options.aspectRatio
                )}
              >
                {renderBrowserBar()}
                {options.noise && (
                  <div
                    style={{
                      backgroundImage: `url("/noise.svg")`,
                      //   borderRadius: `${options.rounded}px`,
                    }}
                    className={cn(
                      "absolute inset-0 w-full h-full bg-repeat opacity-[0.15]",
                      {
                        "rounded-t-none": options.browserBar !== "hidden",
                      }
                    )}
                  />
                )}

                {options.pattern.enabled && (
                  <div
                    className="w-full h-full absolute inset-0 overflow-hidden"
                    style={{
                      zIndex: 1,
                      pointerEvents: "none",
                      opacity: options.pattern.opacity / 100,
                      mixBlendMode: "luminosity",
                    }}
                  >
                    <div
                      className="w-full h-full absolute inset-0 object-cover"
                      style={{
                        backgroundImage: `url("/pattern/${options.pattern.type}.svg")`,
                        backgroundRepeat: "repeat",
                        backgroundSize: `${options.pattern.intensity}%`,
                        transform: `rotate(${options.pattern.rotation}deg) scale(2)`,
                      }}
                    />
                  </div>
                )}

                <div
                  className="flex items-center justify-center transition-all ease-in-out antialiased"
                  style={{
                    willChange: "transform",
                    borderRadius: `${options.rounded}px`,
                    transition: "400ms cubic-bezier(0.03, 0.98, 0.52, 0.99)",
                    position: "relative",
                    zIndex: 2,
                    transform: `scale(${options.screenshotScale}) rotate(${options.rotation}deg)`,
                    maxWidth: "100%",
                    maxHeight: "100%",
                    boxShadow: shadowMap[options.shadow],
                  }}
                >
                  <Frame
                    backgroundColor={outlineColor}
                    borderRadius={options.rounded}
                    type={options.frame}
                  >
                    <div
                      className="transition-all ease-in-out"
                      style={{
                        overflow: "hidden",
                        borderRadius: `${options.rounded}px`,
                        boxShadow: shadowMap[options.shadow],
                        background: outlineColor,
                        border: `${outlineSize}px solid ${outlineColor}`,
                        transition:
                          "border 400ms cubic-bezier(0.03, 0.98, 0.52, 0.99)",
                      }}
                    >
                      <img
                        src={blob.src || "/placeholder.svg"}
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "block",
                        }}
                        onLoad={(e) => {
                          const target = e.target as HTMLImageElement
                          setBlob({
                            ...blob,
                            w: target.naturalWidth,
                            h: target.naturalHeight,
                          })
                          if (blob.src) {
                            getMostCommonBorderColor(blob.src, (color) => {
                              setOutlineColor(rgbToHex(color))
                            })
                          }
                        }}
                        alt="Screenshot preview"
                      />
                    </div>
                  </Frame>
                </div>

                <div
                  tabIndex={0}
                  role="slider"
                  aria-label="Resize canvas"
                  className="absolute bottom-2 right-2 size-4 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center cursor-nwse-resize z-50 shadow-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  style={{ touchAction: "none", userSelect: "none" }}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setIsResizing(true)
                    setResizeStart({
                      x: e.clientX,
                      y: e.clientY,
                      w: canvasWidth,
                      h: canvasHeight,
                    })
                    setUserResized(true)
                  }}
                  onTouchStart={(e) => {
                    if (e.touches.length === 1) {
                      setIsResizing(true)
                      setResizeStart({
                        x: e.touches[0]!.clientX,
                        y: e.touches[0]!.clientY,
                        w: canvasWidth,
                        h: canvasHeight,
                      })
                      setUserResized(true)
                    }
                  }}
                ></div>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "flex flex-col items-center justify-center p-12 border bg-white border-stone-200 rounded-xl cursor-pointer hover:border-stone-300 transition-all duration-300 backdrop-blur-sm"
              )}
            >
              <label
                htmlFor="screenshot-upload"
                className="cursor-pointer w-full"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="relative">
                    <ImagePlus
                      className={cn("size-6 text-stone-300", {
                        "text-indigo-500": isDragging,
                      })}
                    />
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xl font-medium text-stone-800">
                      {isDragging ? "Drop your image here" : "Add an image"}
                    </h3>
                    <p className="text-sm text-stone-500 max-w-sm">
                      Transform your images into{" "}
                      <span className="text-indigo-600 font-medium">
                        clear, beautiful visuals
                      </span>
                      . <br />
                      Drag & drop, paste, or click to upload.
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <span className="px-2 py-1 rounded-md bg-light-gray bg-opacity-75">
                        ⌘V
                      </span>
                      <span>to paste</span>
                    </div>
                  </div>
                </div>
                <input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPaste as any}
                />
              </label>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div
          className={cn(
            "bg-light-gray w-[19rem] rounded-lg0 p-6 min-h-full max-h-[80vh] overflow-y-auto",
            {
              hidden: !Boolean(blob.src),
            }
          )}
        >
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Grip className="size-4 text-stone-500" />
                  <span className="block font-medium text-xs text-stone-700">
                    Image Settings
                  </span>
                </div>
              </div>

              {/* Frame Popover */}
              <Popover>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1">
                    <span className="block text-xs font-medium text-gray-700">
                      Frame
                    </span>
                  </div>
                  <PopoverTrigger asChild>
                    <button
                      aria-label="Edit frame"
                      className="size-8 rounded-md border border-gray-300 flex items-center justify-center transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      <div className="size-7 rounded-sm relative overflow-hidden bg-white flex items-center justify-center">
                        <div className="size-6 border-2 border-gray-300 rounded-sm" />
                      </div>
                    </button>
                  </PopoverTrigger>
                </div>
                <PopoverContent align="end" className="relative z-[999] w-80">
                  <div>
                    <span className="block font-medium text-sm text-gray-900 mb-2">
                      Frame Style
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { type: "none" as const, label: "None" },
                        { type: "arc" as const, label: "Arc" },
                        { type: "stack" as const, label: "Stack" },
                      ].map((frame) => (
                        <div
                          key={frame.type}
                          className={cn(
                            "cursor-pointer flex flex-col items-center gap-1.5"
                          )}
                          onClick={() => {
                            setOptions({
                              ...options,
                              frame: frame.type,
                            })
                          }}
                        >
                          <div
                            className={cn(
                              "w-full h-14 rounded-md border border-gray-200 flex items-center justify-center bg-white overflow-hidden",
                              {
                                "ring-2 ring-blue-400":
                                  frame.type === options.frame,
                              }
                            )}
                          >
                            {/* <div
                              className="size-10"
                              style={{
                                border:
                                  frame.type === "none"
                                    ? "none"
                                    : `${options.frame.width}px ${frame.type} ${options.frame.color}`,
                                borderRadius: "4px",
                              }}
                            /> */}
                          </div>
                          <span className="text-xs text-gray-600">
                            {frame.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <EnhancedSlider
                value={options.screenshotScale}
                onChange={(value) =>
                  setOptions({ ...options, screenshotScale: value })
                }
                min={0.5}
                max={1.5}
                step={0.01}
                defaultValue={0.8}
                label="Size"
                unit="x"
              />
              <EnhancedSlider
                value={options.rotation}
                onChange={(value) =>
                  setOptions({ ...options, rotation: value })
                }
                min={0}
                max={360}
                step={1}
                defaultValue={0}
                label="Rotation"
                unit="°"
              />

              <EnhancedSlider
                value={options.rounded}
                onChange={(value) => setOptions({ ...options, rounded: value })}
                min={0}
                max={32}
                step={1}
                defaultValue={12}
                label="Roundness"
                unit="px"
              />

              <EnhancedSlider
                value={options.shadow}
                onChange={(value) => setOptions({ ...options, shadow: value })}
                min={0}
                max={4}
                step={1}
                label="Shadow"
              />

              <EnhancedSlider
                value={outlineSize}
                onChange={setOutlineSize}
                min={0}
                max={100}
                step={1}
                label="Inset"
              />

              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1">
                  <span className="block text-xs font-medium text-gray-700">
                    Inset color
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={outlineColor}
                    onChange={(e) => setOutlineColor(e.target.value)}
                    className="w-8 h-8 rounded-md border border-gray-300 cursor-pointer transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <Separator className="bg-gray-200" />

              <div className="flex flex-col gap-6 items-center justify-between">
                <div className="w-full flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Grip className="size-4 text-stone-500" />
                    <span className="block font-medium text-xs text-stone-700">
                      Background Settings
                    </span>
                  </div>
                </div>

                <Toggle
                  checked={options.noise}
                  label="Grain"
                  onCheckedChange={(checked) =>
                    setOptions({ ...options, noise: checked })
                  }
                />

                {/* Background Popover */}
                <Popover>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                      <span className="block text-xs font-medium text-gray-700">
                        Background
                      </span>
                      {/* <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500 w-fit font-mono">
                      {options.theme.includes("gradient")
                        ? "Gradient"
                        : options.theme.includes("white")
                          ? "White"
                          : "Solid"}
                    </span> */}
                    </div>
                    <PopoverTrigger asChild>
                      <button
                        aria-label="Edit background"
                        className="size-8 rounded-md border border-gray-300 flex items-center justify-center transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400"
                      >
                        <div
                          className={cn("size-7 rounded-sm", options.theme)}
                          style={{
                            background: options.theme.includes("gradient")
                              ? undefined
                              : options.theme,
                            backgroundImage: options.theme.includes("gradient")
                              ? undefined
                              : undefined,
                          }}
                        />
                      </button>
                    </PopoverTrigger>
                  </div>
                  <PopoverContent
                    align="end"
                    className="relativ z-[999] e w-80"
                  >
                    <div>
                      <span className="block font-medium text-sm text-gray-900 mb-2">
                        Background Presets
                      </span>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          "bg-gradient-to-br from-cyan-300 to-sky-400",
                          "bg-gradient-to-br from-green-300 to-emerald-400",
                          "bg-gradient-to-br from-indigo-300 to-violet-400",
                          "bg-gradient-to-br from-rose-300 to-pink-400",
                          "bg-gradient-to-br from-indigo-300 to-orange-400",
                          "bg-gradient-to-br from-purple-300 to-fuchsia-400",
                          "bg-gradient-to-br from-blue-300 to-indigo-400",
                          "bg-gradient-to-br from-teal-300 to-emerald-400",
                          "bg-gradient-to-br from-red-300 to-rose-400",
                          "bg-gradient-to-br from-yellow-200 to-indigo-400",

                          "bg-white",
                          "bg-stone-800",
                        ].map((theme) => (
                          <div
                            key={theme}
                            className={cn(
                              "cursor-pointer w-full h-8 rounded-md border",
                              theme,
                              theme === options.theme && "ring-2 ring-blue-400"
                            )}
                            onClick={() => {
                              setOptions({
                                ...options,
                                theme: theme,
                                customTheme: {
                                  colorStart: "#f3f4f6",
                                  colorEnd: "#e5e7eb",
                                },
                              })
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Pattern Popover */}
                <Popover>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                      <span className="block text-xs font-medium text-gray-700">
                        Pattern
                      </span>
                    </div>
                    <PopoverTrigger asChild>
                      <button
                        aria-label="Edit pattern overlay"
                        className={cn(
                          "size-8 rounded-md border border-gray-300 flex items-center justify-center transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-gray-400",
                          options.pattern.enabled ? "opacity-100" : "opacity-50"
                        )}
                      >
                        <div className="size-7 rounded-sm relative overflow-hidden bg-white flex items-center justify-center">
                          {options.pattern.enabled ? (
                            <div
                              className="w-full h-full relative"
                              style={{
                                backgroundImage: `url("/pattern/${options.pattern.type}.svg")`,
                                backgroundRepeat: "repeat",
                                backgroundSize:
                                  previewSizes[
                                    options.pattern
                                      .type as keyof typeof previewSizes
                                  ] || "25%",
                                opacity: 100,
                                transform: `rotate(${options.pattern.rotation}deg) scale(2)`,
                                imageRendering: "crisp-edges",
                              }}
                            />
                          ) : (
                            <span className="text-gray-400 text-xs">Off</span>
                          )}
                        </div>
                      </button>
                    </PopoverTrigger>
                  </div>
                  <PopoverContent
                    align="end"
                    className="w-80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <span className="block font-medium text-sm text-gray-900 mb-2">
                        Pattern Options
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { type: "none", label: "None" },
                          { type: "waves", label: "Waves" },
                          { type: "dots", label: "Dots" },
                          { type: "stripes", label: "Stripes" },
                          { type: "zigzag", label: "Zigzag" },
                          { type: "graphpaper", label: "Graph Paper" },
                        ].map((pattern) => (
                          <div
                            key={pattern.type}
                            className={cn(
                              "cursor-pointer flex flex-col items-center gap-1.5"
                            )}
                            onClick={() => {
                              setOptions({
                                ...options,
                                pattern: {
                                  ...options.pattern,
                                  type: pattern.type as any,
                                  enabled: pattern.type !== "none",
                                },
                              })
                            }}
                          >
                            <div
                              className={cn(
                                "w-full h-14 rounded-md border border-gray-200 flex items-center justify-center bg-white overflow-hidden",
                                {
                                  "ring-2 ring-blue-400":
                                    pattern.type === options.pattern.type,
                                }
                              )}
                            >
                              {pattern.type !== "none" ? (
                                <div
                                  className="w-full h-full relative"
                                  style={{
                                    backgroundImage: `url("/pattern/${pattern.type}.svg")`,
                                    backgroundRepeat: "repeat",
                                    backgroundSize: [
                                      "stripes",
                                      "zigzag",
                                    ].includes(pattern.type)
                                      ? "25%"
                                      : "85%",
                                    opacity: 0.3,
                                    transform: "rotate(45deg) scale(2)",
                                    imageRendering: "crisp-edges",
                                    WebkitBackfaceVisibility: "hidden",
                                    backfaceVisibility: "hidden",
                                    WebkitTransform: "translateZ(0)",
                                    WebkitFontSmoothing: "antialiased",
                                    MozOsxFontSmoothing: "grayscale",
                                  }}
                                />
                              ) : null}
                            </div>
                            <span className="text-xs text-gray-600">
                              {pattern.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 space-y-3">
                        <EnhancedSlider
                          disabled={options.pattern.type === "none"}
                          value={options.pattern.intensity}
                          onChange={(value) =>
                            setOptions({
                              ...options,
                              pattern: {
                                ...options.pattern,
                                intensity: value,
                              },
                            })
                          }
                          min={1}
                          max={100}
                          step={1}
                          label="Size"
                        />
                        <EnhancedSlider
                          disabled={options.pattern.type === "none"}
                          value={options.pattern.rotation}
                          onChange={(value) =>
                            setOptions({
                              ...options,
                              pattern: {
                                ...options.pattern,
                                rotation: value,
                              },
                            })
                          }
                          min={0}
                          max={360}
                          step={1}
                          label="Rotation"
                          unit="°"
                        />
                        <EnhancedSlider
                          disabled={options.pattern.type === "none"}
                          value={options.pattern.opacity}
                          onChange={(value) =>
                            setOptions({
                              ...options,
                              pattern: {
                                ...options.pattern,
                                opacity: value,
                              },
                            })
                          }
                          min={0}
                          max={35}
                          step={1}
                          label="Opacity"
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator className="bg-gray-200" />

            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => saveImage(3)}
              disabled={!blob?.src}
            >
              Looks good!
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


