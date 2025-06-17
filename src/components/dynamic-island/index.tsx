"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mic,
  X,
  ArrowUp,
  Check,
  Sparkles,
  CornerDownRight,
  ChevronsUp,
  CheckCheck,
} from "lucide-react"
import { Waveform } from "./waveform"
import { TextWithShine } from "./text-with-shine"
import { useVoice } from "@/components/voice-context"
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  EditorState,
  LexicalEditor,
  $createTextNode,
  $createParagraphNode,
  RangeSelection,
  $createRangeSelection,
  $setSelection,
} from "lexical"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { InferOutput } from "@/server"
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext"
import { Icons } from "../icons"
import { formatCode } from "@/lib/code-action-menu-plugin"
import { useEditor } from "@/hooks/use-editors"

type SubmissionStatus = "idle" | "generating" | "confirmation"
type Output = InferOutput["voice"]["transcribe"]

export function DynamicIsland() {
  const editor = useEditor("tweet-editor")
  const {
    transcribe,
    isProcessing,
    isGenerating,
    setCurrentCommand,
    completion,
    acceptCompletion,
    rejectCompletion,
  } = useVoice()
  const [isRecording, setIsRecording] = useState(false)
  const [audioData, setAudioData] = useState<number[]>([])
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatus>("idle")
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const editorStateRef = useRef<EditorState | null>(null)

  // // Handle editor updates when command changes
  // useEffect(() => {
  //   if (currentCommand && submissionStatus === "confirmation") {
  //     editor.update(() => {
  //       const root = $getRoot()
  //       const selection = $getSelection()

  //       if ($isRangeSelection(selection)) {
  //         // If there's a selection, replace it with the command
  //         selection.deleteCharacter(true)
  //         selection.insertText(currentCommand)
  //       } else {
  //         // If no selection, insert at cursor position
  //         const cursor = selection?.getNodes()[0]
  //         if (cursor) {
  //           const textContent = cursor.getTextContent()
  //           const newTextNode = $createTextNode(textContent + currentCommand)
  //           cursor.replace(newTextNode)
  //         } else {
  //           // If no cursor, append to the end
  //           const lastChild = root.getLastChild()
  //           if (lastChild) {
  //             const textContent = lastChild.getTextContent()
  //             const newTextNode = $createTextNode(textContent + currentCommand)
  //             lastChild.replace(newTextNode)
  //           } else {
  //             const textNode = $createTextNode(currentCommand)
  //             root.append(textNode)
  //           }
  //         }
  //       }
  //     })
  //   }
  // }, [currentCommand, submissionStatus, editor])

  // Update editor state when it changes
  useEffect(() => {
    const unsubscribe = editor?.registerUpdateListener(({ editorState }) => {
      editorStateRef.current = editorState
    })
    // return () => unsubscribe()
  }, [editor])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K to start recording
      if ((e.metaKey || e.ctrlKey) && e.key === " ") {
        e.preventDefault()
        if (!isRecording) {
          startRecording()
        }

        // editor.update(() => {
        //   const selection = $getSelection()

        //   if ($isRangeSelection(selection)) {
        //     const anchor = selection.anchor

        //     // Create a new collapsed selection at the anchor point
        //     const collapsedSelection = $createRangeSelection()
        //     collapsedSelection.anchor.set(
        //       anchor.key,
        //       anchor.offset,
        //       anchor.type
        //     )
        //     collapsedSelection.focus.set(anchor.key, anchor.offset, anchor.type)

        //     $setSelection(collapsedSelection)
        //   }
        // })
      }

      // ESC to close/cancel at any time
      if (e.key === "Escape" && isRecording) {
        e.preventDefault()
        if (["generating"].includes(submissionStatus)) {
          cancelProcess()
        } else if (submissionStatus === "idle") {
          stopRecording(true)
        } else if (submissionStatus === "confirmation") {
          rejectResult()
        }
      }

      // Enter to submit during recording or accept during confirmation
      if (e.key === "Enter" && isRecording) {
        e.preventDefault()
        e.stopPropagation()
        if (submissionStatus === "confirmation") {
          handleAcceptResult()
        }

        if (submissionStatus === "idle") {
          submitRecording()
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown, true)
    return () => window.removeEventListener("keydown", handleKeyDown, true)
  }, [isRecording, submissionStatus])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close()
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const startRecording = async () => {
    setSubmissionStatus("idle")

    setIsRecording(true)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Set up audio context and analyser
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyserRef.current = analyser
      analyser.fftSize = 256

      const source = audioContext.createMediaStreamSource(stream)
      source.connect(analyser)

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)
      dataArrayRef.current = dataArray

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      })
      mediaRecorderRef.current = mediaRecorder

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start(100) // Collect data every 100ms

      // Start visualizing audio
      visualizeAudio()
    } catch (err) {
      console.error("Error accessing microphone:", err)
      setIsRecording(false) // Revert state if there's an error
    }
  }

  const visualizeAudio = () => {
    if (!analyserRef.current || !dataArrayRef.current) return

    const updateWaveform = () => {
      analyserRef.current!.getByteTimeDomainData(dataArrayRef.current!)

      // Convert to normalized values for visualization
      const normalizedData = Array.from(dataArrayRef.current!).map(
        (value) => value / 128 - 1
      )

      setAudioData(normalizedData)
      animationFrameRef.current = requestAnimationFrame(updateWaveform)
    }

    updateWaveform()
  }

  const stopRecording = (abort = true) => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop())
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close()
    }

    if (abort) {
      setIsRecording(false)
      setAudioData([])
      setSubmissionStatus("idle")
      console.log("Recording aborted")
    }
  }

  const cancelProcess = () => {
    // Clear any pending timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Reset to idle state
    setIsRecording(false)
    setAudioData([])
    setSubmissionStatus("idle")
    console.log("Process cancelled")
  }

  const submitRecording = async () => {
    // Stop the recording but don't reset UI yet
    stopRecording(false)

    // Go directly to generating state
    setSubmissionStatus("generating")

    try {
      // Create blob from audio chunks with explicit MIME type
      const audioBlob = new Blob(audioChunksRef.current, {
        type: "audio/webm;codecs=opus",
      })

      // Convert blob to base64
      const audioBase64 = await blobToBase64(audioBlob)

      // Get current document state
      const getDocumentState = () => {
        let documentState = {
          fullText: "",
          selectedText: "",
          cursorPosition: -1,
        }

        editor?.getEditorState().read(() => {
          const root = $getRoot()
          const selection = $getSelection()

          // Get full text content
          documentState.fullText = root.getTextContent()

          // Get selection info if there is a selection
          if ($isRangeSelection(selection)) {
            documentState.selectedText = selection.getTextContent()
            documentState.cursorPosition = selection.anchor.offset
          } else {
            // If no selection, use the current cursor position
            const cursor = selection?.getNodes()[0]
            if (cursor) {
              documentState.cursorPosition = cursor.getTextContent().length
            }
          }
        })

        return documentState
      }

      const documentState = getDocumentState()

      // Send to backend using the context
      transcribe({ audioBase64, documentState })
    } catch (err) {
      console.error("Error processing audio:", err)
      setSubmissionStatus("idle")
    }
  }

  // Update submission status based on isGenerating
  useEffect(() => {
    if (isGenerating) {
      setSubmissionStatus("generating")
    } else if (submissionStatus === "generating" && !isProcessing) {
      setSubmissionStatus("confirmation")
    }
  }, [isGenerating, isProcessing])

  const handleAcceptResult = () => {
    console.log("accept res")
    acceptCompletion()

    setIsRecording(false)
    setAudioData([])
    setSubmissionStatus("idle")
    setCurrentCommand("")
  }

  const rejectResult = () => {
    // Reset to idle state
    setIsRecording(false)
    setAudioData([])
    setSubmissionStatus("idle")
    setCurrentCommand("")
    rejectCompletion()
    console.log("Result rejected")
  }

  // Helper to convert Blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        const dataPart = base64.split(",")[1] || ""
        resolve(dataPart)
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const Spinner = () => (
    <div className="w-4 h-4 relative flex items-center justify-center">
      <div className="w-3 h-3 rounded-full border-2 border-stone-500/60 border-t-stone-300 animate-spin" />
    </div>
  )

  // Consistent styling for accept buttons
  const acceptButtonClass =
    "w-8 h-8 rounded-full bg-indigo-900/60 flex items-center justify-center hover:bg-indigo-800/70 transition-colors"
  const acceptIconClass = "text-indigo-300"

  // Consistent styling for cancel buttons
  const cancelButtonClass =
    "w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center hover:bg-stone-700 transition-colors"
  const cancelIconClass = "text-stone-300"

  // Determine which processing state UI to show
  const renderProcessingState = useCallback(() => {
    switch (submissionStatus) {
      case "generating":
        return (
          <div className="flex items-center space-x-2">
            <Spinner />
            <TextWithShine text="Generating..." />
          </div>
        )
      case "confirmation":
        return (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <CheckCheck size={16} className="text-stone-500" />
            </div>
            <span className="text-stone-300 text-sm">Accept result?</span>
          </div>
        )
      default:
        return null
    }
  }, [submissionStatus])

  return (
    <div className="fixed top-12 inset-x-0 flex justify-center">
      {/* <button className="relative z-100" onClick={() => {
        console.log('blicked');
        formatCode(editor, "codewtf")
      }}>format code</button>, */}
      <motion.div
        className="bg-stone-800 text-stone-300 rounded-full shadow-lg overflow-hidden font-medium tracking-tight"
        animate={{
          width: isRecording ? 320 : 170,
          height: isRecording ? 60 : 40,
          borderRadius: isRecording ? 20 : 100,
          y: isRecording ? -7 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 28,
          duration: 0.2,
        }}
        style={{
          transformOrigin: "center center", // Ensure it expands from center
        }}
      >
        <AnimatePresence mode="wait">
          {isRecording ? (
            ["generating", "confirmation"].includes(submissionStatus) ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full flex items-center justify-between px-4"
              >
                {renderProcessingState()}

                {submissionStatus === "confirmation" ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAcceptResult}
                      className={acceptButtonClass}
                      aria-label="Accept result"
                      title="Accept (Enter)"
                    >
                      <Check size={16} className={acceptIconClass} />
                    </button>
                    <button
                      onClick={rejectResult}
                      className={cancelButtonClass}
                      aria-label="Reject result"
                      title="Reject (Esc)"
                    >
                      <X size={16} className={cancelIconClass} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={cancelProcess}
                    className={cancelButtonClass}
                    aria-label="Cancel"
                    title="Cancel (Esc)"
                  >
                    <X size={16} className={cancelIconClass} />
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="recording"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-full h-full flex items-center justify-between px-4"
              >
                <div className="flex items-center space-x-2">
                  <RecordingIndicator />
                  <div className="flex-1 h-full flex items-center">
                    <Waveform data={audioData} />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={submitRecording}
                    className={acceptButtonClass}
                    aria-label="Submit recording"
                    title="Submit (Enter)"
                  >
                    <ArrowUp size={16} className={acceptIconClass} />
                  </button>
                  <button
                    onClick={() => stopRecording(true)}
                    className={cancelButtonClass}
                    aria-label="Cancel recording"
                    title="Cancel (Esc)"
                  >
                    <X size={16} className={cancelIconClass} />
                  </button>
                </div>
              </motion.div>
            )
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full group h-full flex items-center justify-center cursor-pointer"
              onClick={startRecording}
            >
              <Icons.microphone className="size-3.5 transition-colors mr-2" />
              <span className="transition-colors group-hover:text-stone-300 text-sm/6">
                Make changes
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

const RecordingIndicator = () => (
  <div className="w-4 h-4 flex items-center justify-center">
    <motion.div className="w-2 h-2 rounded-full animate-pulse bg-indigo-600" />
  </div>
)
