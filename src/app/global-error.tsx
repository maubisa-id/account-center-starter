"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// global-error menggantikan root layout saat terjadi error tak tertangani,
// jadi ia harus memuat <html>/<body> sendiri dan tidak bisa mengandalkan style layout.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="id">
      <body
        style={{
          minHeight: "100dvh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
          color: "#141414",
          background: "#faf8f5",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
          Terjadi kesalahan
        </h1>
        <p style={{ maxWidth: "28rem", color: "#6b6b6b", lineHeight: 1.6, margin: 0 }}>
          Maaf, terjadi kesalahan tak terduga. Tim kami sudah diberi tahu. Silakan muat ulang
          halaman atau coba lagi beberapa saat lagi.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            marginTop: "0.5rem",
            borderRadius: "9999px",
            border: "none",
            background: "#0a48b7",
            color: "#ffffff",
            padding: "0.625rem 1.25rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Muat ulang
        </button>
      </body>
    </html>
  );
}
