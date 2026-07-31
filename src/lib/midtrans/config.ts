// Konfigurasi & kredensial Midtrans (Core API). Framework-agnostic: TIDAK mengimpor
// apa pun dari Next.js supaya modul ini bisa dipakai ulang di service/produk lain
// (app, kelas) yang berbagi arsitektur pembayaran acme_core (ADR-002).
//
// Kunci dibaca dari environment (.env), TIDAK pernah di repo. Server key hanya di
// server; client key boleh di browser (dipakai hanya bila kelak menambah kartu/3DS).

export const MIDTRANS_IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

// Server key WAJIB rahasia. Jangan pernah kirim ke klien.
export const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? "";

// Client key aman tampil di browser (prefiks NEXT_PUBLIC_). Belum dipakai di v1
// (QRIS/VA/e-wallet tidak butuh script Midtrans di klien), disiapkan untuk kartu.
export const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";

// Base URL Core API (Charge, Get Status, dll). Sandbox default; Production saat siap.
export const API_BASE = MIDTRANS_IS_PRODUCTION
  ? "https://api.midtrans.com"
  : "https://api.sandbox.midtrans.com";

// Endpoint Charge Core API — pengganti Snap /snap/v1/transactions.
export const CHARGE_URL = `${API_BASE}/v2/charge`;

// Pembayaran hanya tersedia bila server key terisi. Kalau kosong, UI menampilkan
// "belum tersedia" (bukan error kunci palsu) — sama seperti perilaku Snap dulu.
export function isConfigured(): boolean {
  return SERVER_KEY.length > 0;
}

// Header Basic auth Midtrans: base64("ServerKey:") — password kosong.
export function authHeader(): string {
  return "Basic " + Buffer.from(SERVER_KEY + ":").toString("base64");
}

// URL "pulang" setelah pembayaran selesai (Finish Redirect URL Payment Link, dan fallback
// tab-baru 3DS kartu). Default = BETTER_AUTH_URL (akun.example.com). Untuk checkout TAMU,
// handoff §3/§4 menyarankan domain NETRAL (mis. https://bayar.example.com) supaya pembeli tak
// "terdampar" di domain "akun". Set PAYMENT_FINISH_URL untuk menimpanya (harus origin yang
// melayani app ini, mis. bayar.example.com, karena path /bayar/selesai dirender di sini).
export function finishRedirectUrl(orderId: string): string {
  const base = (process.env.PAYMENT_FINISH_URL || process.env.BETTER_AUTH_URL || "").replace(/\/+$/, "");
  return `${base}/bayar/selesai?order_id=${encodeURIComponent(orderId)}`;
}
