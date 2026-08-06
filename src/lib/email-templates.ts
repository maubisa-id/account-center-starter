/**
 * Sistem email transaksional & lifecycle layanan ini.
 *
 * impeccable-disable design-system-font-size, design-system-radius, design-system-color, design-system-font, broken-image -- HTML EMAIL, bukan UI web: klien email (Gmail/Outlook) membuang CSS variabel/Tailwind, jadi ukuran/warna/radius WAJIB inline px+hex dari token yang disamakan manual. Medium render berbeda dari app.
 *
 * Bahasa desain: editorial layanan ini. Header band brand (biru gradasi) dengan wordmark
 * putih, area konten putih, tipografi Cabinet Grotesk + Satoshi, panel double-bezel,
 * tombol button-in-button, footer kaya (kontak + sosial + legal).
 *
 * Semua HTML berbasis tabel + inline-CSS supaya konsisten di Gmail / Apple Mail /
 * Outlook (klien email membuang JS, flexbox, dan SVG inline). Tanpa em dash.
 *
 * From routing (notifikasi.md §6): kanal 'akun' -> akun@, 'tagihan' -> tagihan@,
 * 'info' -> info@ supaya user bisa memfilter, bukan semua dari satu no-reply.
 */

import { BRAND as SITE } from "@/lib/brand";

// ── Tokens (disamakan dengan token desain starter) ───────────
const BRAND = "#0a48b7"; // brand-500
const BRAND_LITE = "#3f6be0"; // brand-400 (untuk strip gradasi)
const BRAND_DEEP = "#083a95"; // brand-600
const INK = "#141414"; // color-ink
const SUBINK = "#3f3f46"; // color-ink-soft
const MUTED = "#6b6b6b"; // color-muted (netral, bukan tan)
const PAGE = "#f4f6f9"; // latar sangat terang (nyaris putih) supaya kartu tidak seperti "tempelan"
const CARD = "#ffffff";
const TRAY2 = "#f6f8fc"; // nampan panel (cool light)
const HAIR2 = "#e5ebf4"; // garis halus (cool)
const ROWLINE = "#eef1f6";
const TINT = "#eef4fe"; // brand-50
const DISPLAY = "'Cabinet Grotesk','Clash Display',system-ui,-apple-system,'Segoe UI',sans-serif";
const SANS = "'Satoshi',system-ui,-apple-system,'Segoe UI',sans-serif";
// Logo email (URL absolut; email tak bisa aset relatif). Dari BRAND (env); bila kosong,
// header/footer memakai nama brand sebagai teks.
const LOGO_DARK = SITE.logoDarkUrl;
// Origin app untuk tautan (mis. kelola preferensi). Dari BETTER_AUTH_URL; kosong -> tautan disembunyikan.
const APP_URL = (process.env.BETTER_AUTH_URL || "").replace(/\/+$/, "");

// Aset visual (ilustrasi + badge). Di email, satu-satunya visual yang andal =
// gambar raster (PNG) yang di-host, dipanggil lewat <img>. Base bisa dioverride
// lewat EMAIL_ASSET_BASE untuk preview lokal.
const ASSET_BASE = process.env.EMAIL_ASSET_BASE ? process.env.EMAIL_ASSET_BASE.replace(/\/+$/, "") : "";
const assetUrl = (name: string) => (ASSET_BASE ? `${ASSET_BASE}/${name}.png` : "");
const heroUrl = (k: string) => assetUrl(`hero-${k}`);
const badgeUrl = (k: string) => assetUrl(`badge-${k}`);
const HERO_FALLBACK: Record<string, string> = {
  "Keamanan Akun": "security", "Selamat Datang": "welcome",
  "Tagihan": "payment", "Langganan": "payment",
  "Acara": "event", "Kelas": "learning", "Konsultasi": "thesis",
  "Komunitas": "community", "Pengumuman": "community", "Tantangan": "learning",
  "Belajar": "learning", "Kabar Produk": "community", "Promo": "community",
  "Pemberitahuan": "community",
};

export type Channel = "akun" | "tagihan" | "info";
// From HARUS alamat yang boleh dikirim oleh akun SMTP terautentikasi (sistem@).
// Alias milik sistem@: no-reply@ dan notifikasi@ -> dipakai sebagai From supaya
// Gmail TIDAK menulis ulang jadi sistem@. Reply-To diarahkan ke alias manusia
// (halo@, tagihan@ milik manajemen@) supaya balasan pelanggan sampai ke tim.
// Kalau SMTP Relay Service aktif, From boleh dioverride ke alamat semantik penuh
// (mis. tagihan@) lewat env MAIL_FROM_* tanpa ubah kode.
const env = (k: string) => (typeof process !== "undefined" && process.env[k]) || "";
const FROM: Record<Channel, string> = {
  akun: env("MAIL_FROM_AKUN") || "Keamanan Akun <no-reply@example.com>",
  tagihan: env("MAIL_FROM_TAGIHAN") || "Tagihan <notifikasi@example.com>",
  info: env("MAIL_FROM_INFO") || "Pusat Akun <notifikasi@example.com>",
};
const REPLYTO: Record<Channel, string> = {
  akun: env("MAIL_REPLYTO_AKUN") || "halo@example.com",
  tagihan: env("MAIL_REPLYTO_TAGIHAN") || "tagihan@example.com",
  info: env("MAIL_REPLYTO_INFO") || "halo@example.com",
};

const esc = (s: unknown): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const hi = (name?: string) => `Halo${name ? " " + esc(name) : ""},`;

// ── Partials ─────────────────────────────────────────────────────────────────

function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate"><tr>
    <td bgcolor="${BRAND}" style="border-radius:9999px;box-shadow:0 10px 22px -12px rgba(10,72,183,.5)">
      <a href="${esc(url)}" style="display:block;padding:6px 6px 6px 22px;text-decoration:none">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="padding-right:12px;font-family:${SANS};font-weight:700;font-size:14px;color:#ffffff;letter-spacing:.01em">${esc(label)}</td>
          <td><div style="width:32px;height:32px;line-height:32px;text-align:center;border-radius:9999px;background:rgba(255,255,255,.18);color:#ffffff;font-size:15px">&#8594;</div></td>
        </tr></table>
      </a>
    </td></tr></table>`;
}

function panel(innerRows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${TRAY2};border:1px solid ${HAIR2};border-radius:20px">
    <tr><td style="padding:6px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CARD};border-radius:15px;box-shadow:inset 0 1px 0 rgba(255,255,255,.9)">${innerRows}</table></td></tr></table>`;
}

type Row = { label: string; value: string; strong?: boolean } | null | undefined | false;

