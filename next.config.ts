import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Header keamanan untuk semua rute. Pusat Akun = app identitas+billing berbasis cookie
  // dengan aksi mutasi lewat server action; frame-ancestors mencegah clickjacking, HSTS
  // memaksa TLS di domain cookie, sisanya hardening standar.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

// Sentry — errors-only, hemat kuota (free tier). Tracing & Session Replay di-tree-shake
// dari bundle client lewat bundleSizeOptimizations; runtime config (instrumentation-client.ts
// / sentry.server.config.ts) juga tidak mengaktifkannya.
export default withSentryConfig(nextConfig, {
  // Slug org & project Sentry — dipakai HANYA untuk upload source map saat build CI.
  // Buat project terpisah untuk Pusat Akun (mis. "javascript-nextjs") agar error-nya
  // tidak tercampur dengan website utama (Astro). Override lewat env bila slug berbeda.
  org: process.env.SENTRY_ORG ?? "your-org",
  project: process.env.SENTRY_PROJECT ?? "javascript-nextjs",

  // Upload source map hanya jika SENTRY_AUTH_TOKEN diset (mis. di CI). Tanpa token,
  // build tetap jalan tanpa upload — tidak ada kredensial yang masuk ke bundle.
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Hanya cetak log upload source map saat di CI.
  silent: !process.env.CI,

  // Tree-shake fitur berkuota (tracing + replay) keluar dari bundle browser.
  bundleSizeOptimizations: {
    excludeTracing: true,
    excludeReplayShadowDom: true,
    excludeReplayIframe: true,
    excludeReplayWorker: true,
  },

  // Nonaktifkan telemetry build milik Sentry.
  telemetry: false,
});
