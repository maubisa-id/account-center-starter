// URL logo brand, dipakai lintas halaman (sidebar, login, 404, invoice).
//
// Default = aset lokal di public/. Bisa dioverride via NEXT_PUBLIC_LOGO_URL (mis. arahkan
// ke CDN yang lolos optimizer/transform edge, supaya tak kena 403 saat gambar dilayani
// langsung oleh app). Override hanya berlaku bila di-inject saat build (komponen klien
// meng-inline NEXT_PUBLIC_*).
//
// Satu URL (logo berwarna, latar transparan). Untuk latar gelap (sidebar), buat versi
// putih via CSS `brightness-0 invert` — tak perlu aset putih terpisah.
export const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || "/maubisa-logo.png";
