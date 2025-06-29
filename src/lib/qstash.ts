import { getBaseUrl } from '@/constants/base-url'
import { Client } from '@upstash/qstash'

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN,
  baseUrl: getBaseUrl(),
})
