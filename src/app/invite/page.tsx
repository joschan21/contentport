import { redis } from '@/lib/redis'
import InviteClient from './invite-client'

interface InvitePageProps {
  searchParams: Promise<{ id?: string }>
}

export default async function InvitePage({ searchParams }: InvitePageProps) {
  const inviteId = (await searchParams).id
  let isInvalid = false

  if (!inviteId) {
    isInvalid = true
  }

  const [invitedByUserId, inviterName] = await Promise.all([
    redis.get<string>(`invite:${inviteId}`),
    redis.get<string>(`invite:name:${inviteId}`),
  ])

  if (!invitedByUserId || !inviterName) {
    isInvalid = true
  }

  return (
    <InviteClient
      inviteId={inviteId as string}
      inviterName={inviterName as string}
      isInvalid={isInvalid}
    />
  )
}
