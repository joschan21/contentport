import { Client } from '@upstash/qstash'

export const qstash = new Client({
  token: Bun.env.QSTASH_TOKEN,
})
