import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor, emailOTP, captcha } from "better-auth/plugins";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { DB_PROVIDER } from "@/lib/db-config";
import { sendEmail } from "@/lib/email";
import { otpEmail, resetPasswordEmail, welcomeEmail } from "@/lib/email-templates";
import { linkDirectusRegistrationsByEmail } from "@/lib/events";
import { shouldSendWelcome } from "@/lib/email-suppress";

// Better Auth mengelola tabel auth_* sendiri. Identitas billing (maubisa_core.users)
// ditautkan lewat users.auth_user_id + email (databaseHook di bawah).
const AUTH_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
// SSO lintas subdomain hanya diaktifkan di produksi (*.maubisa.id), bukan localhost.
const COOKIE_DOMAIN = AUTH_URL.includes("maubisa.id") ? ".maubisa.id" : undefined;
// Origin yang dipercaya untuk SSO: semua subdomain Maubisa boleh memanggil auth API
// (mis. app/kelas membaca sesi/preferensi). Di lokal cukup localhost.
const TRUSTED_ORIGINS = COOKIE_DOMAIN
  ? [
      "https://maubisa.id",
      "https://akun.maubisa.id",
      "https://app.maubisa.id",
      "https://kelas.maubisa.id",
      "https://thesis.maubisa.id",
    ]
  : ["http://localhost:3000"];

// CAPTCHA (Cloudflare Turnstile) — anti-bot untuk daftar & masuk. Aktif HANYA bila
// TURNSTILE_SECRET_KEY diset (fail-open di lokal tanpa kunci supaya dev lancar). Endpoint
// dibatasi ke sign-up/sign-in saja: reset kata sandi & OTP tetap jalan tanpa token.
// FAIL-CLOSED DI PRODUKSI: kalau NODE_ENV=production tapi kunci Turnstile tak ada, itu
// salah konfigurasi berbahaya (bot bebas menyerang daftar/masuk) -> hentikan boot. TAPI
// JANGAN throw saat `next build` (NEXT_PHASE=phase-production-build): build tak melayani
// request & kunci sering hanya tersedia runtime (secret), jadi cukup ditegakkan saat serve.
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !TURNSTILE_SECRET
) {
  throw new Error(
    "TURNSTILE_SECRET_KEY wajib diset di produksi (proteksi anti-bot daftar/masuk). " +
      "Set kuncinya, atau jalankan non-produksi bila memang ingin captcha nonaktif.",
  );
}
const captchaPlugins = TURNSTILE_SECRET
  ? [
      captcha({
        provider: "cloudflare-turnstile" as const,
        secretKey: TURNSTILE_SECRET,
        endpoints: ["/sign-up/email", "/sign-in/email"],
      }),
    ]
  : [];

