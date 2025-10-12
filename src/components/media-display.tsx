import { AlertCircle, X } from 'lucide-react'
import { useState } from 'react'
import { Loader } from './ai-elements/loader'
import { Modal } from './ui/modal'

interface MediaFile {
  url: string
  type: 'image' | 'gif' | 'video'
  uploading: boolean
  error?: string
}

interface MediaDisplayProps {
  mediaFiles: MediaFile[]
  selectionMode?: boolean
  removeMediaFile?: (url: string) => void
}

export default function MediaDisplay({
  mediaFiles,
  selectionMode = false,
  removeMediaFile,
}: MediaDisplayProps) {
  const [openImageUrl, setOpenImageUrl] = useState<string | null>(null)

  const renderMediaOverlays = (mediaFile: MediaFile) => (
    <>
      {(mediaFile.uploading || mediaFile.error) && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          {mediaFile.uploading && (
            <div className="flex flex-col gap-2 items-center text-white text-center">
              <Loader />
              <p className="text-sm">Uploading</p>
            </div>
          )}
          {mediaFile.error && (
            <div className="text-white text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">{mediaFile.error}</p>
            </div>
          )}
        </div>
      )}
    </>
  )

  const renderImage = (mediaFile: MediaFile, className: string) => (
    <>
      <img
        src={mediaFile.url}
        alt="Upload preview"
        className={`${className} cursor-pointer rounded-lg hover:opacity-90 transition-opacity`}
        onClick={() => setOpenImageUrl(mediaFile.url)}
      />
      <Modal
        showModal={openImageUrl === mediaFile.url}
        setShowModal={(open) => setOpenImageUrl(open ? mediaFile.url : null)}
        className="max-w-4xl w-full h-fit max-h-[90vh] p-0 bg-transparent border-none shadow-none"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <div className="relative">
            <img
              src={mediaFile.url}
              alt="Image zoom view"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setOpenImageUrl(null)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-all"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      </Modal>
    </>
  )

  return (
    <div className="mt-3 max-w-full">
      {mediaFiles.length === 1 && mediaFiles[0] && (
        <div className="relative group">
          <div className="relative overflow-hidden">
            {mediaFiles[0].type === 'video' ? (
              <video
                src={mediaFiles[0].url}
                className="w-full max-h-[510px] object-cover"
                controls
              />
            ) : (
              renderImage(mediaFiles[0], 'w-full max-h-[510px] object-cover')
            )}
            {renderMediaOverlays(mediaFiles[0])}
          </div>
        </div>
      )}

      {mediaFiles.length === 2 && (
        <div className="grid grid-cols-2 gap-0.5 overflow-hidden">
          {mediaFiles.map((mediaFile, index) => (
            <div key={mediaFile.url} className="relative group">
              <div className="relative overflow-hidden h-[254px]">
                {mediaFile.type === 'video' ? (
                  <video
                    src={mediaFile.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  renderImage(mediaFile, 'w-full h-full object-cover')
                )}
                {renderMediaOverlays(mediaFile)}
              </div>
            </div>
          ))}
        </div>
      )}

      {mediaFiles.length === 3 && mediaFiles[0] && (
        <div className="grid grid-cols-2 gap-0.5 overflow-hidden h-[254px]">
          <div className="relative group">
            <div className="relative overflow-hidden h-full">
              {mediaFiles[0].type === 'video' ? (
                <video
                  src={mediaFiles[0].url}
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                renderImage(mediaFiles[0], 'w-full h-full object-cover')
              )}
              {renderMediaOverlays(mediaFiles[0])}
            </div>
          </div>
          <div className="grid grid-rows-2 gap-0.5">
            {mediaFiles.slice(1).map((mediaFile, index) => (
              <div key={mediaFile.url} className="relative group">
                <div className="relative overflow-hidden h-full">
                  {mediaFile.type === 'video' ? (
                    <video
                      src={mediaFile.url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  ) : (
                    renderImage(mediaFile, 'w-full h-full object-cover')
                  )}
                  {renderMediaOverlays(mediaFile)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mediaFiles.length === 4 && (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden h-[254px]">
          {mediaFiles.map((mediaFile, index) => (
            <div key={mediaFile.url} className="relative group">
              <div className="relative overflow-hidden h-full">
                {mediaFile.type === 'video' ? (
                  <video
                    src={mediaFile.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  renderImage(mediaFile, 'w-full h-full object-cover')
                )}
                {renderMediaOverlays(mediaFile)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
