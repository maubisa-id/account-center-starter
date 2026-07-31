import * as Sentry from "@sentry/nextjs";

import { processEvent } from "@/lib/sentry-scrub";

// Inisialisasi Sentry untuk Edge runtime (mis. proxy/middleware bila nanti dipakai).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Pisahkan event per lingkungan (production / staging).
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "production",

  // Errors only — tanpa tracing/logs (kuota terpisah).
  tracesSampleRate: 0,
  enableLogs: false,

  // Privasi / UU PDP.
  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },

  beforeSend: processEvent,
});
