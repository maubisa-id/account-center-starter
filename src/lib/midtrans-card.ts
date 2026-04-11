// Loader + tokenizer kartu Midtrans (Core API 3DS). Client-only. Memuat
// midtrans-new-3ds.min.js lalu memanggil MidtransNew3ds.getCardToken supaya PAN/CVV
// TIDAK pernah menyentuh server kita (PCI): server hanya menerima token_id sekali-pakai.

import { payIcon } from "@/lib/pay-assets";

type CardTokenResponse = { status_code: string; token_id?: string; validation_messages?: string[] };

// Respons registrasi kartu (menyimpan kartu tanpa transaksi): saved_token_id + masked_card.
type RegisterCardResponse = {
  status_code: string;
  saved_token_id?: string;
  transaction_id?: string;
  masked_card?: string;
  validation_messages?: string[];
};

declare global {
  interface Window {
    MidtransNew3ds?: {
      getCardToken: (
        card: { card_number: string; card_exp_month: string; card_exp_year: string; card_cvv: string },
        opts: { onSuccess: (r: CardTokenResponse) => void; onFailure: (r: CardTokenResponse) => void },
      ) => void;
      // Registrasi kartu (Card Registration API): menukar nomor+kadaluwarsa (tanpa CVV, tanpa
      // transaksi) menjadi saved_token_id yang bisa dipakai ulang. Untuk "tambah metode" mandiri.
      registerCard?: (
        card: { card_number: string; card_exp_month: string; card_exp_year: string },
        opts: { onSuccess: (r: RegisterCardResponse) => void; onFailure: (r: RegisterCardResponse) => void },
      ) => void;
      // 3DS 2.0 in-page: buka halaman verifikasi ACS di iframe (bukan tab baru) lalu
      // laporkan hasil lewat callback JS (js_event). Async: onPending berarti hasil final
      // menyusul lewat webhook — backend tetap sumber kebenaran.
      authenticate?: (
        redirectUrl: string,
        options: {
          performAuthentication: (url: string) => void;
          onSuccess: (r: unknown) => void;
          onFailure: (r: unknown) => void;
          onPending: (r: unknown) => void;
        },
      ) => void;
      redirect?: (redirectUrl: string, options: { callbackUrl: string }) => void;
    };
  }
}

// ID WAJIB `midtrans-script`: pustaka midtrans-new-3ds membaca data-environment &
// data-client-key via document.getElementById("midtrans-script"). Kalau id beda, lookup-nya
// null -> "Cannot read properties of null (reading 'getAttribute')" saat getCardToken.
const SCRIPT_ID = "midtrans-script";

export function loadCardScript(clientKey: string, isProduction: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject(new Error("no window"));
    if (window.MidtransNew3ds) return resolve();
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Gagal memuat skrip kartu.")));
      return;
    }
    const s = document.createElement("script");
    s.id = SCRIPT_ID;
    // Skrip 3DS SELALU dari host produksi (api.midtrans.com); lingkungan diatur lewat
    // atribut data-environment. Ini sesuai dokumentasi Midtrans.
    s.src = "https://api.midtrans.com/v2/assets/js/midtrans-new-3ds.min.js";
    s.setAttribute("data-environment", isProduction ? "production" : "sandbox");
    s.setAttribute("data-client-key", clientKey);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Gagal memuat skrip kartu."));
    document.body.appendChild(s);
  });
}

export type CardInput = { number: string; expMonth: string; expYear: string; cvv: string; name?: string };

// Deteksi jaringan kartu dari BIN/IIN (digit awal) — untuk PETUNJUK visual saat mengetik.
// Bukan validasi otoritatif (Midtrans yang memvalidasi kartu asli); cukup untuk menampilkan
// logo/nama jaringan sehingga semua penerbit terasa didukung. Urutan cek penting (prefix 3x
// dibedakan Amex/JCB/Diners; 62 UnionPay).
export type CardNetwork = {
  id: "visa" | "mastercard" | "amex" | "jcb" | "diners" | "discover" | "unionpay" | "unknown";
  label: string;
  logo?: string; // aset di /public/pay bila tersedia
};

