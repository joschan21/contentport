import { getBaseUrl } from '@/constants/base-url'
import { db } from '@/db'
import { account as accountSchema, user, user as userSchema } from '@/db/schema'
import { redis } from '@/lib/redis'
import { eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { customAlphabet } from 'nanoid'
import { TwitterApi } from 'twitter-api-v2'
import { z } from 'zod'
import { j, privateProcedure, publicProcedure } from '../jstack'
import { Account } from './settings-router'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { PostHog } from 'posthog-node'
import { qstash } from '@/lib/qstash'
import { getAccounts } from './utils/get-account'

const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: 'https://eu.i.posthog.com',
})

const nanoid = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  32,
)

const consumerKey = process.env.TWITTER_CONSUMER_KEY as string
const consumerSecret = process.env.TWITTER_CONSUMER_SECRET as string

const client = new TwitterApi({ appKey: consumerKey, appSecret: consumerSecret })

type AuthAction = 'onboarding' | 'invite' | 'add-account' | 're-authenticate'

const clientV2 = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!).readOnly

export const authRouter = j.router({
  send_magic_link: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .post(async ({ c, ctx, input }) => {
      const data = await auth.api.signInMagicLink({
        body: {
          email: input.email,
          callbackURL: '/onboarding',
        },
        headers: await headers(),
      })

      if (data.status) {
        return c.json({ status: 'success' })
      }

      return c.json({ error: 'Unable to produce magic link.' })
    }),

  updateOnboardingMetaData: privateProcedure
    .input(z.object({ userGoals: z.array(z.string()), userFrequency: z.number() }))
    .post(async ({ c, input, ctx }) => {
      await db
        .update(user)
        .set({
          goals: input.userGoals,
          frequency: input.userFrequency,
        })
        .where(eq(user.id, ctx.user.id))
      return c.json({ success: true })
    }),

  createTwitterLink: privateProcedure
    .input(z.object({ action: z.enum(['onboarding', 'add-account', 're-authenticate']) }))
    .query(async ({ c, input, ctx }) => {
      if (input.action === 'add-account' && ctx.user.plan !== 'pro') {
        throw new HTTPException(402, {
          message: 'Upgrade to Pro to connect more accounts.',
        })
      }

      console.log('ℹ️ Creating twitter link:', `${getBaseUrl()}/api/auth_router/callback`)

      try {
        const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(
          `${getBaseUrl()}/api/auth_router/callback`,
        )

        await Promise.all([
          redis.set(`twitter_oauth_secret:${oauth_token}`, oauth_token_secret),
          redis.set(`twitter_oauth_user_id:${oauth_token}`, ctx.user.id),
          redis.set(`auth_action:${oauth_token}`, input.action),
        ])

        return c.json({ url })
      } catch (err) {
        console.error(JSON.stringify(err, null, 2))
        throw new HTTPException(400, { message: 'Failed to create Twitter link' })
      }
    }),

  createInviteLink: privateProcedure.query(async ({ c, input, ctx }) => {
    if (ctx.user.plan !== 'pro') {
      throw new HTTPException(402, {
        message: 'Upgrade to Pro to connect more accounts.',
      })
    }

    const inviteId = nanoid()

    // invite valid for 24 hours
    await redis.set(`invite:${inviteId}`, ctx.user.id, { ex: 60 * 60 * 24 })
    await redis.set(`invite:name:${inviteId}`, ctx.user.name, { ex: 60 * 60 * 24 })

    const url = `${getBaseUrl()}/invite?id=${inviteId}`

    return c.json({ url })
  }),

  createTwitterInvite: publicProcedure
    .input(z.object({ inviteId: z.string() }))
    .query(async ({ c, input, ctx }) => {
      const invitedByUserId = await redis.get<string>(`invite:${input.inviteId}`)

      if (!invitedByUserId) {
        throw new HTTPException(400, { message: 'Invite has expired or is invalid' })
      }

      const { url, oauth_token, oauth_token_secret } = await client.generateAuthLink(
        `${getBaseUrl()}/api/auth_router/callback`,
      )

      await Promise.all([
        redis.set(`twitter_oauth_secret:${oauth_token}`, oauth_token_secret),
        redis.set(`twitter_oauth_user_id:${oauth_token}`, invitedByUserId),
        redis.set(`auth_action:${oauth_token}`, 'invite'),
        redis.set(`invite:id:${oauth_token}`, input.inviteId),
      ])

      return c.json({ url })
    }),

  callback: publicProcedure.get(async ({ c }) => {
    const oauth_token = c.req.query('oauth_token')
    const oauth_verifier = c.req.query('oauth_verifier')
    const baseUrl = getBaseUrl()

    const [storedSecret, userId, authAction, inviteId] = await Promise.all([
      redis.get<string>(`twitter_oauth_secret:${oauth_token}`),
      redis.get<string>(`twitter_oauth_user_id:${oauth_token}`),
      redis.get<AuthAction>(`auth_action:${oauth_token}`),
      redis.get<string>(`invite:id:${oauth_token}`),
    ])

    if (!userId) {
      throw new HTTPException(400, { message: 'Missing user id' })
    }

    if (!storedSecret || !oauth_token || !oauth_verifier) {
      throw new HTTPException(400, { message: 'Missing or expired OAuth secret' })
    }

    const client = new TwitterApi({
      appKey: consumerKey as string,
      appSecret: consumerSecret as string,
      accessToken: oauth_token as string,
      accessSecret: storedSecret as string,
    })

    const credentials = await client.login(oauth_verifier)

    await Promise.all([
      redis.del(`twitter_oauth_secret:${oauth_token}`),
      redis.del(`twitter_oauth_user_id:${oauth_token}`),
      redis.del(`invite:id:${oauth_token}`),
      redis.del(`auth_action:${oauth_token}`),
    ])

    const {
      client: loggedInClient,
      accessToken,
      accessSecret,
      screenName,
      userId: accountId,
    } = credentials

    const { data } = await clientV2.v2.userByUsername(screenName, {
      'user.fields': ['verified', 'verified_type'],
    })

    const userProfile = await loggedInClient.currentUser()

    const [user] = await db.select().from(userSchema).where(eq(userSchema.id, userId))

    if (!user) {
      throw new HTTPException(404, { message: 'user not found' })
    }

    const accounts = await getAccounts({ userId: user.id, email: user.email })

    for (const account of accounts) {
      if (account.twitterId === accountId) {
        await db
          .update(accountSchema)
          .set({ accessToken, accessSecret, updatedAt: new Date() })
          .where(eq(accountSchema.id, account.id))

        if (authAction === 'invite') {
          return c.redirect(baseUrl + `/invite/success?id=${inviteId}`)
        }

        if (authAction === 'add-account' || authAction === 're-authenticate') {
          return c.redirect(baseUrl + `/studio/accounts`)
        }

        if (authAction === 'onboarding') {
          return c.redirect(baseUrl + `/studio?onboarding=true`)
        }
      }
    }

    const dbAccountId = nanoid()

    await db
      .insert(accountSchema)
      .values({
        id: dbAccountId,
        accountId,
        createdAt: new Date(),
        updatedAt: new Date(),
        providerId: 'twitter',
        userId,
        accessToken,
        accessSecret,
      })
      .onConflictDoNothing()

    const connectedAccount = {
      id: dbAccountId,
      username: userProfile.screen_name,
      name: userProfile.name,
      profile_image_url: userProfile.profile_image_url_https,
      verified: data.verified,
      twitterId: data.id,
      useNaturalTimeByDefault: false,
    }

    const [_, exists] = await Promise.all([
      redis.json.set(`account:${user.email}:${dbAccountId}`, '$', connectedAccount),
      redis.exists(`active-account:${user.email}`),
    ])

    if (!exists) {
      await redis.json.set(`active-account:${user.email}`, '$', connectedAccount)
    }

    const url = process.env.NODE_ENV === 'development' ? process.env.NGROK_URL : baseUrl

    await Promise.all([
      redis.set(`status:posts:${connectedAccount.id}`, 'started', { ex: 60 * 2 }),
      qstash.publishJSON({
        url: url + '/api/knowledge/index_tweets',
        body: {
          userId: user.id,
          accountId: connectedAccount.id,
          handle: connectedAccount.username,
        },
      }),
      qstash.publishJSON({
        url: url + '/api/knowledge/index_memories',
        body: {
          userId: user.id,
          accountId: connectedAccount.id,
          handle: connectedAccount.username,
        },
      }),
    ])

    if (authAction === 'invite') {
      return c.redirect(baseUrl + `/invite/success?id=${inviteId}`)
    }

    if (authAction === 'add-account') {
      return c.redirect(baseUrl + `/studio/accounts?new_account_connected=true`)
    }

    return c.redirect(baseUrl + `/studio?onboarding=true`)
  }),
})
