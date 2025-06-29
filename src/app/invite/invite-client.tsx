'use client'

import { client } from '@/lib/client'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Twitter, UserPlus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import DuolingoButton from '@/components/ui/duolingo-button'
import { HTTPException } from 'hono/http-exception'

type Props = {
  isInvalid: boolean
  inviteId: string
  inviterName: string
}

export default function InviteClient({ isInvalid, inviteId, inviterName }: Props) {
  const router = useRouter()

  const { mutate: acceptInvite, isPending: isAccepting } = useMutation({
    mutationFn: async () => {
      const res = await client.auth_router.createTwitterInvite.$get({ inviteId })
      return await res.json()
    },
    onSuccess: ({ url }) => {
      window.location.href = url
    },
    onError: (error: HTTPException) => {
      toast.error(error.message || 'Invalid or expired invite')
      setTimeout(() => {
        router.push('/')
      }, 2000)
    },
  })

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl bg-clip-padding border border-stone-900 border-opacity-10 p-8 text-center">
          {isInvalid ? (
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 bg-red-50 rounded-full mb-6">
                <X className="size-6 text-red-600" />
              </div>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-50 rounded-full mb-6">
              <UserPlus className="size-6 text-indigo-600" />
            </div>
          )}

          <h1 className="text-2xl font-bold text-stone-900 mb-2">
            {isInvalid ? 'Invalid Invite' : "You've been invited!"}
          </h1>

          <p className="text-stone-600 mb-8 leading-relaxed">
            {isInvalid ? (
              <span>
                This invite is invalid or has expired. Please ask the sender to send you a
                new invite.
              </span>
            ) : (
              <span>
                <span className="font-semibold">{inviterName}</span> has invited you to
                create content for your Twitter account. To do this, you need to grant
                access to your Twitter account.
              </span>
            )}
          </p>

          {!isInvalid && (
            <div className="space-y-4">
              <DuolingoButton
                onClick={() => acceptInvite()}
                disabled={isAccepting}
                className="w-full"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 size-5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Twitter className="mr-2 size-5" />
                    Connect Twitter Account
                  </>
                )}
              </DuolingoButton>

              <p className="text-xs text-stone-500">
                You'll be redirected to Twitter to authorize your account
              </p>
            </div>
          )}
        </div>

        {!isInvalid && (
          <div className="mt-6 text-center">
            <p className="text-sm text-stone-500">
              Make sure you're already logged in to the right Twitter account:{' '}
              <a
                href="https://x.com/account/switch"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
              >
                switch accounts
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
