import TweetEditor from '@/components/tweet-editor/tweet-editor'
import { nanoid } from 'nanoid'

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
            text: '',
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

const Page = () => {
  return (
    <>
      {/* {isOpen ? <OnboardingModal onOpenChange={setIsOpen} /> : null} */}
      <div className="max-w-xl w-full mx-auto">
        <TweetEditor
          // key={nanoid()}
          initialEditorString={initialEditorString}
          tweetId={null}
        />
      </div>
    </>
  )
}

export default Page
