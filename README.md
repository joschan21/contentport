<!-- PROJECT LOGO -->
<p align="center">
  <a href="https://github.com/contentport">
   <img src="https://www.contentport.io/logo.png" alt="Contentport Logo" width="120">
  </a>

  <h3 align="center">Contentport</h3>

  <p align="center">
    Your content engine for growing on Twitter
    <br />
    <a href="https://www.contentport.io"><strong>Create and schedule Twitter content at scale »</strong></a>
    <br />
    <br />
    <a href="https://www.contentport.io">Website</a>
    ·
    <a href="https://www.contentport.io/features">Features</a>
    ·
    <a href="https://github.com/contentport/issues">Issues</a>
    ·
    <a href="https://www.contentport.io/pricing">Pricing</a>
  </p>
</p>

<p align="center">
   <a href="https://www.contentport.io"><img src="https://img.shields.io/badge/Website-contentport.io-2ea44f" alt="Website"></a>
   <a href="https://twitter.com/contentport"><img src="https://img.shields.io/badge/Twitter-@contentport-1DA1F2?logo=twitter" alt="Twitter"></a>
   <a href="https://github.com/contentport"><img src="https://img.shields.io/badge/Open%20Source-100%25-brightgreen" alt="Open Source"></a>
</p>

<p align="center">
   <a href="https://github.com/contentport/stargazers"><img src="https://img.shields.io/github/stars/contentport" alt="Github Stars"></a>
   <a href="https://github.com/contentport/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue" alt="License"></a>
</p>

---

# contentport

## Getting Started

> **Note:** This is a WIP and not comprehensive. Please contribute an improvement if you want to help others get started or us to offer a better onboarding experience.

### Prerequisites

- **`DATABASE_URL`** — A serverless Postgres database. This project uses Drizzle with the PostgreSQL dialect.
  <a href="https://console.neon.tech/signup"><img src="https://img.shields.io/badge/Sign%20up-Neon%20Database-00e599?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyeiIvPjwvc3ZnPg==" alt="Sign up for Neon" /></a>

  Or, if you prefer the CLI: `neonctl databases create --name contentport` ([Neon CLI docs](https://neon.com/docs/reference/cli-databases))

- **`NEXT_PUBLIC_POSTHOG_KEY`** — A PostHog project API key for analytics.
  <a href="https://us.posthog.com/signup"><img src="https://img.shields.io/badge/Sign%20up-PostHog-1d4aff?style=for-the-badge&logo=posthog&logoColor=white" alt="Sign up for PostHog" /></a>

### Follow along

1. **Download the source code.** Clone the repo locally:
   ```bash
   gh repo clone joschan21/contentport
   # or via HTTPS
   git clone https://github.com/joschan21/contentport.git
   ```
2. **Configure secrets.** Set environment variables:
   ```bash
   cp .env.example .env
   ```
   Then fill in the keys obtained from [Prerequisites](#prerequisites) (at minimum `DATABASE_URL`).
3. **Install dependencies:**
   ```bash
   bun i
   ```
4. **Push the database schema:**
   ```bash
   bun db:push
   ```
5. **Run the development server:**
   ```bash
   bun dev
   ```

---

## **Public Roadmap** (last updated: 29th Nov 2025)

### **Features in Pipeline**

#### **Priority 1**

* Dark mode (requested by many users)
* Responsive layout (requested by many users)
* Community posting (requested by many users)
* Proactively create posts for users (requested by many users)
* Native code snippet editor (Raycast-style) — personal wish (Jo)
* Accurate character limit handling for free Twitter users (necessary for UX)
* Auto-plug (potentially useful feature)
* Timezone selection (requested by many users)

  * Clarify whether scheduled times reflect:

    * Local timezone
    * UTC
    * Or something else
  * Display the active timezone clearly
* Multiple Workspaces / Parallel Tweet Angles

  * Avoid mixed AI context when planning several threads
  * Each workspace should preserve its own style, tone, and iteration history
  * Example use cases:

    * Serious launch announcement
    * Meme version of the tweet
    * Vendor-lock-in angle
  * Context should never leak across workspaces

---

#### **Priority 2**

* Switch between different LLMs — personal wish (Jo)
* Personalized example ideas (similar to the OpenAI Atlas Browser) — requested by many
* Voice input for assistant — personal wish (Josh)

---

#### **Priority 3**

* Viral tweet library (potentially useful feature)
* Enable web browsing (potentially useful feature)

---

### **Bugs**

* Timezone issues / “-1 days” calendar error
* Creating transcripts from videos
* Images get saved in the main tweet when using threads
* Editing and rerun the prompts in Assistant

---

### **Improvements**

* Assistant style handling
* Upgrade modal / paywall / email flow
* Reflection in screenshot editor
* Input field UX improvements
* Clarify per-account data vs. shared data

  * Some settings (e.g., keyword monitors) appear shared
  * Users expect these to be per-account
  * Clarify via UI labels or structure
* Show Pro plan features before upgrading

  * Currently only visible when logged out
  * Suggest:

    * In-app comparison table
    * “What’s included” modal
* Debug logs in console

---

Wishes and feedback are welcomed.
We appreciate every PR and any help from the community.

**Thank you for using Contentport.**
— Jo & Josh
(@jommerkatz & @joshtriedcoding)