export function infoTable(rows: Row[]): string {
  const cells = rows
    .filter((r): r is { label: string; value: string; strong?: boolean } => Boolean(r))
    .map((r, i) => {
      const top = i ? `border-top:1px solid ${ROWLINE};` : "";
      const vStyle = r.strong ? "font-size:15px;font-weight:700" : "font-size:13px;font-weight:600";
      return `<tr>
        <td style="padding:13px 18px;${top}font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:${MUTED};vertical-align:top;white-space:nowrap">${esc(r.label)}</td>
        <td style="padding:13px 18px;${top}font-family:${SANS};${vStyle};color:${INK};text-align:right;word-break:break-word">${r.value}</td>
      </tr>`;
    })
    .join("");
  return panel(cells);
}

function otpBlock(code: string): string {
  return panel(`<tr><td style="padding:22px 20px;text-align:center">
    <div style="font-family:${DISPLAY};font-size:34px;font-weight:700;letter-spacing:10px;color:${INK};padding-left:10px">${esc(code)}</div>
  </td></tr>`);
}

function amountBlock(amount: string, caption: string): string {
  return panel(`<tr><td style="padding:20px 20px;text-align:center">
    <div style="font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:${MUTED}">${esc(caption)}</div>
    <div style="font-family:${DISPLAY};font-size:26px;font-weight:700;color:${INK};margin-top:6px">${esc(amount)}</div>
  </td></tr>`);
}

