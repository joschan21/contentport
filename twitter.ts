import "dotenv/config"
import { db } from "./src/db"
import { user } from "./src/db/schema"
import { redis } from "./src/lib/redis"
import { xai } from "@ai-sdk/xai"
import { generateText } from "ai"
import { DEFAULT_TWEETS } from "./src/constants/default-tweet-preset"

const allowlist = [
  'akashp1712@gmail.com',
  'akshathg7@gmail.com',
  'alvarofragosoc@gmail.com',
  'dtlvan@gmail.com',
  'harsh@formbricks.com',
  'hey@omidshabab.com',
  'jarrerh@gmail.com',
  'khoaizahmmed@gmail.com',
  'khvala@macpaw.com',
  'lindorf85@gmail.com',
  'liweizhismd@gmail.com',
  'luca@studiopiccinotti.it',
  'michel.binkhorst@xs4all.nl',
  'neske.joscha@gmail.com',
  'oluwaseunmauwedo@gmail.com',
  'p.homoky@gmail.com',
  'priart@gmail.com',
  'rohitmeshram000@gmail.com',
  'tommy.roman.hater@gmail.com',
  'vurukondasaiteja13@gmail.com',
  'joscha7676@gmail.com',
  'jcodog@cleoai.cloud',
  'hola@tomasholtz.com',
  'jorge@heyjorge.dev',
  'hello@joshtriedcoding.com',
  '8020ui@gmail.com',
  'danielcspaiva@gmail.com',
  'getoaarm1@gmail.com',
  'johnyeocx@gmail.com',
  'joscha7676@gmail.com',
  'me@nevillebrem.com',
  'myhappyagency@gmail.com',
  'ourrahmaan@gmail.com',
  'ratan.maurya@gmail.com',
  'stefanbinoj.007@gmail.com',
  'taikimingqu@gmail.com',
  'nizabizaher@gmail.com',
  'jokirillmeerkatz@outlook.de',
  '2607jojo@gmail.com',
  'pietro.dev.07@gmail.com',
  'lucapiccinotti.lp@gmail.com',
  'rathoursourabh5@gmail.com',
  'jonathan@fabworks.com',
  'justin.s.ragland@gmail.com',
  'shahram.ask.546@gmail.com',
  'hello@developeratul.com',
  'thepiyushchandwani@gmail.com',
  'jdaly2991@gmail.com',
  'dev.algomax@gmail.com',
  'vladanilic017@gmail.com',
  'heywinit@gmail.com',
  'chriszeuch.cz@gmail.com',
  'Danpvernon@gmail.com',
  'ask199768@gmail.com',
]

interface StyleAnalysis {
  overall: string
  first_third: string
  second_third: string
  third_third: string
  [key: string]: string
}

interface Style {
  tweets: any[]
  prompt: string
}

async function analyzeUserStyle(tweets: any[]): Promise<StyleAnalysis> {
  const systemPrompt = `You are an expert at analyzing writing styles from social media posts. Analyze the given tweets and provide a concise summary of the writing style, tone, voice, common themes, and characteristic patterns. Include examples where it makes sense. Focus on what makes this person's writing unique and distinctive. Keep your analysis under 200 words and do it in 5-10 bullet points. Write it as instructions for someone else to write, e.g. NOT ("this user writes...", but "write like...").

Also, please keep your analysis in simple, easy language at 6-th grade reading level. no fancy words like "utilize this" or "leverage that". 

The goal is that with your analysis, another LLM will be able to replicate the exact style. So picture the style as clearly as possible.
  
EXAMPLE: 
- write in lowercase only, avoiding capitalization on personal pronouns and sentence starts. Example: "i'm not using the next.js app router navigation for @contentport anymore, the results are kinda amazing"
- separate ideas with double line breaks for clarity and emphasis. Example: "a few days ago i posted about moving away from next.js navigation 👀
◆ pages load instantly now"

- use simple punctuation: periods to end statements and emojis to add tone. avoid commas.
- use bulleted lists using the symbol ◆ to break down key points concisely. Example: "◆ pages load instantly now ◆ whole app feels way faster"
- make use of sentence fragments and brief statements to create a punchy, direct style. Example: "dear @neondatabase, you're so easy to set up and have a great free tier"
- occasionally use casual, conversational vocabulary including slang and mild profanity to convey authenticity and enthusiasm. Example: "man i just fucking love aws s3"
- use rhetorical questions to engage readers. Example: "why didn't anyone tell me that talking to users is actually fun"
- use a friendly, informal tone with a mix of humor and straightforwardness, often expressing excitement or frustration openly.
- use emojis sparingly but purposefully to highlight emotion or humor (e.g., 🎉 for celebration, 👀 for attention, 🤡 for self-deprecation). Not every post contains emojis, but when used, they reinforce tone.
- keep sentence structures mostly simple with occasional casual connectors like "but," "so," or "and" leading thoughts without formal conjunctions.`

  const formatTweetAnalysis = (tweets: any[]) => {
    return tweets.map((tweet, index) => `${index + 1}. ${tweet.text}`).join('\n\n')
  }

  const thirdSize = Math.ceil(tweets.length / 3)
  const firstThird = tweets.slice(0, thirdSize)
  const secondThird = tweets.slice(thirdSize, thirdSize * 2)
  const thirdThird = tweets.slice(thirdSize * 2)

  const [overallAnalysis, firstThirdAnalysis, secondThirdAnalysis, thirdThirdAnalysis] =
    await Promise.all([
      generateText({
        model: xai('grok-3-latest'),
        system: systemPrompt,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Analyze the overall writing style from these tweets:\n\n${formatTweetAnalysis(tweets)}`,
          },
        ],
      }),
      generateText({
        model: xai('grok-3-latest'),
        system: systemPrompt,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Analyze the writing style from these tweets:\n\n${formatTweetAnalysis(firstThird)}`,
          },
        ],
      }),
      generateText({
        model: xai('grok-3-latest'),
        system: systemPrompt,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Analyze the writing style from these tweets:\n\n${formatTweetAnalysis(secondThird)}`,
          },
        ],
      }),
      generateText({
        model: xai('grok-3-latest'),
        system: systemPrompt,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Analyze the writing style from these tweets:\n\n${formatTweetAnalysis(thirdThird)}`,
          },
        ],
      }),
    ])

  return {
    overall: overallAnalysis.text,
    first_third: firstThirdAnalysis.text,
    second_third: secondThirdAnalysis.text,
    third_third: thirdThirdAnalysis.text,
  }
}