export const auth = betterAuth({
  // Provider mengikuti DB_PROVIDER (env) supaya sinkron dgn schema.prisma saat pindah
  // ke MySQL — tak lagi hardcode "sqlite" di dua tempat (AUDIT P2).
  database: prismaAdapter(prisma, { provider: DB_PROVIDER }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: TRUSTED_ORIGINS,
  // Batasi brute-force di endpoint auth. Baseline 30/menit; aturan khusus memperketat
  // jalur sensitif (masuk/daftar/OTP/reset) supaya tak mudah di-abuse.
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 60, max: 5 },
      "/two-factor/verify-totp": { window: 60, max: 8 },
      "/email-otp/send-verification-otp": { window: 60, max: 4 },
      "/email-otp/verify-email": { window: 60, max: 8 },
      "/request-password-reset": { window: 300, max: 4 },
      "/reset-password": { window: 300, max: 6 },
    },
  },
  // Cookie sesi berlaku untuk seluruh *.maubisa.id supaya "Buka layanan" auto-login
  // (ADR-001 §2.3, ADR-002 §3). Di lokal, biarkan default (host-only).
  advanced: COOKIE_DOMAIN
    ? { crossSubDomainCookies: { enabled: true, domain: COOKIE_DOMAIN } }
    : undefined,
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      // Tautan sekali pakai untuk atur ulang kata sandi (ADR-002 §6).
      const { subject, html, from, replyTo } = resetPasswordEmail(url);
      const res = await sendEmail({ to: user.email, subject, html, from, replyTo });
      // Cetak tautan reset HANYA di non-produksi. Guard NODE_ENV mencegah kebocoran token
      // ke log server bila SMTP kebetulan salah konfigurasi di produksi (M-8).
      if (res.dev && process.env.NODE_ENV !== "production") console.log(`\n[RESET PASSWORD] ${user.email}\n  ${url}\n`);
    },
  },
  plugins: [
    ...captchaPlugins,
    twoFactor({
      schema: {
        twoFactor: { modelName: "authTwoFactor" },
      },
    }),
    // OTP 6 digit via email untuk: verifikasi saat daftar, reset kata sandi,
    // dan masuk tanpa kata sandi. Lokal: kode dicetak ke konsol server.
    // Produksi: kirim lewat provider email (Resend/SMTP) — cukup ganti body fungsi ini.
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      async sendVerificationOTP({ email, otp, type }) {
        // Kirim kode via email branded (no-reply@maubisa.id). Fallback: cetak ke konsol.
        const { subject, html, from, replyTo } = otpEmail(otp, type);
        const res = await sendEmail({ to: email, subject, html, from, replyTo });
        // OTP dicetak HANYA di non-produksi (guard NODE_ENV anti-bocor token di log prod, M-8).
        if (res.dev && process.env.NODE_ENV !== "production") {
          const label =
            type === "sign-in" ? "MASUK" : type === "email-verification" ? "VERIFIKASI EMAIL" : "RESET KATA SANDI";
          console.log(`\n[OTP ${label}] ${email}\n  Kode: ${otp}  (berlaku 10 menit)\n`);
        }
      },
    }),
  ],
  // Peta model Better Auth -> model Prisma khusus (hindari bentrok dengan `User` core).
  user: { modelName: "authUser" },
  session: { modelName: "authSession" },
  account: { modelName: "authAccount" },
  verification: { modelName: "authVerification" },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Buat/tautkan core user (maubisa_core) berdasar email (dikunci UNIQUE).
          const coreUser = await prisma.user.upsert({
            where: { email: user.email },
            update: { authUserId: user.id, name: user.name },
            create: {
              uuid: randomUUID(),
              authUserId: user.id,
              name: user.name,
              email: user.email,
              status: "active",
              emailVerifiedAt: user.emailVerified ? new Date() : null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          // PINTU LAHIR AKUN (satu-satunya): semua jalur pembuatan akun lewat sini —
          // /daftar (daftar-dulu) & provision (beli-langsung, via signUpEmail). Jadi backfill
          // penautan pendaftaran event ANONIM (core_user_id NULL) by email cukup dipasang SEKALI
          // di sini utk menutup SEMUA jalur (ADR-001). Best-effort: jgn gagalkan pembuatan akun.
          try {
            await linkDirectusRegistrationsByEmail(coreUser.email, coreUser.uuid);
          } catch {
            /* penautan opsional (butuh Directus); abaikan bila gagal */
          }

          // Email "selamat datang" untuk SELF SIGN-UP. Jalur pembelian (provision/webhook guest)
          // memanggil suppressWelcomeOnce() lebih dulu -> di sini dilewati, karena mereka mengirim
          // welcomeAccessEmail (berisi info akses) sendiri. Best-effort, jangan gagalkan signup.
          if (shouldSendWelcome(coreUser.email)) {
            try {
              const { subject, html, from, replyTo } = welcomeEmail({
                name: coreUser.name,
                loginUrl: `${AUTH_URL}/masuk`,
              });
              await sendEmail({ to: coreUser.email, subject, html, from, replyTo });
            } catch {
              /* email opsional; jangan blok pembuatan akun */
            }
          }
        },
      },
    },
  },
});