function notice(kind: "success" | "info" | "warning" | "danger", text: string): string {
  const c = {
    success: { bg: "#edf8f1", tx: "#0f5c33" },
    info: { bg: TINT, tx: BRAND_DEEP },
    warning: { bg: "#fdf5e6", tx: "#7a5307" },
    danger: { bg: "#fdeeee", tx: "#8f2521" },
  }[kind];
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${c.bg};border-radius:16px"><tr>
    <td width="50" style="width:50px;padding:15px 4px 15px 16px;vertical-align:middle"><img src="${badgeUrl(kind)}" width="34" height="34" alt="" style="width:34px;height:34px;display:block;border:0;outline:none"></td>
    <td style="padding:15px 18px 15px 10px;font-family:${SANS};font-size:15px;line-height:1.55;color:${c.tx}">${text}</td>
  </tr></table>`;
}

function steps(items: string[]): string {
  const rows = items
    .map(
      (t, i) => `<tr>
      <td style="width:34px;vertical-align:top;padding:0 0 ${i === items.length - 1 ? 0 : 14}px 0">
        <div style="width:26px;height:26px;line-height:26px;text-align:center;border-radius:9999px;background:${TINT};color:${BRAND};font-family:${SANS};font-size:13px;font-weight:700">${i + 1}</div>
      </td>
      <td style="padding:2px 0 ${i === items.length - 1 ? 0 : 14}px 0;font-family:${SANS};font-size:15px;line-height:1.55;color:${SUBINK}">${t}</td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`;
}

function avatar(name: string): string {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0] || "").join("").toUpperCase() || "M";
  return `<div style="width:42px;height:42px;line-height:42px;text-align:center;border-radius:9999px;background:${TINT};color:${BRAND};font-family:${DISPLAY};font-size:15px;font-weight:700">${esc(initials)}</div>`;
}

function personCard(name: string, role: string): string {
  return panel(`<tr><td style="padding:16px 20px">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:14px;vertical-align:middle">${avatar(name)}</td>
      <td style="vertical-align:middle">
        <div style="font-family:${SANS};font-size:14px;font-weight:700;color:${INK}">${esc(name)}</div>
        <div style="font-family:${SANS};font-size:12px;color:${MUTED};margin-top:2px">${esc(role)}</div>
      </td>
    </tr></table>
  </td></tr>`);
}

const link = (url: string, text?: string) =>
  `<a href="${esc(url)}" style="color:${BRAND};font-weight:700;text-decoration:none">${esc(text ?? url.replace(/^https?:\/\//, ""))}</a>`;

// ── Base layout ──────────────────────────────────────────────────────────────
function layout(o: {
  channel: Channel;
  preheader: string;
  eyebrow: string;
  category: string;
  heading: string;
  hero?: string;
  intro?: string;
  blocks?: string;
  cta?: { label: string; url: string };
  lifecycle?: boolean;
}): { from: string; replyTo?: string; html: string } {
  const year = new Date().getFullYear();
  const hero = o.hero || HERO_FALLBACK[o.category] || "community";
  const heroImg = heroUrl(hero);
  const logoMark = (h: number, style: string) =>
    LOGO_DARK
      ? `<img src="${LOGO_DARK}" alt="${esc(SITE.name)}" height="${h}" style="height:${h}px;width:auto;${style}border:0;outline:none">`
      : `<span style="font-family:${DISPLAY};font-weight:700;color:${INK};font-size:${Math.round(h * 0.5)}px;line-height:${h}px;${style}">${esc(SITE.name)}</span>`;
  const socialHtml = ([
    ["Instagram", SITE.instagramUrl],
    ["LinkedIn", SITE.linkedinUrl],
    ["TikTok", SITE.tiktokUrl],
  ] as [string, string][])
    .filter(([, u]) => u)
    .map(([label, u]) => `<a href="${u}" style="color:${MUTED};text-decoration:none">${label}</a>`)
    .join(" &middot; ");
  const legalHtml = ([
    ["Kebijakan Privasi", SITE.privacyUrl],
    ["Syarat & Ketentuan", SITE.termsUrl],
    ["Pusat Kepercayaan", SITE.trustCenterUrl],
  ] as [string, string][])
    .filter(([, u]) => u)
    .map(([label, u]) => `<a href="${u}" style="color:${MUTED};text-decoration:none">${label}</a>`)
    .join(" &middot; ");
  const html = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><meta name="x-apple-disable-message-reformatting"><title>${esc(o.heading)}</title>
<style>
  a{text-decoration:none}
  @media (max-width:600px){.mx{padding-left:24px!important;padding-right:24px!important}.h1{font-size:20px!important}.wrap{padding:14px 8px!important}}
</style></head>
<body style="margin:0;padding:0;background:${PAGE};font-family:${SANS};color:${INK};-webkit-font-smoothing:antialiased">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all">${esc(o.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="wrap" style="background:${PAGE};padding:28px 14px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${CARD};border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(20,20,20,.05),0 10px 26px -16px rgba(20,20,20,.14);border:1px solid #edf0f5">
      <tr><td height="6" bgcolor="${BRAND}" style="height:6px;line-height:6px;font-size:0;background:${BRAND};background-image:linear-gradient(90deg, ${BRAND} 0%, ${BRAND_LITE} 100%)">&nbsp;</td></tr>
      <tr><td class="mx" style="padding:28px 40px 0;background:${CARD}">
        ${logoMark(38, "display:block;")}
      </td></tr>
      <tr><td style="padding:22px 40px 0;text-align:center">
        ${heroImg ? `<img src="${heroImg}" width="180" alt="" style="width:180px;max-width:56%;height:auto;display:inline-block;border:0;outline:none">` : ""}
      </td></tr>
      <tr><td class="mx" style="padding:16px 40px 0">
        <div style="margin:0 0 12px"><span style="display:inline-block;background:${TINT};color:${BRAND};font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;padding:6px 12px;border-radius:9999px">${esc(o.eyebrow)}</span></div>
        <h1 class="h1" style="margin:0;font-family:${DISPLAY};font-size:22px;line-height:1.2;letter-spacing:-.02em;color:${INK};font-weight:700">${esc(o.heading)}</h1>
        ${o.intro ? `<p style="margin:12px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${SUBINK}">${o.intro}</p>` : ""}
      </td></tr>
      ${o.blocks ? `<tr><td class="mx" style="padding:22px 40px 0">${o.blocks}</td></tr>` : ""}
      ${o.cta ? `<tr><td class="mx" style="padding:24px 40px 0">${button(o.cta.label, o.cta.url)}</td></tr>` : ""}
      <tr><td style="height:32px;line-height:32px;font-size:0">&nbsp;</td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
      <tr><td style="padding:22px 28px 4px;text-align:center">
        ${o.lifecycle ? `<p style="margin:0 0 14px;font-family:${SANS};font-size:11px;line-height:1.7;color:${MUTED}">Kamu menerima email ini sesuai preferensi notifikasi di akunmu.${APP_URL ? ` <a href="${APP_URL}/notifikasi" style="color:${SUBINK};text-decoration:underline">Kelola preferensi</a>` : ""}.</p>` : ""}
        ${logoMark(20, "display:inline-block;margin:0 0 12px;opacity:.85;")}
        <p style="margin:0 0 8px;font-family:${SANS};font-size:12px;line-height:1.7;color:${MUTED}">Butuh bantuan? <a href="mailto:${SITE.supportEmail}" style="color:${SUBINK};font-weight:700;text-decoration:none">${SITE.supportEmail}</a>${SITE.supportWhatsapp ? ` &middot; <a href="https://wa.me/${SITE.supportWhatsapp}" style="color:${SUBINK};font-weight:700;text-decoration:none">WhatsApp</a>` : ""}</p>
        ${socialHtml ? `<p style="margin:0 0 8px;font-family:${SANS};font-size:11px;line-height:1.7;color:${MUTED}">${socialHtml}</p>` : ""}
        ${legalHtml ? `<p style="margin:0 0 10px;font-family:${SANS};font-size:11px;line-height:1.7;color:${MUTED}">${legalHtml}</p>` : ""}
        <p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.7;color:${MUTED}">${SITE.legalName ? `${esc(SITE.legalName)}${SITE.address ? ` &middot; ${esc(SITE.address)}` : ""}<br>` : ""}Email otomatis, mohon tidak membalas langsung. &copy; ${year} ${esc(SITE.name)}.</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
  return { from: FROM[o.channel], replyTo: REPLYTO[o.channel], html };
}

export type Out = { subject: string; from: string; replyTo?: string; html: string };
const build = (subject: string, l: { from: string; replyTo?: string; html: string }): Out => ({ subject, from: l.from, replyTo: l.replyTo, html: l.html });

// ═══════════════════════════════════════════════ A. AKUN & KEAMANAN ═══════════

export function otpEmail(otp: string, type: "sign-in" | "email-verification" | "forget-password" | "change-email"): Out {
  const map = {
    "sign-in": { subject: "Kode masuk akun kamu", eyebrow: "Kode Masuk", heading: "Ini kode masuk kamu", intro: "Ada permintaan masuk ke akun kamu. Pakai kode di bawah ini untuk melanjutkan." },
    "email-verification": { subject: "Verifikasi email akun kamu", eyebrow: "Verifikasi", heading: "Tinggal satu langkah lagi", intro: "Sedikit lagi akun kamu aktif. Masukkan kode di bawah untuk memverifikasi alamat email kamu." },
    "forget-password": { subject: "Kode untuk atur ulang kata sandi", eyebrow: "Keamanan", heading: "Atur ulang kata sandi kamu", intro: "Mau bikin kata sandi baru? Masukkan kode di bawah untuk melanjutkan." },
    "change-email": { subject: "Kode konfirmasi email baru", eyebrow: "Verifikasi", heading: "Konfirmasi email baru kamu", intro: "Satu langkah kecil lagi. Masukkan kode di bawah untuk mengonfirmasi alamat email barumu." },
  }[type];
  const blocks = otpBlock(otp) + `<div style="height:14px"></div>` + notice("info", "Kode ini berlaku 10 menit dan cuma buat kamu. Jangan dibagikan ke siapa pun ya. Kalau kamu tidak merasa memintanya, abaikan saja email ini, akun kamu tetap aman kok.");
  return build(map.subject, layout({ channel: "akun", category: "Keamanan Akun", preheader: `Kode kamu: ${otp}`, eyebrow: map.eyebrow, heading: map.heading, intro: map.intro, blocks }));
}

export function setPasswordEmail(url: string, name?: string): Out {
  return build("Selamat bergabung di sini, atur kata sandi kamu", layout({
    channel: "akun", category: "Keamanan Akun", hero: "welcome", preheader: "Yuk, atur kata sandi akun kamu", eyebrow: "Akun Baru", heading: "Selamat bergabung di sini",
    intro: `${hi(name)} akun kamu sudah kami siapkan. Demi keamanan, kami tidak pernah mengirim kata sandi lewat email. Yuk, atur kata sandi kamu sendiri lewat tombol di bawah.`,
    cta: { label: "Atur kata sandi kamu", url },
  }));
}

export function magicLinkEmail(url: string, name?: string): Out {
  return build("Tautan masuk ke akun kamu", layout({
    channel: "akun", category: "Keamanan Akun", preheader: "Tautan masuk sekali pakai", eyebrow: "Masuk", heading: "Masuk tanpa ribet",
    intro: `${hi(name)} tinggal klik tombol di bawah untuk langsung masuk ke akun kamu, tanpa perlu kata sandi. Tautannya berlaku 10 menit dan cuma bisa dipakai sekali.`,
    cta: { label: "Masuk sekarang", url },
  }));
}

export function resetPasswordEmail(url: string): Out {
  const blocks = notice("info", "Tautan ini berlaku sekali pakai dan hanya sebentar. Kalau kamu tidak pernah merasa meminta ini, abaikan saja email ini ya. Akun kamu tetap aman kok.");
  return build("Atur ulang kata sandi akun kamu", layout({
    channel: "akun", category: "Keamanan Akun", preheader: "Tautan untuk atur ulang kata sandi", eyebrow: "Keamanan", heading: "Lupa kata sandi? Tenang",
    intro: "Kami menerima permintaan untuk mengatur ulang kata sandi akun kamu. Kalau ini memang kamu, klik tombol di bawah untuk membuat kata sandi baru.",
    blocks, cta: { label: "Buat kata sandi baru", url },
  }));
}

export function passwordChangedEmail(o: { name?: string; when?: string; manageUrl?: string }): Out {
  const blocks = notice("success", "Kata sandi akun kamu berhasil diperbarui.") + (o.when ? `<div style="height:12px"></div>` + infoTable([{ label: "Waktu", value: esc(o.when) }]) : "");
  return build("Kata sandi kamu berhasil diubah", layout({
    channel: "akun", category: "Keamanan Akun", preheader: "Kata sandi akun kamu diperbarui", eyebrow: "Keamanan", heading: "Kata sandi kamu sudah diperbarui",
    intro: `${hi(o.name)} kata sandi akun kamu baru saja diganti. Kalau ini kamu, berarti semua beres. Kalau bukan, segera amankan akunmu ya.`,
    blocks, cta: o.manageUrl ? { label: "Amankan akun saya", url: o.manageUrl } : undefined,
  }));
}

export function newDeviceLoginEmail(o: { name?: string; device: string; location?: string; when?: string; resetUrl?: string }): Out {
  const blocks = infoTable([
    { label: "Perangkat", value: esc(o.device) },
    o.location ? { label: "Lokasi", value: esc(o.location) } : null,
    o.when ? { label: "Waktu", value: esc(o.when) } : null,
  ]) + `<div style="height:14px"></div>` + notice("warning", "Kalau ini kamu, santai, tidak perlu melakukan apa pun. Kalau bukan, segera atur ulang kata sandi kamu ya.");
  return build("Ada login baru di akun kamu", layout({
    channel: "akun", category: "Keamanan Akun", preheader: `Login baru dari ${o.device}`, eyebrow: "Aktivitas Baru", heading: "Ada login dari perangkat baru",
    intro: `${hi(o.name)} kami mendeteksi login baru ke akun kamu. Kami kabari biar kamu selalu tahu apa yang terjadi di akunmu.`,
    blocks, cta: o.resetUrl ? { label: "Ini bukan saya", url: o.resetUrl } : undefined,
  }));
}

export function twoFactorChangedEmail(o: { name?: string; enabled: boolean; when?: string }): Out {
  const blocks = notice(o.enabled ? "success" : "warning", o.enabled ? "Verifikasi dua langkah (2FA) sekarang aktif. Akun kamu jadi jauh lebih aman." : "Verifikasi dua langkah (2FA) baru saja dinonaktifkan di akun kamu.") + (o.when ? `<div style="height:12px"></div>` + infoTable([{ label: "Waktu", value: esc(o.when) }]) : "");
  return build(o.enabled ? "Verifikasi 2 langkah aktif di akunmu" : "Verifikasi 2 langkah dinonaktifkan", layout({
    channel: "akun", category: "Keamanan Akun", preheader: o.enabled ? "2FA aktif" : "2FA nonaktif", eyebrow: "Keamanan", heading: o.enabled ? "Akun kamu makin aman" : "Verifikasi 2 langkah nonaktif",
    intro: `${hi(o.name)} ada perubahan pada pengaturan keamanan akun kamu.`, blocks,
  }));
}

export function welcomeEmail(o: { name?: string; loginUrl: string }): Out {
  const blocks = steps(["Lengkapi profil kamu biar rekomendasinya makin pas.", "Jelajahi layanan kami: konsultasi, kelas bersertifikat, dan pengembangan diri.", "Mulai dari satu langkah kecil hari ini."]);
  return build("Selamat datang di sini", layout({
    channel: "info", category: "Selamat Datang", preheader: "Akun kamu sudah aktif", eyebrow: "Selamat Datang", heading: "Senang kamu di sini",
    intro: `${hi(o.name)} selamat bergabung di sini. Kami bukan sekadar platform belajar, tapi ruang tumbuh yang nemenin kamu di setiap fase. Yuk, mulai perjalananmu.`,
    blocks, cta: { label: "Buka akun saya", url: o.loginUrl }, lifecycle: true,
  }));
}

export function welcomeAccessEmail(o: { name?: string; email: string; loginUrl: string; setPasswordUrl?: string; productName?: string }): Out {
  const blocks = infoTable([
    { label: "Email masuk", value: esc(o.email) },
    { label: "Halaman masuk", value: link(o.loginUrl) },
    o.productName ? { label: "Akses aktif", value: esc(o.productName) } : null,
  ]);
  return build("Selamat bergabung di sini, ini akses masuk kamu", layout({
    channel: "akun", category: "Keamanan Akun", hero: "welcome", preheader: "Akun kamu sudah siap", eyebrow: "Akun Baru", heading: "Akun kamu sudah siap",
    intro: `${hi(o.name)} ${o.setPasswordUrl ? "akun kamu sudah kami siapkan. Demi keamanan, kami tidak mengirim kata sandi lewat email. Atur kata sandi kamu lewat tombol di bawah, lalu langsung masuk." : "akun kamu sudah siap dipakai. Klik tombol di bawah untuk mulai masuk."}`,
    blocks, cta: o.setPasswordUrl ? { label: "Atur kata sandi & masuk", url: o.setPasswordUrl } : { label: "Masuk ke akun", url: o.loginUrl },
  }));
}

// ═══════════════════════════════════════════════ B. PEMBAYARAN & TAGIHAN ═════

export function orderPendingEmail(o: { name?: string; orderId: string; itemName: string; amount: string; payUrl: string; dueDate?: string }): Out {
  const blocks = infoTable([
    { label: "No. pesanan", value: esc(o.orderId) },
    { label: "Item", value: esc(o.itemName) },
    o.dueDate ? { label: "Bayar sebelum", value: esc(o.dueDate) } : null,
    { label: "Total", value: esc(o.amount), strong: true },
  ]);
  return build(`Menunggu pembayaran, ${o.orderId}`, layout({
    channel: "tagihan", category: "Tagihan", hero: "billing", preheader: `Selesaikan pembayaran ${o.amount}`, eyebrow: "Menunggu Bayar", heading: "Pesanan kamu sudah kami terima",
    intro: `${hi(o.name)} tinggal satu langkah lagi. Selesaikan pembayaran di bawah, dan akses kamu langsung aktif.`,
    blocks, cta: { label: "Bayar sekarang", url: o.payUrl },
  }));
}

export function receiptEmail(o: { orderId: string; itemName: string; amount: string; method: string; date: string; invoiceUrl: string; name?: string }): Out {
  const blocks = amountBlock(o.amount, "Total dibayar") + `<div style="height:14px"></div>` + infoTable([
    { label: "No. pesanan", value: esc(o.orderId) },
    { label: "Item", value: esc(o.itemName) },
    { label: "Metode", value: esc(o.method) },
    { label: "Tanggal", value: esc(o.date) },
  ]);
  return build(`Struk pembayaran, ${o.orderId}`, layout({
    channel: "tagihan", category: "Tagihan", preheader: `Pembayaran ${o.amount} berhasil`, eyebrow: "Pembayaran Berhasil", heading: "Pembayaran kamu berhasil",
    intro: `${hi(o.name)} makasih ya, pembayaran kamu sudah kami terima. Ini struk buat catatan kamu.`,
    blocks, cta: { label: "Lihat / unduh invoice", url: o.invoiceUrl },
  }));
}

export function paymentFailedEmail(o: { name?: string; orderId: string; itemName: string; retryUrl: string; reason?: string }): Out {
  const blocks = notice("danger", `Pembayaran untuk pesanan ${esc(o.orderId)} belum berhasil${o.reason ? `: ${esc(o.reason)}` : "."}`) + `<div style="height:14px"></div>` + infoTable([
    { label: "No. pesanan", value: esc(o.orderId) },
    { label: "Item", value: esc(o.itemName) },
  ]);
  return build(`Pembayaran belum berhasil, ${o.orderId}`, layout({
    channel: "tagihan", category: "Tagihan", hero: "billing", preheader: "Pembayaran belum berhasil", eyebrow: "Pembayaran Gagal", heading: "Yah, pembayarannya belum berhasil",
    intro: `${hi(o.name)} tenang, ini biasa terjadi. Pembayaran kamu belum bisa kami proses, tapi kamu bisa coba lagi lewat tombol di bawah.`,
    blocks, cta: { label: "Coba bayar lagi", url: o.retryUrl },
  }));
}

export function refundEmail(o: { name?: string; orderId: string; itemName: string; amount: string; when?: string }): Out {
  const blocks = notice("success", "Refund kamu lagi kami proses. Dananya akan kembali sesuai kebijakan metode pembayaran kamu ya.") + `<div style="height:14px"></div>` + infoTable([
    { label: "No. pesanan", value: esc(o.orderId) },
    { label: "Item", value: esc(o.itemName) },
    o.when ? { label: "Tanggal", value: esc(o.when) } : null,
    { label: "Jumlah refund", value: esc(o.amount), strong: true },
  ]);
  return build(`Refund diproses, ${o.orderId}`, layout({
    channel: "tagihan", category: "Tagihan", preheader: `Refund ${o.amount} diproses`, eyebrow: "Refund", heading: "Refund kamu lagi diproses",
    intro: `${hi(o.name)} permintaan refund kamu sudah kami terima dan langsung kami proses.`, blocks,
  }));
}

export function paymentReminderEmail(o: { name?: string; orderId: string; itemName: string; amount: string; dueDate?: string; payUrl: string }): Out {
  const blocks = infoTable([
    { label: "No. pesanan", value: esc(o.orderId) },
    { label: "Item", value: esc(o.itemName) },
    o.dueDate ? { label: "Jatuh tempo", value: esc(o.dueDate) } : null,
    { label: "Total tagihan", value: esc(o.amount), strong: true },
  ]);
  return build(`Pengingat pembayaran, ${o.orderId}`, layout({
    channel: "tagihan", category: "Tagihan", hero: "billing", preheader: `Tagihan ${o.amount} menunggu`, eyebrow: "Pengingat", heading: "Selesaikan pembayaran kamu",
    intro: `${hi(o.name)} tagihan berikut masih menunggu pembayaran. Kalau sudah membayar, abaikan email ini.`,
    blocks, cta: { label: "Bayar sekarang", url: o.payUrl }, lifecycle: true,
  }));
}

// ═══════════════════════════════════════════════ C. LANGGANAN Keanggotaan Pro ═══════════

export function subscriptionActiveEmail(o: { name?: string; planName: string; periodEnd?: string; manageUrl: string }): Out {
  const blocks = notice("success", `Langganan ${esc(o.planName)} kamu aktif. Selamat menikmati semua manfaatnya.`) + (o.periodEnd ? `<div style="height:12px"></div>` + infoTable([{ label: "Aktif hingga", value: esc(o.periodEnd) }]) : "");
  return build(`Selamat datang di ${o.planName}`, layout({
    channel: "tagihan", category: "Langganan", preheader: `${o.planName} aktif`, eyebrow: "Langganan Aktif", heading: `Selamat datang di ${o.planName}`,
    intro: `${hi(o.name)} langgananmu sudah aktif. Terima kasih sudah berlangganan.`,
    blocks, cta: { label: "Kelola langganan", url: o.manageUrl },
  }));
}

export function renewalReminderEmail(o: { name?: string; planName: string; renewsOn: string; amount: string; manageUrl: string }): Out {
  const blocks = infoTable([
    { label: "Paket", value: esc(o.planName) },
    { label: "Perpanjang pada", value: esc(o.renewsOn) },
    { label: "Biaya", value: esc(o.amount), strong: true },
  ]);
  return build(`Langganan ${o.planName} akan diperpanjang`, layout({
    channel: "tagihan", category: "Langganan", preheader: `Perpanjangan ${o.renewsOn}`, eyebrow: "Pengingat", heading: "Langganan akan diperpanjang",
    intro: `${hi(o.name)} langganan ${esc(o.planName)} kamu akan diperpanjang otomatis. Kamu bisa mengubah atau berhenti kapan saja sebelum tanggal itu.`,
    blocks, cta: { label: "Kelola langganan", url: o.manageUrl }, lifecycle: true,
  }));
}

export function renewalSuccessEmail(o: { name?: string; planName: string; periodEnd: string; amount: string; invoiceUrl: string }): Out {
  const blocks = notice("success", `Langganan ${esc(o.planName)} kamu berhasil diperpanjang.`) + `<div style="height:12px"></div>` + infoTable([
    { label: "Paket", value: esc(o.planName) },
    { label: "Aktif hingga", value: esc(o.periodEnd) },
    { label: "Dibayar", value: esc(o.amount), strong: true },
  ]);
  return build(`Perpanjangan berhasil, ${o.planName}`, layout({
    channel: "tagihan", category: "Langganan", preheader: "Perpanjangan berhasil", eyebrow: "Perpanjangan", heading: "Langganan diperpanjang",
    intro: `${hi(o.name)} pembayaran perpanjangan kamu sudah kami terima.`, blocks, cta: { label: "Lihat invoice", url: o.invoiceUrl },
  }));
}

export function dunningFailedEmail(o: { name?: string; planName: string; retryUrl: string; graceUntil?: string }): Out {
  const blocks = notice("danger", `Kami gagal menagih perpanjangan ${esc(o.planName)}.${o.graceUntil ? ` Akses tetap aktif sampai ${esc(o.graceUntil)}.` : ""}`);
  return build(`Pembayaran langganan gagal, ${o.planName}`, layout({
    channel: "tagihan", category: "Langganan", hero: "billing", preheader: "Perpanjangan gagal ditagih", eyebrow: "Perlu Tindakan", heading: "Perpanjangan gagal ditagih",
    intro: `${hi(o.name)} kami tidak bisa memproses pembayaran perpanjangan langgananmu. Perbarui metode pembayaran supaya akses tidak terputus.`,
    blocks, cta: { label: "Perbarui pembayaran", url: o.retryUrl },
  }));
}

export function graceEndingEmail(o: { name?: string; planName: string; accessEndsOn: string; payUrl: string }): Out {
  const blocks = notice("warning", `Akses ${esc(o.planName)} akan ditutup pada ${esc(o.accessEndsOn)} kalau pembayaran belum selesai.`);
  return build(`Akses ${o.planName} akan ditutup`, layout({
    channel: "tagihan", category: "Langganan", hero: "billing", preheader: "Masa tenggang hampir habis", eyebrow: "Masa Tenggang", heading: "Akses akan segera ditutup",
    intro: `${hi(o.name)} ini pengingat terakhir. Selesaikan pembayaran supaya kamu tidak kehilangan akses.`,
    blocks, cta: { label: "Bayar sekarang", url: o.payUrl },
  }));
}

export function subscriptionEndedEmail(o: { name?: string; planName: string; resumeUrl?: string }): Out {
  return build(`Langganan ${o.planName} berakhir`, layout({
    channel: "tagihan", category: "Langganan", preheader: `${o.planName} berakhir`, eyebrow: "Langganan", heading: "Langganan telah berakhir",
    intro: `${hi(o.name)} langganan ${esc(o.planName)} kamu telah berakhir. Terima kasih sudah berlangganan. Kamu bisa mengaktifkannya lagi kapan saja.`,
    cta: o.resumeUrl ? { label: "Aktifkan lagi", url: o.resumeUrl } : undefined, lifecycle: true,
  }));
}

export function winbackEmail(o: { name?: string; planName: string; offer?: string; resumeUrl: string }): Out {
  return build(`Kami merindukanmu di ${o.planName}`, layout({
    channel: "info", category: "Kabar Produk", preheader: "Kembali ke layanan", eyebrow: "Untuk Kamu", heading: "Kami merindukanmu",
    intro: `${hi(o.name)} sudah lama tidak ketemu. ${o.offer ? esc(o.offer) + " " : ""}Yuk lanjutkan pertumbuhanmu bareng ${esc(o.planName)}.`,
    cta: { label: "Aktifkan lagi", url: o.resumeUrl }, lifecycle: true,
  }));
}

// ═══════════════════════════════════════════════ D. ACARA / WEBINAR ═════════

function eventRows(o: { title: string; date: string; time?: string; format?: string; location?: string }): Row[] {
  return [
    { label: "Acara", value: esc(o.title) },
    { label: "Tanggal", value: esc(o.date) },
    o.time ? { label: "Waktu", value: esc(o.time) } : null,
    o.format ? { label: "Format", value: esc(o.format) } : null,
    o.location ? { label: "Lokasi", value: esc(o.location) } : null,
  ];
}

export function eventRegisteredEmail(o: { name?: string; title: string; date: string; time?: string; format?: string; location?: string; detailUrl?: string }): Out {
  const blocks = notice("success", "Pendaftaran kamu berhasil. Sampai ketemu di acara.") + `<div style="height:12px"></div>` + infoTable(eventRows(o));
  return build(`Terdaftar: ${o.title}`, layout({
    channel: "info", category: "Acara", preheader: `Terdaftar di ${o.title}`, eyebrow: "Pendaftaran", heading: "Kamu terdaftar di acara ini",
    intro: `${hi(o.name)} terima kasih sudah mendaftar. Simpan email ini sebagai tiket kamu.`,
    blocks, cta: o.detailUrl ? { label: "Lihat detail acara", url: o.detailUrl } : undefined,
  }));
}

export function eventJoinInfoEmail(o: { name?: string; title: string; date: string; time?: string; joinUrl: string }): Out {
  const blocks = infoTable(eventRows(o));
  return build(`Info join: ${o.title}`, layout({
    channel: "info", category: "Acara", preheader: `Link join ${o.title}`, eyebrow: "Info Teknis", heading: "Tautan untuk bergabung",
    intro: `${hi(o.name)} acaranya sudah dekat. Berikut tautan dan info teknis untuk bergabung.`,
    blocks, cta: { label: "Gabung acara", url: o.joinUrl },
  }));
}

export function eventReminderEmail(o: { name?: string; title: string; date: string; time?: string; format?: string; location?: string; joinUrl?: string; detailUrl?: string }): Out {
  const blocks = infoTable(eventRows(o));
  const url = o.joinUrl || o.detailUrl;
  return build(`Pengingat: ${o.title}`, layout({
    channel: "info", category: "Acara", preheader: `${o.title}, ${o.date}`, eyebrow: "Pengingat Acara", heading: o.title,
    intro: `${hi(o.name)} ini pengingat untuk acara yang kamu ikuti. Sampai ketemu.`,
    blocks, cta: url ? { label: o.joinUrl ? "Gabung acara" : "Lihat detail", url } : undefined, lifecycle: true,
  }));
}

export function eventRecordingEmail(o: { name?: string; title: string; recordingUrl: string }): Out {
  return build(`Rekaman siap: ${o.title}`, layout({
    channel: "info", category: "Acara", preheader: "Rekaman & materi tersedia", eyebrow: "Rekaman", heading: "Rekaman & materi sudah siap",
    intro: `${hi(o.name)} terima kasih sudah hadir di ${esc(o.title)}. Rekaman dan materinya sudah bisa kamu akses.`,
    cta: { label: "Tonton rekaman", url: o.recordingUrl }, lifecycle: true,
  }));
}

export function eventCertificateEmail(o: { name?: string; title: string; certUrl: string }): Out {
  const blocks = notice("success", "Sertifikat kehadiran kamu sudah terbit. Bagikan pencapaianmu.");
  return build(`Sertifikat: ${o.title}`, layout({
    channel: "info", category: "Acara", preheader: "Sertifikat kehadiran terbit", eyebrow: "Sertifikat", heading: "Sertifikat kehadiran kamu",
    intro: `${hi(o.name)} terima kasih sudah mengikuti ${esc(o.title)}.`, blocks,
    cta: { label: "Unduh sertifikat", url: o.certUrl }, lifecycle: true,
  }));
}

// ═══════════════════════════════════════════════ E. KELAS / LMS ═════════════

export function enrollmentConfirmedEmail(o: { name?: string; className: string; startUrl: string }): Out {
  const blocks = notice("success", `Kamu resmi terdaftar di ${esc(o.className)}.`);
  return build(`Terdaftar di ${o.className}`, layout({
    channel: "info", category: "Kelas", preheader: `Terdaftar di ${o.className}`, eyebrow: "Enrollment", heading: "Kamu terdaftar di kelas ini",
    intro: `${hi(o.name)} selamat, tempatmu di ${esc(o.className)} sudah aman. Yuk mulai belajar.`,
    blocks, cta: { label: "Mulai belajar", url: o.startUrl },
  }));
}

export function accessPendingEmail(o: { name?: string; className: string }): Out {
  const blocks = notice("info", "Akses kamu sedang kami siapkan (menunggu lisensi). Kamu akan dapat email lagi begitu siap, biasanya kurang dari 1x24 jam.");
  return build(`Akses ${o.className} sedang disiapkan`, layout({
    channel: "info", category: "Kelas", preheader: "Akses sedang disiapkan", eyebrow: "Menunggu", heading: "Akses sedang disiapkan",
    intro: `${hi(o.name)} pembayaranmu sudah kami terima untuk ${esc(o.className)}.`, blocks,
  }));
}

export function accessReadyEmail(o: { name?: string; className: string; startUrl: string }): Out {
  const blocks = notice("success", `Akses ${esc(o.className)} kamu sudah aktif. Selamat belajar.`);
  return build(`Akses ${o.className} siap`, layout({
    channel: "info", category: "Kelas", preheader: "Akses kelas siap", eyebrow: "Siap", heading: "Akses kamu sudah siap",
    intro: `${hi(o.name)} kabar baik, lisensimu sudah terpasang.`, blocks, cta: { label: "Mulai belajar", url: o.startUrl },
  }));
}

export function continueLearningEmail(o: { name?: string; className: string; lessonName: string; continueUrl: string }): Out {
  const blocks = infoTable([{ label: "Kelas", value: esc(o.className) }, { label: "Lanjut ke", value: esc(o.lessonName) }]);
  return build(`Lanjut belajar: ${o.className}`, layout({
    channel: "info", category: "Kelas", preheader: `Lanjutkan ${o.lessonName}`, eyebrow: "Lanjut Belajar", heading: "Lanjutkan dari terakhir kamu",
    intro: `${hi(o.name)} tinggal sedikit lagi. Yuk lanjutkan progres belajarmu.`, blocks,
    cta: { label: "Lanjut belajar", url: o.continueUrl }, lifecycle: true,
  }));
}

export function assignmentGradedEmail(o: { name?: string; className: string; assignmentName: string; grade?: string; feedbackUrl: string }): Out {
  const blocks = infoTable([
    { label: "Kelas", value: esc(o.className) },
    { label: "Tugas", value: esc(o.assignmentName) },
    o.grade ? { label: "Nilai", value: esc(o.grade), strong: true } : null,
  ]);
  return build(`Tugas dinilai: ${o.assignmentName}`, layout({
    channel: "info", category: "Kelas", preheader: "Nilai & umpan balik tersedia", eyebrow: "Umpan Balik", heading: "Tugas kamu sudah dinilai",
    intro: `${hi(o.name)} instruktur sudah meninjau tugasmu dan memberi umpan balik.`, blocks,
    cta: { label: "Lihat umpan balik", url: o.feedbackUrl }, lifecycle: true,
  }));
}

export function deadlineReminderEmail(o: { name?: string; className: string; taskName: string; dueAt: string; taskUrl: string }): Out {
  const blocks = infoTable([
    { label: "Kelas", value: esc(o.className) },
    { label: "Tugas", value: esc(o.taskName) },
    { label: "Tenggat", value: esc(o.dueAt), strong: true },
  ]);
  return build(`Tenggat mendekat: ${o.taskName}`, layout({
    channel: "info", category: "Kelas", preheader: `Tenggat ${o.dueAt}`, eyebrow: "Pengingat Tenggat", heading: "Tenggat tugas mendekat",
    intro: `${hi(o.name)} jangan sampai terlewat, tugas berikut akan segera jatuh tempo.`, blocks,
    cta: { label: "Kerjakan sekarang", url: o.taskUrl }, lifecycle: true,
  }));
}

export function courseCompletedEmail(o: { name?: string; className: string; certUrl: string }): Out {
  const blocks = notice("success", `Selamat, kamu menyelesaikan ${esc(o.className)}. Sertifikatmu sudah terbit.`);
  return build(`Selesai: ${o.className}`, layout({
    channel: "info", category: "Kelas", preheader: "Kelas selesai, sertifikat terbit", eyebrow: "Pencapaian", heading: "Kamu menyelesaikan kelas ini",
    intro: `${hi(o.name)} kerja bagus. Ini bukti pertumbuhanmu.`, blocks, cta: { label: "Unduh sertifikat", url: o.certUrl },
  }));
}

// ═══════════════════════════════════════════ F. TAGIHAN / PAYMENT LINK ═══════

export function thesisPaymentLinkEmail(o: { name?: string; amount: string; payUrl: string; note?: string }): Out {
  const blocks = amountBlock(o.amount, "Total tagihan bimbingan") + (o.note ? `<div style="height:12px"></div>` + notice("info", esc(o.note)) : "");
  return build("Tagihan konsultasi", layout({
    channel: "tagihan", category: "Konsultasi", preheader: `Tagihan ${o.amount}`, eyebrow: "Tagihan", heading: "Tagihan bimbingan kamu",
    intro: `${hi(o.name)} sesuai obrolan kita, berikut tautan pembayaran untuk memulai konsultasimu.`,
    blocks, cta: { label: "Bayar & mulai bimbingan", url: o.payUrl },
  }));
}

export function thesisActiveEmail(o: { name?: string; mentorName?: string; loginUrl: string }): Out {
  const blocks = (o.mentorName ? personCard(o.mentorName, "Pembimbing kamu") + `<div style="height:14px"></div>` : "") + notice("success", "Bimbingan kamu aktif dan akunmu sudah siap. Yuk masuk dan mulai.");
  return build("Bimbingan aktif, akun kamu siap", layout({
    channel: "info", category: "Konsultasi", preheader: "Bimbingan aktif", eyebrow: "Bimbingan Aktif", heading: "Selamat, bimbingan kamu aktif",
    intro: `${hi(o.name)} pembayaranmu sudah kami terima. ${o.mentorName ? `Kamu akan dibimbing oleh ${esc(o.mentorName)}.` : "Pembimbing kamu akan segera terhubung."}`,
    blocks, cta: { label: "Masuk ke portal", url: o.loginUrl },
  }));
}

export function thesisSessionScheduleEmail(o: { name?: string; sessionTitle: string; date: string; time: string; joinUrl?: string }): Out {
  const blocks = infoTable([
    { label: "Sesi", value: esc(o.sessionTitle) },
    { label: "Tanggal", value: esc(o.date) },
    { label: "Waktu", value: esc(o.time) },
  ]);
  return build(`Jadwal sesi: ${o.sessionTitle}`, layout({
    channel: "info", category: "Konsultasi", preheader: `Sesi ${o.date}`, eyebrow: "Jadwal Sesi", heading: "Jadwal sesi bimbingan",
    intro: `${hi(o.name)} berikut detail jadwal sesi bimbingan kamu.`, blocks,
    cta: o.joinUrl ? { label: "Gabung sesi", url: o.joinUrl } : undefined, lifecycle: true,
  }));
}

export function thesisMentorMessageEmail(o: { name?: string; mentorName: string; preview: string; openUrl: string }): Out {
  const blocks = personCard(o.mentorName, "Pembimbing") + `<div style="height:14px"></div>` + panel(`<tr><td style="padding:16px 20px;font-family:${SANS};font-size:14px;line-height:1.7;color:${SUBINK};font-style:italic">"${esc(o.preview)}"</td></tr>`);
  return build(`Pesan baru dari ${o.mentorName}`, layout({
    channel: "info", category: "Konsultasi", preheader: `Pesan dari ${o.mentorName}`, eyebrow: "Pesan Baru", heading: "Ada pesan dari pembimbing",
    intro: `${hi(o.name)} pembimbingmu mengirim pesan baru.`, blocks,
    cta: { label: "Buka & balas", url: o.openUrl }, lifecycle: true,
  }));
}

export function thesisProgressSummaryEmail(o: { name?: string; items: string[]; openUrl: string }): Out {
  const blocks = steps(o.items.map(esc));
  return build("Ringkasan progres bimbingan kamu", layout({
    channel: "info", category: "Konsultasi", preheader: "Ringkasan progres", eyebrow: "Ringkasan", heading: "Progres bimbingan kamu",
    intro: `${hi(o.name)} ini rangkuman perkembangan konsultasimu.`, blocks,
    cta: { label: "Buka portal bimbingan", url: o.openUrl }, lifecycle: true,
  }));
}

// ═══════════════════════════════════════════════ G. KOMUNITAS & ENGAGEMENT ══

export function communityReplyEmail(o: { name?: string; who: string; context: string; preview?: string; openUrl: string }): Out {
  const blocks = o.preview ? panel(`<tr><td style="padding:16px 20px;font-family:${SANS};font-size:14px;line-height:1.7;color:${SUBINK}">${esc(o.preview)}</td></tr>`) : "";
  return build(`${o.who} membalas kamu`, layout({
    channel: "info", category: "Komunitas", preheader: `${o.who} membalas di ${o.context}`, eyebrow: "Komunitas", heading: `${esc(o.who)} membalas kamu`,
    intro: `${hi(o.name)} ada balasan baru di ${esc(o.context)}.`, blocks,
    cta: { label: "Lihat balasan", url: o.openUrl }, lifecycle: true,
  }));
}

export function announcementEmail(o: { name?: string; title: string; body: string; ctaUrl?: string; ctaLabel?: string }): Out {
  return build(o.title, layout({
    channel: "info", category: "Pengumuman", preheader: esc(o.title), eyebrow: "Pengumuman", heading: o.title,
    intro: `${hi(o.name)} ${esc(o.body)}`, cta: o.ctaUrl ? { label: o.ctaLabel || "Selengkapnya", url: o.ctaUrl } : undefined, lifecycle: true,
  }));
}

export function challengeEmail(o: { name?: string; title: string; body: string; ctaUrl: string }): Out {
  return build(o.title, layout({
    channel: "info", category: "Tantangan", preheader: esc(o.title), eyebrow: "Tantangan Bulanan", heading: o.title,
    intro: `${hi(o.name)} ${esc(o.body)}`, cta: { label: "Ikut tantangan", url: o.ctaUrl }, lifecycle: true,
  }));
}

export function streakNudgeEmail(o: { name?: string; days: number; continueUrl: string }): Out {
  const blocks = amountBlock(`${o.days} hari`, "Streak belajar kamu");
  return build("Jaga streak belajarmu", layout({
    channel: "info", category: "Belajar", preheader: `Streak ${o.days} hari`, eyebrow: "Rutin Belajar", heading: "Jaga momentum kamu",
    intro: `${hi(o.name)} kamu sudah konsisten ${o.days} hari. Lanjutkan hari ini biar streak-nya tetap hidup.`,
    blocks, cta: { label: "Belajar hari ini", url: o.continueUrl }, lifecycle: true,
  }));
}

export function productNewsEmail(o: { name?: string; title: string; body: string; ctaUrl: string; ctaLabel?: string }): Out {
  return build(o.title, layout({
    channel: "info", category: "Kabar Produk", preheader: esc(o.title), eyebrow: "Baru di sini", heading: o.title,
    intro: `${hi(o.name)} ${esc(o.body)}`, cta: { label: o.ctaLabel || "Lihat sekarang", url: o.ctaUrl }, lifecycle: true,
  }));
}

export function promoEmail(o: { name?: string; title: string; body: string; ctaUrl: string; ctaLabel?: string }): Out {
  return build(o.title, layout({
    channel: "info", category: "Promo", preheader: esc(o.title), eyebrow: "Penawaran", heading: o.title,
    intro: `${hi(o.name)} ${esc(o.body)}`, cta: { label: o.ctaLabel || "Ambil penawaran", url: o.ctaUrl }, lifecycle: true,
  }));
}

export function notificationEmail(title: string, message: string, cta?: { label: string; url: string }): Out {
  return build(`${title}`, layout({
    channel: "info", category: "Pemberitahuan", preheader: title, eyebrow: "Pemberitahuan", heading: title, intro: message, cta, lifecycle: true,
  }));
}

export const subscriptionCancelledEmail = (o: { name?: string; planName: string; endsDate?: string; resumeUrl?: string }): Out =>
  subscriptionEndedEmail({ name: o.name, planName: o.planName, resumeUrl: o.resumeUrl });
