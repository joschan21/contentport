import { Index } from '@upstash/vector'
import { nanoid } from 'nanoid'
import { redis } from '@/lib/redis'
import { createHash } from 'crypto'

const index = new Index({
  url: 'https://relaxing-wasp-48618-us1-vector.upstash.io',
  token:
    'ABcFMHJlbGF4aW5nLXdhc3AtNDg2MTgtdXMxYWRtaW5OMkkyTldWbE1qRXROekV5TXkwME5UY3lMV0poTVdRdFpUWXhNalV3TURneE5XSXg=',
})

const hashNamespaceUrl = (url: string): string => {
  const hash = createHash('sha256').update(url).digest('hex')
  return `sitemap_${hash.substring(0, 32)}`
}

export class Knowledge {
  static async add(userId: string, data: string) {
    const namespace = index.namespace(userId)
    return await namespace.upsert({
      id: nanoid(),
      data,
      metadata: { userId, data },
    })
  }

  static async get(userId: string, args: Parameters<typeof index.query>[0]) {
    const namespace = index.namespace(userId)
    return await namespace.query(args)
  }
}

export class Sitemap {
  static async add(id: string, links: string[]) {
    const namespace = index.namespace(id)

    const batchSize = 1_000
    const results = []

    // upstash vector has max batch size of 1_000
    for (let i = 0; i < links.length; i += batchSize) {
      const batch = links.slice(i, i + batchSize)
      const result = await namespace.upsert(
        batch.map((link) => ({
          id: link,
          data: link,
        })),
      )
      results.push(result)
    }

    return results
  }

  static async get(id: string, topic: string) {
    const namespace = index.namespace(id)

    const res = await namespace.query({
      data: topic,
      topK: 50,
      includeData: true,
      includeMetadata: true,
    })

    const links = res.map((doc) => doc.data).filter(Boolean)

    return links
  }
}

export class Memories {
  static async add({ accountId, data }: { accountId: string; data: string }) {
    const namespace = index.namespace(`memories:${accountId}`)
    const memoryId = nanoid()
    const timestamp = Date.now()

    await namespace.upsert({
      id: memoryId,
      data,
      metadata: { accountId, data, id: memoryId, timestamp },
    })

    return { id: memoryId, timestamp }
  }

  static async get(userId: string, args: Parameters<typeof index.query>[0]) {
    const namespace = index.namespace(`memories:${userId}`)
    try {
      const results = await namespace.query({ ...args, includeMetadata: true })

      const orderedResults = results.sort((a, b) => {
        return (a.metadata!.timestamp as number) - (b.metadata!.timestamp as number)
      })

      return orderedResults
    } catch (err) {
      return []
    }
  }

  static async deleteAll({ accountId }: { accountId: string }) {
    await index.deleteNamespace(`memories:${accountId}`)

    return { success: true }
  }

  static async delete({ accountId, memoryId }: { accountId: string; memoryId: string }) {
    const namespace = index.namespace(`memories:${accountId}`)

    await namespace.delete(memoryId)

    return { success: true }
  }
}
