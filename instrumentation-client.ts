import posthog from "posthog-js";

posthog.init(Bun.env.NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: "/ingest",
  ui_host: "https://eu.posthog.com",
  defaults: '2025-05-24',
  capture_exceptions: true, // This enables capturing exceptions using Error Tracking, set to false if you don't want this
  // debug: Bun.env.NODE_ENV === "development",
  
});
