interface StreamHookOptions {
  onTweetResult?: (data: any) => void
  [key: string]: ((data: any) => void) | undefined
}

const activeProcessors = new Set<AbortController>()

export function registerStreamHooks(response: Response, hooks: StreamHookOptions) {
  if (!response.body) return

  const controller = new AbortController()
  activeProcessors.add(controller)

  const processStream = async () => {
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    try {
      while (!controller.signal.aborted) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('2:')) {
            try {
              const dataContent = line.slice(2)
              const parsedData = JSON.parse(dataContent)

              if (Array.isArray(parsedData)) {
                for (const item of parsedData) {
                  if (
                    item &&
                    typeof item === 'object' &&
                    'hook' in item &&
                    typeof (item as any).hook === 'string'
                  ) {
                    const hookKey = (item as any).hook
                    const callback = hooks[hookKey]
                    
                    if (callback) {
                      try {
                        callback((item as any).data)
                      } catch (error) {
                        console.error(`Error in hook callback for '${hookKey}':`, error)
                      }
                    }
                  }
                }
              }
            } catch (e) {
              console.warn('Failed to parse data chunk:', e)
            }
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('Stream processing error:', error)
      }
    } finally {
      activeProcessors.delete(controller)
    }
  }

  processStream()
}

export function clearStreamHooks() {
  activeProcessors.forEach(controller => controller.abort())
  activeProcessors.clear()
}
