import * as Sentry from "@sentry/nextjs";

import { processEvent } from "@/lib/sentry-scrub";

// Inisialisasi Sentry untuk runtime Node (Server Components, Route Handlers,
// Server Actions, webhook Midtrans, dll).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Hanya aktif di production DAN saat DSN terpasang. Di dev/preview Sentry mati
  // total sehingga tidak membuang kuota free tier.
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Pisahkan event per lingkungan (production / staging).
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "production",

  // Errors only. Tracing (spans) punya kuota terpisah -> matikan agar tetap gratis.
  tracesSampleRate: 0,

  // Logs juga punya kuota terpisah -> matikan.
  enableLogs: false,

  // Privasi / UU PDP: jangan kirim identitas user maupun body HTTP.
  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },

  // Pembersih PII lapis kedua (email, nomor HP/kartu/VA, token, dll).
  beforeSend: processEvent,
});
