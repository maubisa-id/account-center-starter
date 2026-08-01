import * as Sentry from "@sentry/nextjs";

import { processEvent } from "@/lib/sentry-scrub";

// Inisialisasi Sentry di sisi browser (client). Errors only:
// - TANPA Session Replay (kuota replay terpisah & bisa merekam data user).
// - TANPA browser performance tracing (kuota spans terpisah).
// Session Replay & tracing juga sudah di-tree-shake dari bundle lewat
// bundleSizeOptimizations di next.config.ts (jangan tambahkan integrasinya di sini).
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Hanya aktif di production DAN saat DSN terpasang.
  enabled: process.env.NODE_ENV === "production" && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),

  // Pisahkan event per lingkungan (production / staging).
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || "production",

  tracesSampleRate: 0,
  enableLogs: false,

  // Privasi / UU PDP: jangan kirim data user atau body form.
  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    httpBodies: [],
  },

  // Saring "noise" browser yang bukan bug aplikasi (ekstensi, bot, ResizeObserver)
  // supaya tidak membuang kuota error.
  ignoreErrors: [
    /ResizeObserver loop/,
    "Non-Error promise rejection captured",
    "Object Not Found Matching Id",
  ],
  denyUrls: [
    /extensions\//i,
    /^chrome-extension:\/\//i,
    /^moz-extension:\/\//i,
    /^safari-web-extension:\/\//i,
    /^chrome:\/\//i,
  ],

  beforeSend: processEvent,
});

// Diminta oleh @sentry/nextjs untuk meng-hook navigasi router. Aman meski tracing
// mati (tracesSampleRate: 0) -> tidak ada span yang dibuat, tidak makan kuota.
// Menghindari warning "ACTION REQUIRED" saat build & siap bila tracing diaktifkan nanti.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
