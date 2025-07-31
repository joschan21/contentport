import { z } from "zod"
import { j, privateProcedure } from "../jstack"
import OpenAI from "openai"
import { createReadStream } from "fs"
import { writeFile } from "fs/promises"
import path from "path"
import os from "os"
import DiffMatchPatch from "diff-match-patch"
import { generateText, streamText, tool } from "ai"
import { openai as oai } from "@ai-sdk/openai"
import * as deepl from "deepl-node"
import { experimental_transcribe as transcribe } from "ai"
import { openai } from "@ai-sdk/openai"
import { readFile } from "fs/promises"
import { google } from "@ai-sdk/google"
import { createAnthropic } from "@ai-sdk/anthropic"

const anthropic = createAnthropic()

const translator = new deepl.Translator(Bun.env.DEEPL_API_KEY)
const writingStyle = deepl.WritingStyle
const writingTone = deepl.WritingTone

const dmp = new DiffMatchPatch()

console.log("VOICE ROUTER LOADED")

export const voiceRouter = j.router({
  transcribe: privateProcedure
    .input(
      z.object({
        audioBase64: z.string(),
        documentState: z.object({
          fullText: z.string(),
          selectedText: z.string(),
          cursorPosition: z.number(),
        }),
      })
    )
    .mutation(async ({ c, input }) => {
      const buffer = Buffer.from(input.audioBase64, "base64")

      const tempFilePath = path.join(os.tmpdir(), `${crypto.randomUUID()}.webm`)
      await writeFile(tempFilePath, buffer)

      const transcript = await transcribe({
        model: openai.transcription("whisper-1"),
        audio: await readFile(tempFilePath),
      })

      return c.json({
        success: true,
        transcript: transcript.text,
        documentState: input.documentState,
      })

      // const transcription = await openai.audio.transcriptions.create({
      //   file: createReadStream(tempFilePath),
      //   model: "whisper-1",
      //   language: "en",
      // })

      //       const humanize = tool({
      //         description: "Humanize AI output if explicitly asked to do so",
      //         parameters: z.object({
      //           command: z.string().describe("Voice command"),
      //         }),
      //         execute: async ({ command }) => {
      //           console.log("👷‍♂️ HUMANIZE TOOL CALLED", input.documentState.fullText)

      //           try {
      //             // First try with OpenAI
      //             const result = await generateText({
      //               model: oai("gpt-4o"),
      //               stopSequences: ["</rewritten_text>"],
      //               prompt: `<context>
      // Keep the original tone of the author (e.g. casual, professional, lowercase, etc.), and optimize the text for clarity and smooth reading. Make sure to optimize for conciseness by removing filler words.
      // </context>

      // <prohibited_words>
      // Do not use complex or abstract terms or typical AI language such as 'meticulous', 'seamless', 'testament to', 'foster', 'beacon', 'journey', 'elevate', 'flawless', 'navigating', 'delve into', 'complexities', 'realm', 'bespoke', 'tailored', 'towards', 'underpins', 'to navigate xyz', 'the xzy landscape', 'comphrehensive', 'supercharge', 'ever-changing', 'ever-evolving', 'the world of', 'not only', 'seeking more than just', 'designed to enhance', 'it's not merely', 'our suite', 'it is advisable', 'daunting', 'in the heart of', 'when it comes to', 'in the realm of', 'amongst', 'unlock the secrets', 'unveil the secrets', 'transforms' and 'robust'. This approach aims to streamline content production for enhanced NLP algorithm comprehension, ensuring the output is direct, accessible, and easily interpretable. Avoid highly nested sentences and optimize the text for smooth flow, no filler words and intuitive understanding.
      // </prohibited_words>

      // <examples>
      // Before: "It was through years of trial and error that they finally figured out what worked."
      // After: "Years of trial and error finally showed them what worked."
      // ---
      // Before: "They approached the problem in a way that was both methodical and thoughtful."
      // After: "They approached the problem methodically and thoughtfully."
      // ---
      // Before: "From the way they organize their team to the tools they choose, everything reflects their core values."
      // After: "Everything from team structure to tool choice reflects their values."
      // ---
      // Before: "They tend to make decisions based on a combination of intuition and past experience."
      // After: "They tend to decide based on intuition and past experience."
      // ---
      // Before: "made decisions that were based on what they believed would be most beneficial"
      // After: "made decisions based on what they believed would benefit"
      // ---
      // Before: "the update, which was something that users had been waiting on"
      // After: "The update users have been waiting for"
      // ---
      // Before: "a tool designed to help people who are trying to improve"
      // After: "a tool for people trying to improve"
      // ---
      // Before: "they move fast, but never at the cost of quality"
      // After: "they move fast, but never at the cost of quality"
      // ---
      // Before: "that trust isn't built in a day, but it can be lost in a moment"
      // After: "that trust isn't built in a day, but can be lost in a moment"
      // </examples>

      // <ai_text>
      // ${input.documentState.selectedText ?? input.documentState.fullText}
      // </ai_text>

      // <rewritten_text>`,
      //             })

      //             console.log("💎 BEFORE DEEPL:", result.text)

      //             // Then try to enhance with DeepL if available
      //             try {
      //               const response = await fetch(
      //                 "https://api.deepl.com/v2/write/rephrase",
      //                 {
      //                   method: "POST",
      //                   headers: {
      //                     Authorization: `DeepL-Auth-Key ${Bun.env.DEEPL_API_KEY}`,
      //                     "Content-Type": "application/json",
      //                   },
      //                   body: JSON.stringify({
      //                     text: [result.text],
      //                     // writing_style: writingStyle.DEFAULT,
      //                     // tone: writingTone.DEFAULT,
      //                   }),
      //                 }
      //               )

      //               console.log("💎 AFTER DEEPL", response.ok)

      //               if (!response.ok) {
      //                 return result.text
      //               }

      //               const data = (await response.json()) as {
      //                 improvements: Array<{ text: string }>
      //               }

      //               console.log("data", data)

      //               if (data.improvements?.[0]?.text) {
      //                 console.log("RETURNING IMPROVEMENTS")
      //                 return data.improvements[0].text
      //               }

      //               return result.text
      //             } catch (error) {
      //               console.error("DeepL API error:", error)
      //               return result.text
      //             }
      //           } catch (error) {
      //             console.error("Humanize error:", error)
      //             return input.documentState.fullText
      //           }
      //         },
      //       })

      //       const { toolResults } = await generateText({
      //         model: oai("gpt-4o"),
      //         tools: { humanize },
      //         prompt: `You are a helpful assistant that response to voice commands. Call the tool you think is appropriate and return its result 1:1 without any changes or additional quotes around it.

      // COMMAND:
      // "${transcription.text}"`,
      //       })

      //       return c.superjson({
      //         success: true,
      //         text: toolResults[0],
      //       })
    }),

  generate: privateProcedure
    .input(
      z.object({
        command: z.string(),
        documentState: z.object({
          fullText: z.string(),
          selectedText: z.string(),
          cursorPosition: z.number(),
        }),
      })
    )
    .post(({ c, input }) => {
      const humanize = tool({
        description:
          "Humanize AI output if explicitly asked to do so, make text sound more natural.",
        parameters: z.object({
          command: z.string().describe("Voice command"),
        }),
        execute: async ({ command }) => {
          console.log("HUMANIZE CALLED")
          const result = await generateText({
            model: oai("gpt-4o"),
            stopSequences: ["</rewritten_text>"],
            prompt: `<context>
      Keep the original tone of the author (e.g. casual, professional, lowercase, etc.), and optimize the text for clarity and smooth reading. Make sure to optimize for conciseness by removing filler words.
      </context>

<prohibited_words>
Do not use complex or abstract terms or typical AI language such as 'meticulous', 'seamless', 'testament to', 'foster', 'beacon', 'journey', 'elevate', 'flawless', 'navigating', 'delve into', 'complexities', 'realm', 'bespoke', 'tailored', 'towards', 'underpins', 'to navigate xyz', 'the xzy landscape', 'comphrehensive', 'supercharge', 'ever-changing', 'ever-evolving', 'the world of', 'not only', 'seeking more than just', 'designed to enhance', 'it's not merely', 'our suite', 'it is advisable', 'daunting', 'in the heart of', 'when it comes to', 'in the realm of', 'amongst', 'unlock the secrets', 'unveil the secrets', 'transforms' and 'robust'. This approach aims to streamline content production for enhanced NLP algorithm comprehension, ensuring the output is direct, accessible, and easily interpretable. Avoid highly nested sentences and optimize the text for smooth flow, no filler words and intuitive understanding.
</prohibited_words>

      <examples>
      Before: "It was through years of trial and error that they finally figured out what worked."
      After: "Years of trial and error finally showed them what worked."
      ---
      Before: "They approached the problem in a way that was both methodical and thoughtful."
      After: "They approached the problem methodically and thoughtfully."
      ---
      Before: "From the way they organize their team to the tools they choose, everything reflects their core values."
      After: "Everything from team structure to tool choice reflects their values."
      ---
      Before: "They tend to make decisions based on a combination of intuition and past experience."
      After: "They tend to decide based on intuition and past experience."
      ---
      Before: "made decisions that were based on what they believed would be most beneficial"
      After: "made decisions based on what they believed would benefit"
      ---
      Before: "the update, which was something that users had been waiting on"
      After: "The update users have been waiting for"
      ---
      Before: "a tool designed to help people who are trying to improve"
      After: "a tool for people trying to improve"
      ---
      Before: "they move fast, but never at the cost of quality"
      After: "they move fast, but never at the cost of quality"
      ---
      Before: "that trust isn't built in a day, but it can be lost in a moment"
      After: "that trust isn't built in a day, but can be lost in a moment"
      </examples>

      <ai_text>
      ${input.documentState.selectedText ?? input.documentState.fullText}
      </ai_text>

      <rewritten_text>`,
          })

          return result.text
        },
      })

      const result = streamText({
        model: anthropic("claude-3-opus-latest"),
        stopSequences: ["</output>"],
        onError: (err) => {
          console.error(err)
        },
        // tools: { humanize },
        prompt: `<system>
You are a helpful assistant that responds to voice commands. You have access to the current document state:
<full_text>
${input.documentState.fullText}
</full_text>

<selected_text>
${input.documentState.selectedText}
</selected_text>

<cursor_position>
${input.documentState.cursorPosition}
</cursor_position>

<rules>
You can make changes to the document based on voice commands. For example:
- "expand on this point" should add more detail to the selected text
- "make this paragraph clearer" should improve the current paragraph
- "add a bullet point about X" should add a new bullet point
- "delete this sentence" should remove the selected text
</rules>

<output_requirements>
1. PROVIDE THE COMPLETE SELECTED TEXT as your response, not just the changes
2. Your response should be a direct 1:1 replacement of the selected text (NOT full text)
3. Include all unchanged portions of the selected text alongside your modifications
4. DO NOT use markers like "Original text:", "Changes:", or explanations within the response text itself
5. The text you output will directly replace the selected text in its entirety. Make sure it fits in the the content before and after, including potential newlines.
</output_requirements>

<human_text_generation>
  <context>
    Keep the original tone of the author (e.g. casual, professional, lowercase, etc.), and optimize the text for clarity and smooth reading. Make sure to optimize for conciseness by removing filler words.
  </context>

  <prohibited_words>
    Do not use complex or abstract terms or typical AI language such as 'meticulous', 'seamless', 'testament to', 'foster', 'beacon', 'journey', 'elevate', 'flawless', 'navigating', 'delve into', 'complexities', 'realm', 'bespoke', 'tailored', 'towards', 'underpins', 'to navigate xyz', 'the xzy landscape', 'comphrehensive', 'supercharge', 'ever-changing', 'ever-evolving', 'the world of', 'not only', 'seeking more than just', 'designed to enhance', 'it's not merely', 'our suite', 'it is advisable', 'daunting', 'in the heart of', 'when it comes to', 'in the realm of', 'amongst', 'unlock the secrets', 'unveil the secrets', 'transforms' and 'robust'. This approach aims to streamline content production for enhanced NLP algorithm comprehension, ensuring the output is direct, accessible, and easily interpretable. Avoid highly nested sentences and optimize the text for smooth flow, no filler words and intuitive understanding.
  </prohibited_words>

  <cognitive_patterns>
    <associative_thinking>
      Follow natural thought associations rather than perfectly logical structures. Present ideas in order of psychological prominence rather than optimal organization.
    </associative_thinking>
    
    <inductive_reasoning>
      Build arguments from specific examples to general conclusions more often than starting with principles and moving to applications.
    </inductive_reasoning>
    
    <natural_topic_flow>
      Allow reasonable topic drift that follows human attention patterns. Make transitions that reflect how humans naturally connect ideas.
    </natural_topic_flow>
    
    <information_prioritization>
      Present information based on salience and relevance to the reader rather than comprehensive coverage of a topic.
    </information_prioritization>
  </cognitive_patterns>

  <knowledge_structure>
    <uneven_expertise>
      Display varied depth of knowledge across subtopics within a domain, showing stronger command in some areas than others.
    </uneven_expertise>
    
    <practical_emphasis>
      Demonstrate stronger focus on practical applications than theoretical foundations unless the context specifically demands theory.
    </practical_emphasis>
    
    <memory_patterns>
      Exhibit stronger recall for distinctive or emotionally resonant information compared to routine details.
    </memory_patterns>
    
    <knowledge_clustering>
      Reference information in clusters that reflect genuine human knowledge networks and learning patterns.
    </knowledge_clustering>
  </knowledge_structure>

  <language_patterns>
    <word_choice>
      Use high-frequency collocations and word pairings found in human corpora rather than uncommon or overly precise terminology.
    </word_choice>
    
    <metaphor_use>
      Employ metaphors and analogies that reflect physical/embodied understanding, drawing from common human experiences.
    </metaphor_use>
    
    <semantic_priming>
      Show effects of semantic priming in word choices and topic transitions, where one concept naturally leads to related terms.
    </semantic_priming>
    
    <information_density>
      Vary information density throughout text, with some sections more detailed and others more concise.
    </information_density>
  </language_patterns>

  <contextual_awareness>
    <shared_knowledge>
      Reference shared cultural knowledge without explicit explanation when appropriate for the audience.
    </shared_knowledge>
    
    <audience_adaptation>
      Adjust complexity based on presumed audience without explicitly stating the adjustment.
    </audience_adaptation>
    
    <inferential_gaps>
      Skip obvious intermediate steps in explanations as humans naturally would when communicating with peers.
    </inferential_gaps>
    
    <common_ground>
      Build on presumed common ground established in prior exchanges without restating shared context.
    </common_ground>
  </contextual_awareness>

  <cognitive_limitations>
    <working_memory>
      Balance breadth vs. depth in a way that reflects natural working memory constraints, avoiding excessive enumeration.
    </working_memory>
    
    <reasoning_chains>
      Display coherent reasoning chains limited to 3-5 steps before summarizing, reflecting human cognitive capacity.
    </reasoning_chains>
    
    <recency_bias>
      Demonstrate recency bias in selecting examples and references, favoring more recent information.
    </recency_bias>
    
    <scope_sensitivity>
      Show appropriate scope sensitivity in numerical contexts, focusing on magnitudes that matter to human decision-making.
    </scope_sensitivity>
  </cognitive_limitations>

  <implementation>
    <conciseness>
      Convert verbose phrasing to concise alternatives:
      - "The fact that..." → "Because..."
      - "In order to..." → "To..."
      - "A number of..." → "Several..."
      - "At this point in time..." → "Now..."
      - "It is important to note that..." → [Remove completely]
    </conciseness>
    
    <active_voice>
      Use active voice primarily, but include passive voice when it would be natural for emphasis or when the actor is less important than the action.
    </active_voice>
    
    <sentence_reduction>
      Merge sentences that express related ideas, removing redundant subject references and connecting words.
    </sentence_reduction>
    
    <verbs_over_nominalizations>
      Replace nominalizations with verbs:
      - "make a decision" → "decide"
      - "conduct an analysis" → "analyze"
      - "provide assistance" → "help"
      - "give consideration to" → "consider"
    </verbs_over_nominalizations>

    <remove_introductory_phrases>
      - "Engaging in activities like" → "Activities like" or just name the activity
      - "It is worth noting that" → [Remove completely]
      - "It should be mentioned that" → [Remove completely]
      - "I would like to point out that" → [Remove completely]
      - "As you may be aware" → [Remove completely]
      - "For the purpose of" → "To"
      - "In the process of" → "While" or "During"
      - "In order to facilitate" → "To help"
      - "With the objective of" → "To"
      - "When it comes to" → [Remove or replace with "For" or "About"]
      - "From the perspective of" → "For" or just specify whose perspective
      - "In the context of" → [Often removable] or "In"
      - "With regard to" → "About" or "Regarding"
      - "In an effort to" → "To"
      - "In the case of" → "For" or "With"
    </remove_introductory_phrases>

    <compress_prepositional_phrases>
      - "in the form of" → "as"
      - "in the vicinity of" → "near"
      - "in the event of" → "if"
      - "in spite of the fact that" → "although" or "despite"
      - "on the occasion of" → "during" or "when"
      - "in the nature of" → "like"
      - "with reference to" → "about"
      - "with the exception of" → "except for"
      - "by means of" → "by" or "using"
      - "for the purpose of" → "for" or "to"
      - "in accordance with" → "following" or "per"
      - "in addition to" → "besides" or "also"
      - "in conjunction with" → "with"
      - "in the neighborhood of" → "about" or "around"
      - "in close proximity to" → "near"
    </compress_prepositional_phrases>

    <remove_empty_determiners>
      - "The fact that" → "That" or reword the sentence
      - "A number of" → "Several" or "Many"
      - "A majority of" → "Most"
      - "A series of" → "Several" or "Many"
      - "A variety of" → "Various" or specific number
      - "The process of" → [Remove or replace with gerund]
      - "The field of" → [Remove completely when obvious]
      - "The concept of" → [Often removable]
      - "The use of" → [Often replaceable with verb]
      - "The presence of" → [Often removable]
      - "The absence of" → "Without" or "Lacking"
      - "The development of" → [Often replaceable with verb]
      - "The issue of" → [Often removable]
      - "The topic of" → [Remove when obvious]
      - "The purpose of" → [Often removable]
    </remove_empty_determiners>

    <replace_overwrought_verbs>
      - "utilize" → "use"
      - "facilitate" → "help" or "enable"
      - "endeavor" → "try"
      - "ascertain" → "find out" or "determine"
      - "demonstrate" → "show"
      - "necessitate" → "need"
      - "commence" → "start" or "begin"
      - "terminate" → "end"
      - "leverage" → "use"
      - "implement" → "use" or "start"
      - "prioritize" → "focus on"
      - "initiate" → "start" or "begin"
      - "conceptualize" → "imagine" or "think of"
      - "finalize" → "finish" or "complete"
      - "strategize" → "plan"
      - "aiding" → "helping"
    </replace_overwrought_verbs>
  </implementation>

  <examples>
    <example>
      <before>It was through years of trial and error that they finally figured out what worked.</before>
      <after>Years of trial and error finally showed them what worked.</after>
    </example>
    <example>
      <before>They approached the problem in a way that was both methodical and thoughtful.</before>
      <after>They approached the problem methodically and thoughtfully.</after>
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
</human_text_generation>

<command>
"${input.command}"
</command>
</system>

<output>`,
      })

      return result.toDataStreamResponse()

      // Custom stream implementation that outputs "Germany is a beautiful country in Europe."
      // with a 2-second delay between chunks
      // const stream = new ReadableStream({
      //   async start(controller) {
      //     controller.enqueue('f:{"messageId":"msg-1hS3t6UfaxuALTg9m9KoxlXA"}\n')

      //     const chunks = [
      //       "big ", "brown ", "fox"
      //     ]

      //     for (const chunk of chunks) {
      //       await new Promise((resolve) => setTimeout(resolve, 500))
      //       controller.enqueue(`0:"${chunk}"\n`)
      //     }

      //     controller.enqueue(
      //       'e:{"finishReason":"stop","usage":{"promptTokens":213,"completionTokens":9},"isContinued":false}\n'
      //     )
      //     controller.enqueue(
      //       'd:{"finishReason":"stop","usage":{"promptTokens":213,"completionTokens":9}}\n'
      //     )
      //     controller.close()
      //   },
      // })

      // return new Response(stream, {
      //   headers: {
      //     "Content-Type": "text/plain; charset=utf-8",
      //     "Transfer-Encoding": "chunked",
      //     "x-vercel-ai-data-stream": "v1",
      //   },
      // })
    }),
})
