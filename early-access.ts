import { redis } from "./src/lib/redis"
import "dotenv/config"

import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function getEarlyAccessEmails() {
  // Get all waitlist emails
  const waitlistEmails = await redis.smembers("waitlist") as string[]
  
  // Get first batch emails
  const firstBatchEmails = await redis.smembers("onboarding-batch") as string[]
  const firstBatchSet = new Set(firstBatchEmails)
  
  // Filter out emails that are already in first batch
  const newEmails = waitlistEmails.filter(email => !firstBatchSet.has(email))
  
  // Take the first 20 new emails
  const selectedEmails = newEmails.slice(0, 20)
  
  // Add selected emails to second batch
  for (const email of selectedEmails) {
    await redis.sadd("onboarding-batch-2", email)
    await resend.contacts.create({
      email,
      unsubscribed: false,
      audienceId: "6d6c5fc8-ceeb-43f8-a484-3c9bbfe840ed",
    })
  }
  
  return selectedEmails
}

getEarlyAccessEmails()
  .then(async (emails) => {
    console.log(emails)
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

// const unsub = async () => {
//   const emails = await redis.smembers("onboarding-batch")

//   for (const email of emails) {
//     await resend.contacts.remove({
//       audienceId: "6d6c5fc8-ceeb-43f8-a484-3c9bbfe840ed",
//       email,
//     })
//   }
// }

// unsub()
