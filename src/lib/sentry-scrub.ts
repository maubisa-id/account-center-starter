import type { ErrorEvent, EventHint } from "@sentry/nextjs";

// Defense-in-depth PII scrubbing untuk Pusat Akun (auth + pembayaran + data pribadi).
// Konfigurasi `dataCollection` sudah mematikan userInfo & body request, tetapi data
// sensitif kadang bocor lewat pesan error, URL, query string, atau extra data. Fungsi
// ini membersihkannya SEBELUM event dikirim ke Sentry (UU PDP + hemat kuota).
//
// Pure JS, tanpa dependensi Node — aman dipakai di runtime Node maupun Edge.

const REDACTED = "[redacted]";

// Nama field yang isinya selalu disamarkan (cocok sebagian, case-insensitive).
const SENSITIVE_KEY = new RegExp(
  [
    "pass(word)?",
    "secret",
    "token",
    "auth",
    "cookie",
    "session",
    "otp",
    "nik",
    "email",
    "phone",
    "telp",
    "hp",
    "alamat",
    "address",
    "card",
    "cvv",
    "cvc",
    "pan",
    "midtrans",
    "snap",
    "signature",
    "va_number",
    "account_number",
  ].join("|"),
  "i",
);

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// Urutan angka panjang: nomor HP, kartu, VA, NIK (16 digit), dsb.
const LONG_DIGITS_RE = /\b\d{9,}\b/g;

function scrubString(value: string): string {
  return value.replace(EMAIL_RE, REDACTED).replace(LONG_DIGITS_RE, REDACTED);
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6 || value == null) return value;

  if (typeof value === "string") return scrubString(value);
  if (typeof value === "number" || typeof value === "boolean") return value;

  if (Array.isArray(value)) return value.map((item) => scrub(item, depth + 1));

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : scrub(val, depth + 1);
    }
    return out;
  }

  return value;
}

// Petakan path URL -> area fitur, supaya tiap error di dashboard Sentry langsung
// kelihatan "ini error di bagian apa" (auth / checkout / billing / webhook / dst).
// Ini yang bikin dashboard "ngomong sendiri": filter/cari pakai tag `feature:checkout`.
function featureFromPath(pathname: string | null): string {
  if (!pathname) return "app";
  const p = pathname.toLowerCase();
  if (p.startsWith("/api/webhook/midtrans")) return "payment.webhook";
  if (
    p.startsWith("/api/pay") ||
    p.startsWith("/api/checkout") ||
    p.startsWith("/checkout") ||
    p.startsWith("/beli") ||
    p.startsWith("/bayar")
  )
    return "checkout";
  if (p.startsWith("/api/provision")) return "provisioning";
  if (p.startsWith("/api/account")) return "account";
  if (
    p.startsWith("/api/auth") ||
    p.startsWith("/login") ||
    p.startsWith("/masuk") ||
    p.startsWith("/daftar") ||
    p.startsWith("/2fa")
  )
    return "auth";
  if (p.startsWith("/lupa-password") || p.startsWith("/reset-password")) return "password";
  if (p.startsWith("/langganan")) return "subscription";
  if (p.startsWith("/pembayaran") || p.startsWith("/metode-pembayaran") || p.startsWith("/invoice"))
    return "billing";
  if (p.startsWith("/profil")) return "profile";
  if (p.startsWith("/akses")) return "access";
  if (p.startsWith("/keamanan")) return "security";
  if (p.startsWith("/notifikasi") || p.startsWith("/api/preferences") || p.startsWith("/privasi"))
    return "preferences";
  if (p.startsWith("/acara")) return "events";
  return "app";
}

function pathnameOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url, "http://placeholder").pathname;
  } catch {
    return url.split("?")[0];
  }
}

// beforeSend hook: (1) tandai area fitur biar error mudah dibaca di dashboard,
// (2) bersihkan PII sebelum event dikirim ke Sentry.
export function processEvent(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  // Tag area fitur dihitung dari URL/route SEBELUM URL disamarkan.
  const path =
    pathnameOf(event.request?.url) ??
    (typeof event.transaction === "string" ? event.transaction : null);
  event.tags = { ...(event.tags ?? {}), feature: featureFromPath(path) };

  if (event.request) {
    // Jangan pernah kirim cookie/header/body; query string & URL disamarkan.
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    if (event.request.query_string) {
      event.request.query_string = scrub(event.request.query_string) as typeof event.request.query_string;
    }
    if (typeof event.request.url === "string") {
      event.request.url = scrubString(event.request.url);
    }
  }

  // Jangan lampirkan identitas user.
  delete event.user;

  if (event.extra) event.extra = scrub(event.extra) as typeof event.extra;
  if (event.contexts) event.contexts = scrub(event.contexts) as typeof event.contexts;

  // Pesan exception sering memuat email/nomor -> samarkan juga.
  if (event.exception?.values) {
    for (const ex of event.exception.values) {
      if (ex.value) ex.value = scrubString(ex.value);
    }
  }
  if (typeof event.message === "string") {
    event.message = scrubString(event.message);
  }

  return event;
}
