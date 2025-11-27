'use client'

import { Icons } from '@/components/icons'
import DuolingoBadge from '@/components/ui/duolingo-badge'
import DuolingoButton from '@/components/ui/duolingo-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { client } from '@/lib/client'
import { cn } from '@/lib/utils'
import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export function SignInForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [input, setInput] = useState<string>('')
  const router = useRouter()
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false)
  const searchParams = useSearchParams()

  const isExpired = searchParams.get('expired')

  const lastUsedMethod = authClient.getLastUsedLoginMethod()

  useEffect(() => {
    if (isExpired) {
      toast.error('This link has expired, please sign in again.')
      router.replace('/sign-in')
    }
  }, [isExpired])

  const { mutate, isPending, isSuccess, variables } = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      await client.auth_router.send_magic_link.$post({ email: input })
    },
    onSuccess: () => {
      toast.success(`Email sent to ${input}`)
    },
    onError: () => {
      toast.error(`Something went wrong, please try again.`)
    },
  })

  const handleSignIn = () => {
    mutate({ email: input })
  }

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true)

      const { error } = await authClient.signIn.social({
        provider: 'google',
      })

      if (error) throw new Error(error)
    } catch (err) {
      console.error(JSON.stringify(err, null, 2))
      toast.error('Error signing in, please try again!')
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <div className="relative z-10 isolate flex items-center -space-x-1.5">
        <img
          alt=""
          src="/jo.jpg"
          className="relative rotate-3 ring-3 ring-neutral-100 shadow-lg z-30 inline-block size-12 rounded-xl outline -outline-offset-1 outline-black/5"
        />
        <img
          alt=""
          src="/josh.jpg"
          className="relative -rotate-2 ring-3 ring-neutral-100 shadow-lg z-20 inline-block size-12 rounded-xl outline -outline-offset-1 outline-black/5"
        />
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-3xl font-semibold">Sign into your account ✌️</h3>
        <p className="text-base text-gray-500">The content engine for your business.</p>
      </div>
      <div className="grid gap-6">
        <div className="grid gap-1.5">
          <Label required htmlFor="email">
            Email
          </Label>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            id="email"
            type="email"
            placeholder="john@acme.com"
            required
          />
          {isSuccess && variables.email ? (
            <p className="text-sm text-indigo-600">Email sent to {variables?.email}!</p>
          ) : null}
        </div>
        <div className="relative">
          <DuolingoButton
            loading={isPending}
            onClick={handleSignIn}
            type="submit"
            className="w-full h-11"
          >
            Sign in
          </DuolingoButton>
          {lastUsedMethod === 'email' && (
            <DuolingoBadge variant="achievement" size="sm" className="absolute -top-2 -right-2">Last used</DuolingoBadge>
          )}
        </div>
        <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
          <span className="bg-gray-50 text-stone-400 relative z-10 px-4">OR</span>
        </div>
        <div className="relative">
          <DuolingoButton
            loading={isGoogleLoading}
            onClick={handleGoogleSignIn}
            variant="secondary"
            className="w-full h-11 gap-2"
          >
            <Icons.google className="size-4" />
            Google
          </DuolingoButton>
          {lastUsedMethod === 'google' && (
            <DuolingoBadge variant="achievement" size="sm" className="absolute -top-2 -right-2">Last used</DuolingoBadge>
          )}
        </div>
      </div>
      <div className="text-left text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/sign-up" className="underline underline-offset-2 text-indigo-600">
          Sign up
        </Link>
      </div>
    </div>
  )
}
