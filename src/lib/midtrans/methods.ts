import type { PayCategory, PayMethodId } from "./types";

// Registry metode pembayaran (SATU sumber kebenaran untuk server & UI). Murni data,
// tanpa dependensi framework, jadi aman diimpor komponen klien untuk label/deskripsi.

export type PayMethodMeta = {
  id: PayMethodId;
  label: string;
  category: PayCategory;
  // Deskripsi singkat untuk kartu pilihan di UI.
  desc: string;
  // Nama pendek untuk judul baris di pemilih (bank name). Bila kosong, pakai label.
  short?: string;
  // Tag mekanisme (Virtual Account / Bill Payment) — dipisah dari nama bank supaya
  // daftar metode tampil konsisten (nama bank), mekanisme jadi keterangan.
  tag?: string;
  // Nama grup e-wallet untuk penataan (opsional).
  group?: string;
};

export const PAY_METHODS: PayMethodMeta[] = [
  {
    id: "qris",
    label: "QRIS",
    category: "ewallet",
    desc: "Scan pakai GoPay, OVO, DANA, ShopeePay, LinkAja, atau m-banking apa pun.",
    group: "Scan / E-wallet",
  },
  {
    id: "gopay",
    label: "GoPay",
    category: "ewallet",
    desc: "Bayar langsung dari aplikasi Gojek/GoPay.",
    group: "Scan / E-wallet",
  },
  {
    id: "shopeepay",
    label: "ShopeePay",
    category: "ewallet",
    desc: "Bayar langsung dari aplikasi Shopee/ShopeePay.",
    group: "Scan / E-wallet",
  },
  {
    id: "bca",
    label: "BCA Virtual Account",
    short: "BCA",
    tag: "Virtual Account",
    category: "va",
    desc: "Transfer dari BCA lewat m-BCA, KlikBCA, atau ATM.",
    group: "Virtual Account",
  },
  {
    id: "bni",
    label: "BNI Virtual Account",
    short: "BNI",
    tag: "Virtual Account",
    category: "va",
    desc: "Bisa dari bank apa pun (transfer antarbank), lewat m-banking atau ATM.",
    group: "Virtual Account",
  },
  {
    id: "bri",
    label: "BRI Virtual Account",
    short: "BRI",
    tag: "Virtual Account",
    category: "va",
    desc: "Bisa dari bank apa pun (transfer antarbank), lewat BRImo atau ATM.",
    group: "Virtual Account",
  },
  {
    id: "permata",
    label: "Permata Virtual Account",
    short: "Permata",
    tag: "Virtual Account",
    category: "va",
    desc: "Bisa dari bank apa pun via ATM Bersama/Prima. Cocok untuk bank lain.",
    group: "Virtual Account",
  },
  {
    id: "cimb",
    label: "CIMB Niaga Virtual Account",
    short: "CIMB Niaga",
    tag: "Virtual Account",
    category: "va",
    desc: "Bisa dari bank apa pun (transfer antarbank), lewat OCTO Mobile atau ATM.",
    group: "Virtual Account",
  },
  {
    id: "mandiri",
    label: "Mandiri Bill Payment",
    short: "Mandiri",
    tag: "Bill Payment",
    category: "va",
    desc: "Bayar via Livin', ATM, atau internet banking Mandiri (kode perusahaan + bill key).",
    group: "Virtual Account",
  },
  {
    id: "card",
    label: "Kartu Kredit / Debit",
    short: "Kartu Kredit / Debit",
    category: "card",
    desc: "Visa, Mastercard, JCB, dan Amex dari semua bank penerbit. Diamankan 3D Secure.",
    group: "Kartu",
  },
];

const BY_ID = new Map(PAY_METHODS.map((m) => [m.id, m]));

export function getMethod(id: string): PayMethodMeta | undefined {
  return BY_ID.get(id as PayMethodId);
}

export function isValidMethod(id: unknown): id is PayMethodId {
  return typeof id === "string" && BY_ID.has(id as PayMethodId);
}

export function methodLabel(id: string): string {
  return BY_ID.get(id as PayMethodId)?.label ?? id;
}
