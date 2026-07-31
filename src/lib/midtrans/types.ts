// Tipe bersama untuk alur pembayaran Core API. Dipakai server (charge) DAN klien (UI),
// jadi TIDAK boleh mengimpor modul server-only. Murni tipe + konstanta.

// Kategori metode untuk pengelompokan di UI.
export type PayCategory = "ewallet" | "va" | "card";

// Identitas metode yang didukung. QRIS/e-wallet (instan) + Virtual Account (bayar
// nanti) + Kartu (3DS). Ditambah sesuai metode aktif di dashboard Midtrans merchant.
export type PayMethodId =
  | "qris"
  | "gopay"
  | "shopeepay"
  | "bca"
  | "bni"
  | "bri"
  | "cimb"
  | "permata"
  | "mandiri"
  | "card";

// Bentuk tampilan instruksi bayar yang dinormalisasi dari respons Charge Core API.
// UI merender berdasarkan `kind` (QR, VA, tagihan Mandiri, deeplink e-wallet, atau
// redirect 3DS untuk kartu).
export type PaymentDisplay =
  | { kind: "qr"; qrImageUrl?: string; qrString?: string; deeplinkUrl?: string }
  | { kind: "deeplink"; deeplinkUrl?: string; qrImageUrl?: string }
  | { kind: "va"; bank: string; vaNumber: string }
  | { kind: "bill"; billerCode: string; billKey: string }
  | { kind: "redirect"; redirectUrl: string }
  | { kind: "done" };

// Hasil charge yang dikembalikan ke klien (aman dikirim ke browser: tidak memuat
// server key / data sensitif). Sumber untuk halaman instruksi + polling.
export type PaymentInstruction = {
  orderId: string;
  method: PayMethodId;
  methodLabel: string;
  grossAmount: number;
  transactionStatus: string; // biasanya "pending" saat charge async
  // Waktu kedaluwarsa WIB "YYYY-MM-DD HH:mm:ss" dari Midtrans (untuk hitung mundur).
  expiryTime: string | null;
  display: PaymentDisplay;
};
