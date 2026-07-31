import nodemailer, { type Transporter } from "nodemailer";

// Pengiriman email transaksional Maubisa. Konfigurasi SMTP DISAMAKAN dengan
// thesis.maubisa.id (Laravel MAIL_*): smtp.gmail.com:587 TLS, from no-reply@maubisa.id.
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
  const addr = process.env.MAIL_FROM_ADDRESS ?? "no-reply@maubisa.id";
  const name = process.env.MAIL_FROM_NAME ?? "Maubisa";
  return `${name} <${addr}>`;
}

function stripHtml(html: string): string {
  // Bangun fallback teks-polos TANPA regex polinomial (`<style[\s\S]*?</style>`) atau
  // penghapusan tag satu-lewat yang bisa disalip (CodeQL: incomplete multi-character
  // sanitization). Pemindaian linear pakai indexOf: buang isi <style>/<script>, hapus tag
  // lain jadi spasi. Seluruhnya O(n).
  const lower = html.toLowerCase();
  const n = html.length;
  let out = "";
  let i = 0;
  while (i < n) {
    const lt = html.indexOf("<", i);
    if (lt === -1) {
      out += html.slice(i);
      break;
    }
    out += html.slice(i, lt);
    const gt = html.indexOf(">", lt + 1);
    if (gt === -1) break; // tag tak tertutup: buang sisanya
    const name = lower.slice(lt + 1, gt);
    if (name.startsWith("style") || name.startsWith("script")) {
      const closer = name.startsWith("style") ? "</style" : "</script";
      const close = lower.indexOf(closer, gt + 1);
      if (close === -1) break;
      const closeGt = html.indexOf(">", close);
      i = closeGt === -1 ? n : closeGt + 1;
    } else {
      out += " ";
      i = gt + 1;
    }
  }
  return out.replace(/\s+/g, " ").trim();
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
    const envelopeFrom = process.env.MAIL_USERNAME || process.env.MAIL_FROM_ADDRESS || "no-reply@maubisa.id";
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
