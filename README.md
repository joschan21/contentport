## contentport

### public roadmap

urgent & often requested:

- support creating threads
- showing OG images when pasting URLs
- becoming responsive
- make it much easier to upgrade to PRO & improved upgrading UX

nice to have

- use posted tweets as style reference/context for assistant
- web browsing for assistant
- voice input for assistant
- peronalize ideas shown as examples ("It would be AMAZING if these examples weren’t random but instead based on my background, who I am, what I do, and what’s happening out there in X that I could speak about."

pending:

- invite flow broken because `ctx.user.name` doesnt exist:
  await redis.set(`invite:name:${inviteId}`, ctx.user.name, { ex: 60 _ 60 _ 24 })
- when adding first keywords to topic monitor, it doesnt auto-refetch
- while typing a new keyword to topic monitor, count that as enter when pressing "save"
- rename "new keyword" in topic monitor CTA to something better
- allow video playback in tweet editor
- when deleting an account: delete all scheduled tweets for it too
- no profile picture if you signed up w/ email
- queue shows fixed amount of days regardless of actual scheduled tweets
- some bug in posted tweets, they arent shown correctly

NEXT UP:
set up stripe to work locally w/ test mode locally / prod mode in production

POSSIBLE NEXT FEATURES:

- community posting
- auto-delay
- auto-plug
- natural posting times
- auto-retweet
- timezones for queue
- adjustable queue slots (how many / when)
- in-app support
- nice upgrade modal / paywall / emails
- 7-day or 3-day free trial
- for email auth, send code instead of link

bigger

- proactively create posts for users
  - code screenshot editor?
- viral tweet library

dominik feedback:
// allow editing of images in image editor
// add scrollbar-gutter back
// sidebar lags when feed is open
// when clicking transcript, it takes you to nextjs 404
// allow users to add tweet image to chat
// allow transcripts for large video
// allow editing memories inline
// media management inside of contentport
// make entire tweet in thread clickable
