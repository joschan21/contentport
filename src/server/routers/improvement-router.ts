import { DiffWithReplacement, processDiffs } from '@/lib/utils'
import { tweet } from '@/lib/validators'
import { anthropic } from '@ai-sdk/anthropic'
import { generateText } from 'ai'
import { diff_match_patch } from 'diff-match-patch'
import { z } from 'zod'
import { j, publicProcedure } from '../jstack'

const dmp = new diff_match_patch()

export const improvementRouter = j.router({
  clarity: publicProcedure
    .input(z.object({ tweets: z.array(tweet) }))
    .post(async ({ c, input }) => {
      const { tweets } = input
      const results: {
        id: string
        improvedText: string
        diffs: DiffWithReplacement[]
      }[] = []

      for (const tweet of tweets) {
        const { text } = await generateText({
          model: anthropic('claude-3-opus-latest'),
          stopSequences: ['</improved_text>'],
          system: `You are Grammarly for checking tweet clarity.

Keep the original tone of the author (e.g. casual, professional, lowercase, etc.), and optimize the following tweet for clarity and smooth reading. Make it easy to read and scan without losing information.

<rules>
- Go for a clear, concise 6th grade reading level (no fancy words, the goal is to get the point across)
- Do not change the style/tone of the tweet (e.g. casing, emojis, punctuation)
- Your job is to optimize for easy readability and clarity
- If you think the tweet is already as clear as it gets, return it 1:1
- Return only the improved tweet without any explanation.
- Your output will replace the existing tweet 1:1
</rules>

<examples type="writing_concisely">
  <example>
    <before>It was through years of trial and error that they finally figured out what worked.</before>
    <after>Years of trial and error finally showed them what worked.</after>
  </example>
  <example>
    <before>From the way they organize their team to the tools they choose, everything reflects their core values.</before>
    <after>Everything from team structure to tool choice reflects their values.</after>
  </example>
  <example>
    <before>They tend to make decisions based on a combination of intuition and past experience.</before>
    <after>They tend to decide based on intuition and past experience.</after>
  </example>
  <example>
    <before>made decisions that were based on what they believed would be most beneficial</before>
    <after>made decisions based on what they believed would benefit</after>
  </example>
  <example>
    <before>the update, which was something that users had been waiting on</before>
    <after>The update users have been waiting for</after>
  </example>
  <example>
    <before>a tool designed to help people who are trying to improve</before>
    <after>a tool for people trying to improve</after>
  </example>
  <example>
    <before>they move fast, but never at the cost of quality</before>
    <after>they move fast, but never at the cost of quality</after>
  </example>
  <example>
    <before>that trust isn't built in a day, but it can be lost in a moment</before>
    <after>that trust isn't built in a day, but can be lost in a moment</after>
  </example>
</examples>

<examples type="cutting_weak_verbs">
  <example>
    <before>The team is in the process of launching a new feature.</before>
    <after>The team is launching a new feature.</after>
  </example>
  <example>
    <before>The product was found to be effective by early testers.</before>
    <after>Early testers found the product effective.</after>
  </example>
  <example>
    <before>She has a tendency to overthink simple decisions.</before>
    <after>She tends to overthink simple decisions.</after>
  </example>
  <example>
    <before>There was a sense of urgency in the way they worked.</before>
    <after>They worked with urgency.</after>
  </example>
  <example>
    <before>The feature has the ability to detect changes in real-time.</before>
    <after>The feature detects changes in real-time.</after>
  </example>
</examples>

<examples type="removing_redundant_modifiers">
  <example>
    <before>They made a completely final decision.</before>
    <after>They made a final decision.</after>
  </example>
  <example>
    <before>It's an absolutely essential part of the workflow.</before>
    <after>It's an essential part of the workflow.</after>
  </example>
  <example>
    <before>The results were totally unexpected.</before>
    <after>The results were unexpected.</after>
  </example>
  <example>
    <before>This is a very unique opportunity.</before>
    <after>This is a unique opportunity.</after>
  </example>
  <example>
    <before>The two teams collaborated together on the project.</before>
    <after>The two teams collaborated on the project.</after>
  </example>
</examples>

<examples type="collapsing_noun_phrases">
  <example>
    <before>The process of onboarding new users takes time.</before>
    <after>Onboarding new users takes time.</after>
  </example>
  <example>
    <before>The implementation of the new system was successful.</before>
    <after>The new system launched successfully.</after>
  </example>
  <example>
    <before>The development of the feature took several weeks.</before>
    <after>Developing the feature took several weeks.</after>
  </example>
  <example>
    <before>The decision to pivot came after much discussion.</before>
    <after>They pivoted after much discussion.</after>
  </example>
  <example>
    <before>The creation of the dashboard improved reporting.</before>
    <after>Creating the dashboard improved reporting.</after>
  </example>
</examples>

<examples type="tightening_transitions">
  <example>
    <before>That being said, they continued with the original plan.</before>
    <after>Still, they continued with the original plan.</after>
  </example>
  <example>
    <before>In order to meet the deadline, they worked late every night.</before>
    <after>To meet the deadline, they worked late every night.</after>
  </example>
  <example>
    <before>As a result of that change, the system performed better.</before>
    <after>The change made the system perform better.</after>
  </example>
  <example>
    <before>At the same time, they were also trying to reduce costs.</before>
    <after>They were also trying to reduce costs.</after>
  </example>
  <example>
    <before>For the purpose of accuracy, the data was verified twice.</before>
    <after>To ensure accuracy, they verified the data twice.</after>
  </example>
</examples>`,
          prompt: `<tweet_to_clarify>
${tweet.content}
</tweet_to_clarify>

<improved_text>`,
        })

        const rawDiffs = dmp.diff_main(tweet.content, text)
        dmp.diff_cleanupSemantic(rawDiffs)
        const processedDiffs = processDiffs(tweet.id, rawDiffs)

        results.push({
          id: tweet.id,
          improvedText: text,
          diffs: processedDiffs,
        })
      }

      return c.json({ success: true, results })
    }),
})
