## contentport

MVP

- [x] Style dropdown and config
- [x] Make assistant list improvements
- [x] No refresh needed after new context doc
- [ ] Remove save/history

style tab:

- [ ] Add new style
- [ ] Import tweets
- [ ] Custom prompt

edit tool should just know about:

- [ ] Current message
- [ ] Previous suggestions
- [ ] Current tweet state

CURRENT

- [ ] Remove "al tweets" - just show all for simplicity

BUGS

- [ ] Safari image editor doesnt work
- [ ] Chrome edit image doesnt work
- [ ] After some time most recent tweets are not shown in sidebar, only after reloading

NEED TO DO BEFORE NEXT SHIP:

BUG FIXES

- [ ] When clicking "new tweet", start a new chat

PRIORITY

- [ ] One tweet can override another in recents HARD
- [ ] Implement back rate-limiting EASY
- [ ] Allow navigation while chatting to asisstant (ideally just like openai desktop) HARD
      HOTFIX: force nav to studio if not already there
- [ ] Refresh knowledge base after onboarding and after inserting new document EASY
      LET IN BATCH - 50
- [ ] Drafts (3 to choose from)
- [ ] Offer option to save as knowledge doc EASY
      LET IN BATCH
- [ ] Image editor fixes HARD
- [ ] Image tool doesnt work anymore
      LET IN BATCH

FEATURE IDEAS

- [ ] Show related documents to user query in chat (e.g. typed in ...about contentport) -> suggest docs related to contentport above certain threshold (0.9)

NEW MIGRATION TODO:

- put all "connected-account:${user.email}" also as "active-account:${user.email}"

TODO:
- add confirm modal to not DIRECTLY post (X)
- queue improvements to allow nav during edits (X)
- some kinda persistence to not delete current tweet (X)
- add v2 verification badge check to adding account
