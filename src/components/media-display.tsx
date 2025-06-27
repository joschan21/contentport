import { useState } from 'react'
import DuolingoButton from '@/components/ui/duolingo-button'
import { AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
import { Loader } from './ui/loader'

interface MediaFile {
  url: string
  type: 'image' | 'gif' | 'video'
  uploading: boolean
  error?: string
}

interface MediaDisplayProps {
  mediaFiles: MediaFile[]
  selectionMode?: boolean
  removeMediaFile: (url: string) => void
}

export default function MediaDisplay({
  mediaFiles,
  selectionMode = false,
  removeMediaFile,
}: MediaDisplayProps) {
  const renderMediaOverlays = (mediaFile: MediaFile) => (
    <>
      {(mediaFile.uploading || mediaFile.error) && (
        <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
          {mediaFile.uploading && (
            <div className="flex flex-col gap-2 items-center text-white text-center">
              <Loader2 className="animate-spin text-white" />
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

      {/* {!selectionMode && (
        <DuolingoButton
          size="icon"
          variant="secondary"
          onClick={() => removeMediaFile(mediaFile.url)}
          className="absolute top-2 right-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-4 w-4" />
        </DuolingoButton>
      )} */}
    </>
  )

  return (
    <div className="mt-3 max-w-lg">
      {mediaFiles.length === 1 && mediaFiles[0] && (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-2xl border border-stone-200">
            {mediaFiles[0].type === 'video' ? (
              <video
                src={mediaFiles[0].url}
                className="w-full max-h-[510px] object-cover"
                controls={false}
              />
            ) : (
              <img
                src={mediaFiles[0].url}
                alt="Upload preview"
                className="w-full max-h-[510px] object-cover"
              />
            )}
            {renderMediaOverlays(mediaFiles[0])}
          </div>
        </div>
      )}

      {mediaFiles.length === 2 && (
        <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden border border-stone-200">
          {mediaFiles.map((mediaFile, index) => (
            <div key={mediaFile.url} className="relative group">
              <div className="relative overflow-hidden h-[254px]">
                {mediaFile.type === 'video' ? (
                  <video
                    src={mediaFile.url}
                    className="w-full h-full object-cover"
                    controls={false}
                  />
                ) : (
                  <img
                    src={mediaFile.url}
                    alt="Upload preview"
                    className="w-full h-full object-cover"
                  />
                )}
                {renderMediaOverlays(mediaFile)}
              </div>
            </div>
          ))}
        </div>
      )}

      {mediaFiles.length === 3 && mediaFiles[0] && (
        <div className="grid grid-cols-2 gap-0.5 rounded-2xl overflow-hidden border border-stone-200 h-[254px]">
          <div className="relative group">
            <div className="relative overflow-hidden h-full">
              {mediaFiles[0].type === 'video' ? (
                <video
                  src={mediaFiles[0].url}
                  className="w-full h-full object-cover"
                  controls={false}
                />
              ) : (
                <img
                  src={mediaFiles[0].url}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
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
                      controls={false}
                    />
                  ) : (
                    <img
                      src={mediaFile.url}
                      alt="Upload preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  {renderMediaOverlays(mediaFile)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mediaFiles.length === 4 && (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 rounded-2xl overflow-hidden border border-stone-200 h-[254px]">
          {mediaFiles.map((mediaFile, index) => (
            <div key={mediaFile.url} className="relative group">
              <div className="relative overflow-hidden h-full">
                {mediaFile.type === 'video' ? (
                  <video
                    src={mediaFile.url}
                    className="w-full h-full object-cover"
                    controls={false}
                  />
                ) : (
                  <img
                    src={mediaFile.url}
                    alt="Upload preview"
                    className="w-full h-full object-cover"
                  />
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
