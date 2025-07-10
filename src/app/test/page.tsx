'use client'

import { client } from '@/lib/client'

const Page = () => {
  return (
    <button
      onClick={async () => {
        const res = await client.tweet.getHandles.$get({
          query: 'joshtriedcoding',
        })

        const json = await res.json()

        console.log(json)
      }}
    >
      do it
    </button>
  )
}

export default Page