async function migrateUserStyles() {
  console.log("Starting XAI style analysis migration for allowlisted users...")

  const users = await db.select().from(user)
  const allowlistedUsers = users.filter(u => allowlist.includes(u.email))
  
  console.log(`Found ${users.length} total users, ${allowlistedUsers.length} allowlisted users to process`)

  let processed = 0
  let skipped = 0
  let errors = 0

  for (const currentUser of allowlistedUsers) {
    try {
      const styleKey = `style:${currentUser.email}`
      const draftStyleKey = `draft-style:${currentUser.email}`

      const existingStyle = await redis.json.get<Style>(styleKey)
      const existingDraftStyle = await redis.json.get<StyleAnalysis>(draftStyleKey)

      if (!existingStyle) {
        console.log(`No style data found for user ${currentUser.email}, skipping`)
        skipped++
        continue
      }

      if (existingDraftStyle) {
        console.log(`Draft style already exists for user ${currentUser.email}, skipping`)
        skipped++
        continue
      }

      if (!existingStyle.tweets || existingStyle.tweets.length === 0) {
        console.log(`No tweets found for user ${currentUser.email}, skipping`)
        skipped++
        continue
      }

      let tweetsToAnalyze = [...existingStyle.tweets]

      if (tweetsToAnalyze.length < 20) {
        console.log(`User ${currentUser.email} has ${tweetsToAnalyze.length} tweets, filling up with default tweets for analysis...`)
        const existingIds = new Set(tweetsToAnalyze.map((t) => t.id))
        for (const defaultTweet of DEFAULT_TWEETS) {
          if (tweetsToAnalyze.length >= 20) break
          if (!existingIds.has(defaultTweet.id)) {
            tweetsToAnalyze.push(defaultTweet)
            existingIds.add(defaultTweet.id)
          }
        }
        
        console.log(`Using ${tweetsToAnalyze.length} tweets for analysis (${existingStyle.tweets.length} original + ${tweetsToAnalyze.length - existingStyle.tweets.length} default)`)
      }

      console.log(`Processing user ${currentUser.email} with ${tweetsToAnalyze.length} tweets...`)

      const styleAnalysis = await analyzeUserStyle(tweetsToAnalyze)
      await redis.json.set(draftStyleKey, '$', styleAnalysis)

      console.log(`✅ Successfully analyzed style for user ${currentUser.email}`)
      processed++

    } catch (error) {
      console.error(`❌ Error processing user ${currentUser.email}:`, error)
      errors++
    }
  }

  console.log("\n=== Migration Summary ===")
  console.log(`Total users: ${users.length}`)
  console.log(`Allowlisted users: ${allowlistedUsers.length}`)
  console.log(`Processed: ${processed}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
  console.log("Migration complete!")
}

migrateUserStyles()
  .then(() => {
    console.log("Script finished successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Script failed:", error)
    process.exit(1)
  })
