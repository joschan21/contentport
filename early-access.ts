import { redis } from './src/lib/redis'
import 'dotenv/config'

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function getEarlyAccessEmails() {
  const audienceId = '6d6c5fc8-ceeb-43f8-a484-3c9bbfe840ed'

  // console.log('Fetching existing contacts...')
  // const existingContacts = await resend.contacts.list({ audienceId })

  // console.log(`Removing ${existingContacts.data?.data?.length || 0} existing contacts...`)
  // if (existingContacts.data?.data) {
  //   for (const contact of existingContacts.data.data) {
  //     await resend.contacts.remove({
  //       email: contact.email,
  //       audienceId,
  //     })
  //   }
  // }

  // console.log('Getting waitlist emails...')
  // const waitlistEmails = (await redis.smembers('waitlist')) as string[]

  // console.log('Filtering for @gmail.com addresses...')
  // const gmailEmails = waitlistEmails.filter((email) => email.endsWith('@gmail.com'))

  // console.log(`Found ${gmailEmails.length} @gmail.com addresses`)
  // const selectedEmails = gmailEmails.slice(0, 100)

  // await redis.set('onboarding-batch-3', selectedEmails)

  // console.log(`Adding ${selectedEmails.length} contacts to audience...`)
  for (const email of ["neske.joscha@gmail.com", "onlineplattformjjs@gmail.com"]) {
    await resend.contacts.create({
      email,
      unsubscribed: false,
      audienceId,
    })
  }

  // return selectedEmails
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
