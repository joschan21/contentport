import { MediaFile, useTweetsV2 } from '@/hooks/use-tweets-v2'
import { AlertCircle, Download, MessageSquarePlus, X } from 'lucide-react'
import DuolingoButton from '../ui/duolingo-button'
import toast from 'react-hot-toast'
import { useAttachments } from '@/hooks/use-attachments'
import { Loader } from '../ai-elements/loader'

const RenderMediaOverlay = ({
  tweetId,
  mediaFile,
}: {
  tweetId: string
  mediaFile: MediaFile
}) => {
  const { downloadMediaFile, removeMediaFile } = useTweetsV2()
  const { attachments, addVideoAttachment } = useAttachments()

  const handleAddVideoToChat = (mediaFile: MediaFile) => {
    if (mediaFile.type !== 'video' || !mediaFile.s3Key) {
      toast.error('Invalid video file')
      return
    }

    const existingAttachment = attachments.find(
      (att) => att.type === 'video' && att.fileKey === mediaFile.s3Key,
    )

    if (existingAttachment) {
      toast.error('Video already added to chat')
      return
    }

    const fileName = `Video transcript (${mediaFile.file?.name || 'uploaded video'})`
    addVideoAttachment(mediaFile.s3Key, fileName)
    toast.success('Video added to chat!')
  }

  return (
    <>
      {(mediaFile.uploading || mediaFile.error) && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center">
          {mediaFile.uploading && (
            <div className="text-white flex flex-col items-center gap-1.5 text-center">
              <Loader />
              <p className="text-sm/6 font-medium">Uploading</p>
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

      <div className="absolute top-2 right-2 flex gap-1">
        {mediaFile.type === 'video' && (
          <DuolingoButton
            disabled={!Boolean(mediaFile.uploaded) || !Boolean(mediaFile.s3Key)}
            size="icon"
            variant="secondary"
            onClick={() => handleAddVideoToChat(mediaFile)}
            title="Add video transcript to chat"
          >
            <MessageSquarePlus className="size-4" />
          </DuolingoButton>
        )}
        <DuolingoButton
          size="icon"
          variant="secondary"
          onClick={() => downloadMediaFile(mediaFile)}
        >
          <Download className="size-4" />
        </DuolingoButton>
        <DuolingoButton
          size="icon"
          variant="destructive"
          onClick={() => removeMediaFile(tweetId, mediaFile.id)}
        >
          <X className="h-4 w-4" />
        </DuolingoButton>
      </div>
    </>
  )
}

export const TweetMedia = ({
  tweetId,
  mediaFiles,
}: {
  tweetId: string
  mediaFiles: MediaFile[]
}) => {
  if (mediaFiles.length === 0) {
    return null
  }

  return (
    <div className="mt-3">
      {mediaFiles.length === 1 && mediaFiles[0] && (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-2xl border border-stone-200">
            {mediaFiles[0].type === 'video' ? (
              <video
                src={mediaFiles[0].url}
                className="w-full max-h-[510px] object-cover"
                controls
              />
            ) : (
              <img
                src={mediaFiles[0].url}
                alt="Upload preview"
                className="w-full max-h-[510px] object-cover"
              />
            )}

            <RenderMediaOverlay tweetId={tweetId} mediaFile={mediaFiles[0]} />
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
                    controls
                  />
                ) : (
                  <img
                    src={mediaFile.url}
                    alt="Upload preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <RenderMediaOverlay tweetId={tweetId} mediaFile={mediaFile} />
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
                  controls
                />
              ) : (
                <img
                  src={mediaFiles[0].url}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
              )}
              <RenderMediaOverlay tweetId={tweetId} mediaFile={mediaFiles[0]} />
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
                    <img
                      src={mediaFile.url}
                      alt="Upload preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <RenderMediaOverlay tweetId={tweetId} mediaFile={mediaFile} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mediaFiles.length === 4 && (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 rounded-2xl overflow-hidden border border-stone-200 h-[254px]">
          {mediaFiles.map((mediaFile) => (
            <div key={mediaFile.url} className="relative group">
              <div className="relative overflow-hidden h-full">
                {mediaFile.type === 'video' ? (
                  <video
                    src={mediaFile.url}
                    className="w-full h-full object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={mediaFile.url}
                    alt="Upload preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <RenderMediaOverlay tweetId={tweetId} mediaFile={mediaFile} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
