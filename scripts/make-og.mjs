#!/usr/bin/env node
/*
 * make-og.mjs — kartu Open Graph (social preview) 1280x640 untuk repositori.
 *
 * Gaya: developer-grade gelap (navy -> brand blue) dengan glow, dot-grid halus, dan
 * mock kartu checkout glassmorphism di kanan yang menggambarkan produk (checkout custom
 * Midtrans Core API). Teks di-render tajam lewat SVG (bukan AI) jadi selalu terbaca.
 *
 * Render: node scripts/make-og.mjs [outDir]
 *   - outDir opsional (default: .github/assets). Menulis og.png.
 *
 * Untuk fork: ubah blok CONFIG di bawah (tag, judul, subjudul, footer, nominal).
 */
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "..");
const W = 1280, H = 640;

// ---- CONFIG: identitas kartu (ubah ini saat fork) -------------------------------------
// Default varian untuk repo ini. Fork? set ke "starter" atau tambah entri sendiri di CARDS.
const DEFAULT_VARIANT = "starter";
const CONFIG = {
  variant: process.env.OG_VARIANT || DEFAULT_VARIANT, // "maubisa" | "starter"
};
const CARDS = {
  maubisa: {
    tag: "PUSAT AKUN",
    title: [
      [["Satu akun,", null]],
      [["satu ", null], ["checkout", "accent"]],
    ],
    titleFlat: "Satu akun, satu checkout",
    subtitle: ["Kelola langganan, akses, dan pembayaran", "Maubisa — dalam satu tempat."],
    footer: "akun.maubisa.id",
    logo: ".github/assets/maubisa-logo-white.png",
  },
  starter: {
    tag: "OPEN SOURCE · MIT",
    title: [
      [["Account", null]],
      [["Center ", null], ["Starter", "accent"]],
    ],
    titleFlat: "Account Center Starter",
    subtitle: ["Account center + checkout Midtrans", "Core API. Fork, ganti merek, rilis."],
    footer: "github.com/maubisa-id/account-center-starter",
    logo: ".github/assets/maubisa-logo-white.png",
  },
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function logoDataUri(relPath) {
  const buf = readFileSync(join(REPO, relPath));
  return `data:image/png;base64,${buf.toString("base64")}`;
}

// Tech chips (kiri bawah) — translucent glass pills. Dijaga muat di kolom kiri (< ~640px).
const TECH = ["Next.js 16", "TypeScript", "Prisma", "Better Auth"];
function techChips(x, y) {
  let cx = x;
  const gap = 12;
  const pad = 20;
  const parts = [];
  for (const t of TECH) {
    const w = Math.round(t.length * 9.6 + pad * 2);
    parts.push(`<g transform="translate(${cx}, ${y})">
      <rect x="0" y="0" width="${w}" height="42" rx="21" fill="#ffffff" fill-opacity="0.06" stroke="#ffffff" stroke-opacity="0.16"/>
      <text x="${w / 2}" y="27" text-anchor="middle" font-family="'Segoe UI','Arial',sans-serif" font-size="18" font-weight="600" fill="#dbe6fb">${esc(t)}</text>
    </g>`);
    cx += w + gap;
  }
  return parts.join("\n");
}

// Judul multi-baris, kata ber-"accent" dicat gradasi brand terang.
function titleSvg(lines, x, yTop) {
  const size = 74, lh = 84;
  return lines
    .map((line, i) => {
      const spans = line
        .map(([word, kind]) =>
          kind === "accent"
            ? `<tspan fill="url(#accent)">${esc(word)}</tspan>`
            : `<tspan fill="#ffffff">${esc(word)}</tspan>`,
        )
        .join("");
      return `<text x="${x}" y="${yTop + i * lh}" xml:space="preserve" font-family="'Segoe UI','Arial',sans-serif" font-size="${size}" font-weight="800" letter-spacing="-2.5">${spans}</text>`;
    })
    .join("\n");
}

// Mock kartu checkout glassmorphism di kanan.
function checkoutMock(x, y) {
  const cw = 452, ch = 468;
  const method = (mx, label, active) => `
    <g transform="translate(${mx}, 0)">
      <rect x="0" y="0" width="118" height="52" rx="14" fill="#ffffff" fill-opacity="${active ? 0.18 : 0.06}" stroke="#ffffff" stroke-opacity="${active ? 0.55 : 0.16}" stroke-width="${active ? 2 : 1}"/>
      <text x="59" y="33" text-anchor="middle" font-family="'Segoe UI','Arial',sans-serif" font-size="19" font-weight="700" fill="#ffffff" fill-opacity="${active ? 1 : 0.7}">${esc(label)}</text>
    </g>`;
  return `<g transform="translate(${x}, ${y})" filter="url(#cardshadow)">
    <!-- glass panel -->
    <rect x="0" y="0" width="${cw}" height="${ch}" rx="30" fill="url(#glass)" stroke="#ffffff" stroke-opacity="0.20" stroke-width="1.5"/>
    <rect x="0" y="0" width="${cw}" height="${ch}" rx="30" fill="url(#glasshi)"/>
    <!-- header -->
    <text x="36" y="56" font-family="'Segoe UI','Arial',sans-serif" font-size="22" font-weight="700" fill="#eaf1ff">Pembayaran</text>
    <g transform="translate(${cw - 116}, 34)">
      <rect x="0" y="0" width="80" height="30" rx="15" fill="#84b81a" fill-opacity="0.22" stroke="#a9e34b" stroke-opacity="0.5"/>
      <text x="40" y="20" text-anchor="middle" font-family="'Segoe UI','Arial',sans-serif" font-size="14" font-weight="700" fill="#cdef9b">3D&#160;SECURE</text>
    </g>
    <!-- amount -->
    <text x="36" y="126" font-family="'Segoe UI','Arial',sans-serif" font-size="16" font-weight="600" fill="#9fb6e6" letter-spacing="1.5">TOTAL TAGIHAN</text>
    <text x="34" y="182" font-family="'Segoe UI','Arial',sans-serif" font-size="58" font-weight="800" fill="#ffffff" letter-spacing="-1.5">Rp149.000</text>
    <!-- methods -->
    <text x="36" y="234" font-family="'Segoe UI','Arial',sans-serif" font-size="15" font-weight="600" fill="#9fb6e6" letter-spacing="1.2">METODE</text>
    <g transform="translate(36, 246)">
      ${method(0, "QRIS", true)}
      ${method(130, "VA", false)}
      ${method(260, "Kartu", false)}
    </g>
    <!-- faux card row -->
    <g transform="translate(36, 320)">
      <rect x="0" y="0" width="${cw - 72}" height="58" rx="14" fill="#0a1020" fill-opacity="0.35" stroke="#ffffff" stroke-opacity="0.10"/>
      <rect x="18" y="21" width="30" height="20" rx="4" fill="#f5c451"/>
      <text x="62" y="37" font-family="'Segoe UI','Arial',sans-serif" font-size="20" font-weight="600" fill="#cdd9f2" letter-spacing="2">4•••  ••••  ••••  9012</text>
    </g>
    <!-- pay button -->
    <g transform="translate(36, 400)">
      <rect x="0" y="0" width="${cw - 72}" height="52" rx="14" fill="url(#accent)"/>
      <text x="${(cw - 72) / 2}" y="33" text-anchor="middle" font-family="'Segoe UI','Arial',sans-serif" font-size="20" font-weight="800" fill="#ffffff">Bayar sekarang</text>
    </g>
  </g>`;
}

async function build(variant) {
  const c = CARDS[variant];
  const logo = logoDataUri(c.logo);
  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#081231"/>
      <stop offset="0.55" stop-color="#0b2560"/>
      <stop offset="1" stop-color="#0a48b7"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5b9bff"/>
      <stop offset="1" stop-color="#8fc2ff"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.14"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.04"/>
    </linearGradient>
    <linearGradient id="glasshi" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="0.12" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#3f7bff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#3f7bff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#00d4ff" stop-opacity="0.30"/>
      <stop offset="1" stop-color="#00d4ff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.6" fill="#ffffff" fill-opacity="0.05"/>
    </pattern>
    <filter id="cardshadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="26" stdDeviation="34" flood-color="#02040f" flood-opacity="0.55"/>
    </filter>
  </defs>

  <!-- background -->
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>
  <circle cx="1180" cy="80" r="420" fill="url(#glow1)"/>
  <circle cx="120" cy="640" r="360" fill="url(#glow2)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="url(#accent)"/>

  <!-- brand + tag -->
  <image x="80" y="70" width="188" height="52" xlink:href="${logo}" preserveAspectRatio="xMinYMid meet"/>
  <g transform="translate(286, 78)">
    <rect x="0" y="0" width="${c.tag.length * 10.5 + 34}" height="36" rx="18" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.20"/>
    <text x="${(c.tag.length * 10.5 + 34) / 2}" y="24" text-anchor="middle" font-family="'Segoe UI','Arial',sans-serif" font-size="16" font-weight="700" fill="#bcd2ff" letter-spacing="1.5">${esc(c.tag)}</text>
  </g>

  <!-- headline -->
  ${titleSvg(c.title, 80, 250)}

  <!-- subtitle (multi-baris) -->
  ${c.subtitle.map((ln, i) => `<text x="82" y="${384 + i * 34}" font-family="'Segoe UI','Arial',sans-serif" font-size="24" font-weight="400" fill="#c2d1ef">${esc(ln)}</text>`).join("\n  ")}

  <!-- tech chips -->
  ${techChips(82, 474)}

  <!-- footer -->
  <g transform="translate(82, 540)">
    <circle cx="7" cy="7" r="7" fill="#84b81a"/>
    <text x="26" y="13" font-family="'Segoe UI','Arial',sans-serif" font-size="20" font-weight="600" fill="#9fb6e6">${esc(c.footer)}</text>
  </g>

  <!-- checkout mock -->
  ${checkoutMock(748, 86)}
</svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return sharp(png).png({ compressionLevel: 9 }).toBuffer();
}

const outDir = process.argv[2] || join(REPO, ".github", "assets");
mkdirSync(outDir, { recursive: true });
const png = await build(CONFIG.variant);
const out = join(outDir, "og.png");
writeFileSync(out, png);
console.log(`wrote ${out} (${Math.round(png.length / 1024)}KB) variant=${CONFIG.variant}`);
