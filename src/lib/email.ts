import nodemailer, { type Transporter } from "nodemailer";

// Pengiriman email transaksional Acme. Konfigurasi SMTP DISAMAKAN dengan
// thesis.example.com (Laravel MAIL_*): smtp.gmail.com:587 TLS, from no-reply@example.com.
// Cukup salin MAIL_USERNAME/MAIL_PASSWORD yang sama ke .env repo ini.
// Kalau SMTP belum diisi (dev), email dicetak ringkas ke konsol supaya alur tetap jalan.

type SendArgs = { to: string; subject: string; html: string; text?: string; from?: string; replyTo?: string };

let cached: Transporter | null | undefined;

function getTransport(): Transporter | null {
  if (cached !== undefined) return cached;
  const host = process.env.MAIL_HOST;
  const port = Number(process.env.MAIL_PORT ?? 587);
  const user = process.env.MAIL_USERNAME;
  const pass = process.env.MAIL_PASSWORD;
  // Anggap belum dikonfigurasi bila kosong / masih default log-mailer Laravel.
  if (!host || !user || !pass || host === "127.0.0.1" || user === "null") {
    cached = null;
    return null;
  }
  const secure = port === 465 || process.env.MAIL_ENCRYPTION === "ssl";
  cached = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
  return cached;
}

export function mailFrom(): string {
  const addr = process.env.MAIL_FROM_ADDRESS ?? "no-reply@example.com";
  const name = process.env.MAIL_FROM_NAME ?? "Acme";
  return `${name} <${addr}>`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function sendEmail({ to, subject, html, text, from, replyTo }: SendArgs): Promise<{ ok: boolean; dev: boolean; error?: string }> {
  const t = getTransport();
  if (!t) {
    console.log(`\n[EMAIL - DEV] ${to}\n  subjek: ${subject}\n  (SMTP belum diset di .env. Set MAIL_* untuk kirim sungguhan)\n`);
    return { ok: true, dev: true };
  }
  try {
    // Envelope MAIL FROM dipaksa ke akun SMTP terautentikasi (sistem@) supaya Gmail
    // tidak menolak saat header From pakai alias sistem@ (no-reply@/notifikasi@).
    // Reply-To diarahkan ke alias manusia (halo@/tagihan@) supaya balasan tetap sampai.
    const envelopeFrom = process.env.MAIL_USERNAME || process.env.MAIL_FROM_ADDRESS || "no-reply@example.com";
    await t.sendMail({ from: from ?? mailFrom(), to, subject, html, text: text ?? stripHtml(html), replyTo, envelope: { from: envelopeFrom, to } });
    return { ok: true, dev: false };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[EMAIL] gagal kirim ke ${to}: ${error}`);
    return { ok: false, dev: false, error };
  }
}

export function isEmailConfigured(): boolean {
  return getTransport() !== null;
}
