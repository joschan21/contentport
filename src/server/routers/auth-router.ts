import { DEFAULT_TWEETS } from '@/constants/default-tweet-preset'
import { db } from '@/db'
import { account, knowledgeDocument, user as userSchema } from '@/db/schema'
import { analyzeUserStyle } from '@/lib/prompt-utils'
import { redis } from '@/lib/redis'
import { and, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { customAlphabet } from 'nanoid'
import { TwitterApi } from 'twitter-api-v2'
import { j, privateProcedure, publicProcedure } from '../jstack'
import { z } from 'zod'
import { Account } from './settings-router'
import { getBaseUrl } from '@/constants/base-url'

import { PostHog } from 'posthog-node'

const posthog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: 'https://eu.i.posthog.com',
})

const nanoid = customAlphabet(
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  32,
)

const consumerKey = 'dtcZgPjt85VKEe4XrxhmTs0n5'
const consumerSecret = 'dSWDC5M4kROfyQPpiQiZDs5Y8eT8IWTUZ9HHBP6p0T15Iy6xk1'

const client = new TwitterApi({ appKey: consumerKey, appSecret: consumerSecret })

type AuthAction = 'onboarding' | 'invite' | 'add-account'

const clientV2 = new TwitterApi(process.env.TWITTER_BEARER_TOKEN!).readOnly

export const authRouter = j.router({
  createTwitterLink: privateProcedure
    .input(z.object({ action: z.enum(['onboarding', 'add-account']) }))
    .query(async ({ c, input, ctx }) => {
      console.log('⚠️⚠️⚠️ callback url:', `${getBaseUrl()}/api/auth_router/callback`)

      if (ctx.user.plan !== 'pro') {
        throw new HTTPException(402, {
          message: 'Upgrade to Pro to connect more accounts.',
        })
      }

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

    const accounts = await redis.scan(0, { match: `account:${user.email}:*` })

    console.log('accounts', accounts)

    const [, accountKeys] = accounts
    for (const accountKey of accountKeys) {
      const existingAccount = await redis.json.get<Account>(accountKey)
      if (existingAccount?.username === userProfile.screen_name) {
        if (authAction === 'invite') {
          return c.redirect(`${getBaseUrl()}/invite/success?id=${inviteId}`)
        }

        if (authAction === 'add-account') {
          return c.redirect(`${getBaseUrl()}/studio/accounts`)
        }

        return c.redirect(`${getBaseUrl()}/studio?account_connected=true`)
      }
    }

    const dbAccountId = nanoid()

    await db
      .insert(account)
      .values({
        id: dbAccountId,
        accountId: accountId,
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
    }

    await redis.json.set(`account:${user.email}:${dbAccountId}`, '$', connectedAccount)

    const exists = await redis.exists(`active-account:${user.email}`)

    if (!exists) {
      await redis.json.set(`active-account:${user.email}`, '$', connectedAccount)
    }

    const userTweets = await loggedInClient.v2.userTimeline(userProfile.id_str, {
      max_results: 30,
      'tweet.fields': [
        'public_metrics',
        'created_at',
        'text',
        'author_id',
        'note_tweet',
        'edit_history_tweet_ids',
        'in_reply_to_user_id',
        'referenced_tweets',
      ],
      'user.fields': ['username', 'profile_image_url', 'name'],
      exclude: ['retweets', 'replies'],
      expansions: ['author_id'],
    })

    // NEW
    const styleKey = `style:${user.email}:${dbAccountId}`

    if (!userTweets.data.data) {
      await redis.json.set(styleKey, '$', {
        tweets: DEFAULT_TWEETS,
        prompt: '',
      })
    } else {
      const filteredTweets = userTweets.data.data?.filter(
        (tweet) =>
          !tweet.in_reply_to_user_id &&
          !tweet.referenced_tweets?.some((ref) => ref.type === 'replied_to'),
      )
      const tweetsWithStats = filteredTweets.map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        created_at: tweet.created_at || '',
      }))
      const sortedTweets = tweetsWithStats.sort((a, b) => b.likes - a.likes)
      const topTweets = sortedTweets.slice(0, 20)
      const author = userProfile
      let formattedTweets = topTweets.map((tweet) => {
        const cleanedText = tweet.text.replace(/https:\/\/t\.co\/\w+/g, '').trim()
        return {
          id: tweet.id,
          text: cleanedText,
          created_at: tweet.created_at,
          author_id: userProfile.id_str,
          edit_history_tweet_ids: [tweet.id],
          author: author
            ? {
                username: author.screen_name,
                profile_image_url: author.profile_image_url_https,
                name: author.name,
              }
            : null,
        }
      })
      if (formattedTweets.length < 20) {
        const existingIds = new Set(formattedTweets.map((t) => t.id))
        for (const defaultTweet of DEFAULT_TWEETS) {
          if (formattedTweets.length >= 20) break
          if (!existingIds.has(defaultTweet.id)) {
            formattedTweets.push(defaultTweet)
            existingIds.add(defaultTweet.id)
          }
        }
      }
      await redis.json.set(styleKey, '$', {
        tweets: formattedTweets.reverse(),
        prompt: '',
      })
      const styleAnalysis = await analyzeUserStyle(formattedTweets)

      // NEW
      const draftStyleKey = `draft-style:${dbAccountId}`
      await redis.json.set(draftStyleKey, '$', styleAnalysis)
    }

    const hasExistingExamples = await db.query.knowledgeDocument.findFirst({
      where: and(
        eq(knowledgeDocument.isExample, true),
        eq(knowledgeDocument.userId, user.id),
      ),
    })

    if (!Boolean(hasExistingExamples)) {
      await db.insert(knowledgeDocument).values([
        {
          userId: userId,
          fileName: '',
          type: 'url',
          s3Key: '',
          title: 'Introducing Zod 4',
          description:
            "An article about the Zod 4.0 release. After a year of active development: Zod 4 is now stable! It's faster, slimmer, more tsc-efficient, and implements some long-requested features.",
          isExample: true,
          sourceUrl: 'https://zod.dev/v4',
        },
        {
          userId: userId,
          fileName: 'data-fetching.png',
          type: 'image',
          s3Key: 'knowledge/4bBacfDWPhQzOzN479b605xuippnbKzF/Lsv-t_5_EMwNXW8jptBYG.png',
          title: 'React Hooks Cheatsheet - Visual Guide',
          isExample: true,
          sourceUrl: '',
        },
      ])
    }

    posthog.capture({
      distinctId: user.id,
      event: 'user_account_connected',
      properties: {
        userId: user.id,
        accountId: dbAccountId,
        accountName: userProfile.name,
        reason: authAction,
      },
    })

    await posthog.shutdown()

    if (authAction === 'invite') {
      return c.redirect(`${getBaseUrl()}/invite/success?id=${inviteId}`)
    }

    if (authAction === 'add-account') {
      return c.redirect(`${getBaseUrl()}/studio/accounts`)
    }

    return c.redirect(`${getBaseUrl()}/studio?account_connected=true`)
  }),
})
