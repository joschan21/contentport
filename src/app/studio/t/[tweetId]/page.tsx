import TweetEditor from '@/components/tweet-editor/tweet-editor'
import { db } from '@/db'
import { tweets } from '@/db/schema'
import { eq } from 'drizzle-orm'

type Props = {
  params: Promise<{ tweetId: string }>
  searchParams: Promise<{ existingContent?: string }>
}

export default async function StudioPage({ params, searchParams }: Props) {
  const { tweetId } = await params
  const { existingContent } = await searchParams

  // TODO: add user constraint
  const [tweet] = await db.select().from(tweets).where(eq(tweets.id, tweetId))

  const initialEditorString = JSON.stringify({
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: tweet?.content || existingContent || '',
              type: 'text',
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  })

  return (
    <>
      <div className="max-w-xl w-full mx-auto">
        <TweetEditor tweetId={tweetId} initialEditorString={initialEditorString} />
      </div>
    </>
  )
}
