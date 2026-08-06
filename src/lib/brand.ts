// Konfigurasi brand TERPUSAT untuk template. Semua default GENERIK; deploy nyata mengganti
// nama/logo/kontak/link lewat env NEXT_PUBLIC_* TANPA menyentuh kode. Repo ini boleh dimiliki
// siapa pun sebagai titik awal — kode netral, identitas diisi via env.
const env = (k: string) => process.env[k]?.trim() || "";

export const BRAND = {
  // Nama tampil (sidebar alt, invoice, footer). Ganti via NEXT_PUBLIC_BRAND_NAME.
  name: env("NEXT_PUBLIC_BRAND_NAME") || "Account Center",
  // Badan hukum (opsional, mis. "PT Example"). Kosong = tak ditampilkan.
  legalName: env("NEXT_PUBLIC_BRAND_LEGAL_NAME"),
  // Logo. Default aset lokal netral; override ke URL/CDN via env. logoDark untuk email (butuh
  // URL absolut supaya tampil di klien email); bila kosong, email memakai nama sebagai teks.
  logoUrl: env("NEXT_PUBLIC_LOGO_URL") || "/logo.svg",
  logoDarkUrl: env("NEXT_PUBLIC_LOGO_DARK_URL"),
  // Kontak & tautan legal/bantuan. Kosong = elemen terkait tak dirender (bukan tautan mati).
  supportEmail: env("NEXT_PUBLIC_SUPPORT_EMAIL") || "support@example.com",
  supportWhatsapp: env("NEXT_PUBLIC_SUPPORT_WHATSAPP"), // nomor tanpa "+", mis. 6281234567890
  mainSiteUrl: env("NEXT_PUBLIC_MAIN_SITE_URL"),
  helpUrl: env("NEXT_PUBLIC_HELP_URL"),
  privacyUrl: env("NEXT_PUBLIC_PRIVACY_URL"),
  termsUrl: env("NEXT_PUBLIC_TERMS_URL"),
  acceptableUseUrl: env("NEXT_PUBLIC_ACCEPTABLE_USE_URL"),
  trustCenterUrl: env("NEXT_PUBLIC_TRUST_CENTER_URL"),
  // Sosial (opsional; hanya dirender bila diisi).
  instagramUrl: env("NEXT_PUBLIC_SOCIAL_INSTAGRAM"),
  linkedinUrl: env("NEXT_PUBLIC_SOCIAL_LINKEDIN"),
  tiktokUrl: env("NEXT_PUBLIC_SOCIAL_TIKTOK"),
  // Identitas penerbit invoice (opsional).
  address: env("NEXT_PUBLIC_BRAND_ADDRESS"),
  phone: env("NEXT_PUBLIC_BRAND_PHONE"),
  taxId: env("NEXT_PUBLIC_BRAND_TAX_ID"),
};

// Kompat: sejumlah komponen mengimpor LOGO_URL langsung.
export const LOGO_URL = BRAND.logoUrl;
