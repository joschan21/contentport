## contentport

MVP
- style dropdown and config (X)
- make assistant list improvements (X)
- no refresh needed after new context doc (X)
- remove save/history

style tab:
- add new style
- import tweets
- custom prompt

edit tool should just know about:
- current message
- previous suggestions
- current tweet state

CURRENT
- remove "al tweets" - just show all for simplicity

BUGS
- safari image editor doesnt work
- chrome edit image doesnt work
- after some time most recent tweets are not shown in sidebar, only after reloading 

NEED TO DO BEFORE NEXT SHIP:

BUG FIXES
- when clicking "new tweet", start a new chat

PRIORITY
- one tweet can override another in recents HARD
- implement back rate-limiting EASY
- allow navigation while chatting to asisstant (ideally just like openai desktop) HARD
    HOTFIX: force nav to studio if not already there
- refresh knowledge base after onboarding and after inserting new document EASY
    LET IN BATCH - 50
- drafts (3 to choose from)
- offer option to save as knowledge doc EASY
    LET IN BATCH
- image editor fixes HARD
    - image tool doesnt work anymore
    LET IN BATCH


FEATURE IDEAS
- show related documents to user query in chat (e.g. typed in ...about contentport) -> suggest docs related to contentport above certain threshold (0.9)

