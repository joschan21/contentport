import { redis } from "./src/lib/redis"
import "dotenv/config"

import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function getEarlyAccessEmails() {
    const emails = (await redis.srandmember("waitlist", 10)) as string[]
  for (const email of emails) {
    await redis.sadd("onboarding-batch", email)
    await resend.contacts.create({
      email,
      unsubscribed: false,
      audienceId: "6d6c5fc8-ceeb-43f8-a484-3c9bbfe840ed",
    })
  }
  return emails
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