export function detectCardNetwork(raw: string): CardNetwork {
  const n = raw.replace(/\D/g, "");
  if (!n) return { id: "unknown", label: "" };
  if (/^4/.test(n)) return { id: "visa", label: "Visa", logo: payIcon("visa.png") };
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]\d|720))/.test(n))
    return { id: "mastercard", label: "Mastercard", logo: payIcon("mastercard.png") };
  if (/^3[47]/.test(n)) return { id: "amex", label: "American Express", logo: payIcon("amex.png") };
  if (/^35/.test(n)) return { id: "jcb", label: "JCB", logo: payIcon("jcb.png") };
  if (/^3(0[0-5]|095|6|[89])/.test(n)) return { id: "diners", label: "Diners Club" };
  // Discover (6011, 65, 644-649). Rentang 622126-622925 secara teknis Discover juga, tapi
  // diawali 62 dan sangat langka di Indonesia -> dibiarkan diklaim UnionPay (jauh lebih umum).
  if (/^(6011|65|64[4-9])/.test(n)) return { id: "discover", label: "Discover", logo: payIcon("discover.png") };
  if (/^62/.test(n)) return { id: "unionpay", label: "UnionPay", logo: payIcon("unionpay.png") };
  return { id: "unknown", label: "" };
}

// Tukar data kartu -> token_id (sekali pakai). Lempar Error dengan pesan ramah bila gagal.
export async function getCardToken(
  clientKey: string,
  isProduction: boolean,
  card: CardInput,
): Promise<string> {
  await loadCardScript(clientKey, isProduction);
  if (!window.MidtransNew3ds) throw new Error("Skrip kartu belum siap. Coba lagi.");
  return new Promise((resolve, reject) => {
    window.MidtransNew3ds!.getCardToken(
      {
        card_number: card.number.replace(/\s+/g, ""),
        card_exp_month: card.expMonth.padStart(2, "0"),
        card_exp_year: card.expYear.length === 2 ? `20${card.expYear}` : card.expYear,
        card_cvv: card.cvv,
      },
      {
        onSuccess: (r) => (r.token_id ? resolve(r.token_id) : reject(new Error("Token kartu kosong."))),
        onFailure: (r) =>
          reject(new Error(r.validation_messages?.join(" ") || "Kartu ditolak. Periksa datanya.")),
      },
    );
  });
}

// Registrasi kartu (tanpa transaksi): tukar nomor+kadaluwarsa jadi saved_token_id yang bisa
// dipakai ulang untuk checkout/perpanjangan. Dipakai fitur "Tambah kartu" di Metode pembayaran.
// Mengembalikan token + masked_card supaya server bisa menyimpan metadata aman (bukan PAN).
export type RegisteredCard = { savedTokenId: string; maskedCard: string | null };

export async function registerCard(
  clientKey: string,
  isProduction: boolean,
  card: { number: string; expMonth: string; expYear: string },
): Promise<RegisteredCard> {
  await loadCardScript(clientKey, isProduction);
  if (!window.MidtransNew3ds?.registerCard) throw new Error("Registrasi kartu belum siap. Coba lagi.");
  return new Promise((resolve, reject) => {
    window.MidtransNew3ds!.registerCard!(
      {
        card_number: card.number.replace(/\s+/g, ""),
        card_exp_month: card.expMonth.padStart(2, "0"),
        card_exp_year: card.expYear.length === 2 ? `20${card.expYear}` : card.expYear,
      },
      {
        onSuccess: (r) =>
          r.saved_token_id
            ? resolve({ savedTokenId: r.saved_token_id, maskedCard: r.masked_card ?? null })
            : reject(new Error("Token kartu kosong.")),
        onFailure: (r) =>
          reject(new Error(r.validation_messages?.join(" ") || "Kartu ditolak. Periksa datanya.")),
      },
    );
  });
}

export type ThreeDsOutcome = "success" | "pending" | "failure";

// Jalankan verifikasi 3DS 2.0 IN-PAGE (EMV 3DS): panggil MidtransNew3ds.authenticate,
// yang memberi URL ACS lewat performAuthentication (kita render di iframe modal) lalu
// melaporkan hasil via callback. "pending" = 3DS 2.0 asinkron: hasil final menyusul lewat
// webhook, jadi pemanggil harus tetap polling status backend (bukan percaya callback ini).
// Lempar Error bila API authenticate tak tersedia agar pemanggil bisa fallback ke redirect.
export async function authenticate3ds(
  clientKey: string,
  isProduction: boolean,
  redirectUrl: string,
  onOpen: (iframeUrl: string) => void,
): Promise<ThreeDsOutcome> {
  await loadCardScript(clientKey, isProduction);
  const mts = window.MidtransNew3ds;
  if (!mts?.authenticate) throw new Error("Verifikasi 3DS in-page tidak tersedia.");
  return new Promise<ThreeDsOutcome>((resolve) => {
    mts.authenticate!(redirectUrl, {
      performAuthentication: (url) => onOpen(url),
      onSuccess: () => resolve("success"),
      onPending: () => resolve("pending"),
      onFailure: () => resolve("failure"),
    });
  });
}
