import * as Sentry from "@sentry/nextjs";

// Next.js instrumentation hook: muat konfigurasi Sentry sesuai runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Tangkap error dari Server Components, Route Handlers, dan proxy.
export const onRequestError = Sentry.captureRequestError;
