import { CHARGE_URL, authHeader, isConfigured } from "./config";
import { methodLabel } from "./methods";
import type { PayMethodId, PaymentDisplay, PaymentInstruction } from "./types";

// ── Charge Core API (pengganti Snap) ────────────────────────────────────────
// Membuat transaksi lewat POST /v2/charge lalu menormalisasi respons tiap metode
// menjadi PaymentInstruction yang seragam untuk UI. Harga SELALU dari server
// (pemanggil sudah meresolusi via lib/checkout), bukan dari klien.

export type ChargeParams = {
  orderId: string;
  grossAmount: number;
  method: PayMethodId;
  itemId: string;
  itemName: string;
  customer?: { name?: string | null; email?: string | null; phone?: string | null };
  // custom_field1..3 di-echo balik Midtrans di notifikasi webhook. Dipakai guest
  // checkout untuk membawa identitas pembeli TANPA menulis DB sebelum bayar (ADR-002).
  customFields?: { field1?: string; field2?: string; field3?: string };
  // KARTU (3DS): token sekali-pakai dari MidtransNew3ds.getCardToken (frontend).
  // Server TIDAK pernah menerima PAN/CVV mentah (PCI): hanya token_id.
  cardTokenId?: string;
  // Simpan token kartu untuk langganan (recurring Pro). Hasil saved_token_id dibaca
  // dari respons charge dan dipakai membuat Subscription API.
  saveCardToken?: boolean;
};

// Hasil charge: instruction (aman dikirim ke klien) + data server-only (saved token,
// transaction id) yang TIDAK boleh bocor ke browser.
export type ChargeResult = {
  instruction: PaymentInstruction;
  transactionId: string | null;
  savedTokenId: string | null;
  savedTokenExpiredAt: string | null;
};

// Durasi kedaluwarsa per kategori (menit). QRIS/e-wallet dibuat pendek supaya QR
// tetap segar; VA/tagihan diberi 24 jam supaya pembeli sempat transfer. Kartu tidak
// pakai custom_expiry (3DS punya sesi sendiri).
function expiryMinutes(method: PayMethodId): number | null {
  if (method === "card") return null;
  return method === "qris" || method === "gopay" || method === "shopeepay" ? 60 : 24 * 60;
}

type MidtransAction = { name: string; method?: string; url: string };

// Bentuk respons Charge (superset lintas metode; field opsional sesuai metode).
type ChargeResponse = {
  status_code?: string;
  status_message?: string;
  transaction_status?: string;
  transaction_id?: string;
  order_id?: string;
  gross_amount?: string;
  payment_type?: string;
  expiry_time?: string;
  actions?: MidtransAction[];
  qr_string?: string;
  va_numbers?: { bank: string; va_number: string }[];
  permata_va_number?: string;
  biller_code?: string;
  bill_key?: string;
  redirect_url?: string; // 3DS kartu
  saved_token_id?: string;
  saved_token_id_expired_at?: string;
  fraud_status?: string;
  validation_messages?: string[];
};

// Susun body request sesuai metode. transaction_details + item_details + customer
// + custom_field + custom_expiry sama untuk semua; hanya blok metode yang berbeda.
function buildChargeBody(p: ChargeParams): Record<string, unknown> {
  // Core API MEWAJIBKAN gross_amount INTEGER IDR. Bulatkan defensif supaya Decimal
  // (mis. 29000.00) tak mengirim pecahan yang ditolak / bikin selisih signature.
  const amount = Math.round(p.grossAmount);

  const common: Record<string, unknown> = {
    transaction_details: { order_id: p.orderId, gross_amount: amount },
    item_details: [{ id: p.itemId, price: amount, quantity: 1, name: p.itemName.slice(0, 50) }],
  };

  const mins = expiryMinutes(p.method);
  if (mins) common.custom_expiry = { expiry_duration: mins, unit: "minute" };

  if (p.customer && (p.customer.name || p.customer.email || p.customer.phone)) {
    // Nama dipisah first/last: data pelanggan yang lebih lengkap menaikkan peluang 3DS 2.0
    // FRICTIONLESS (tanpa OTP) karena ACS bank punya lebih banyak sinyal (per dok Midtrans).
    const fullName = (p.customer.name ?? "").trim();
    const gap = fullName.indexOf(" ");
    common.customer_details = {
      first_name: gap > 0 ? fullName.slice(0, gap) : fullName || undefined,
      last_name: gap > 0 ? fullName.slice(gap + 1) : undefined,
      email: p.customer.email ?? undefined,
      phone: p.customer.phone ?? undefined,
    };
  }
  if (p.customFields) {
    if (p.customFields.field1) common.custom_field1 = p.customFields.field1.slice(0, 255);
    if (p.customFields.field2) common.custom_field2 = p.customFields.field2.slice(0, 255);
    if (p.customFields.field3) common.custom_field3 = p.customFields.field3.slice(0, 255);
  }

  switch (p.method) {
    case "qris":
      // Acquirer gopay -> QR universal (bisa dipindai app apa pun, termasuk m-banking).
      return { payment_type: "qris", ...common, qris: { acquirer: "gopay" } };
    case "gopay":
      return { payment_type: "gopay", ...common, gopay: { enable_callback: false } };
    case "shopeepay":
      return { payment_type: "shopeepay", ...common, shopeepay: {} };
    case "bca":
    case "bni":
    case "bri":
    case "cimb":
    case "permata":
      return { payment_type: "bank_transfer", ...common, bank_transfer: { bank: p.method } };
    case "mandiri":
      // Mandiri memakai skema echannel (Bill Payment) -> mengembalikan bill_key + biller_code.
      return {
        payment_type: "echannel",
        ...common,
        echannel: { bill_info1: "Pembayaran", bill_info2: p.itemName.slice(0, 50) },
      };
    case "card":
      // Kartu 3DS: token_id dari frontend + authentication:true (WAJIB demi keamanan;
      // banyak bank menolak non-3DS). save_token_id untuk langganan (recurring).
      if (!p.cardTokenId) throw new Error("token kartu tidak ada");
      return {
        payment_type: "credit_card",
        ...common,
        credit_card: {
          token_id: p.cardTokenId,
          authentication: true,
          // 3DS 2.0 in-page: hasil verifikasi dilaporkan lewat event JS (bukan reload
          // halaman), agar challenge bisa dibuka di iframe tanpa pembeli meninggalkan halaman.
          callback_type: "js_event",
          save_token_id: p.saveCardToken ? true : undefined,
        },
      };
    default: {
      // Exhaustiveness guard: kalau menambah metode baru, TS memaksa menangani di sini.
      const never: never = p.method;
      throw new Error(`Metode tidak didukung: ${never}`);
    }
  }
}

// Normalisasi respons -> PaymentDisplay yang dimengerti UI.
function toDisplay(method: PayMethodId, r: ChargeResponse): PaymentDisplay {
  const action = (name: string) => r.actions?.find((a) => a.name === name)?.url;

  switch (method) {
    case "qris":
      return { kind: "qr", qrImageUrl: action("generate-qr-code"), qrString: r.qr_string };
    case "gopay":
      return {
        kind: "qr",
        qrImageUrl: action("generate-qr-code"),
        deeplinkUrl: action("deeplink-redirect"),
      };
    case "shopeepay":
      return { kind: "deeplink", deeplinkUrl: action("deeplink-redirect") };
    case "bca":
    case "bni":
    case "bri":
    case "cimb": {
      const va = r.va_numbers?.[0];
      return { kind: "va", bank: va?.bank ?? method, vaNumber: va?.va_number ?? "" };
    }
    case "permata":
      return { kind: "va", bank: "permata", vaNumber: r.permata_va_number ?? "" };
    case "mandiri":
      return { kind: "bill", billerCode: r.biller_code ?? "", billKey: r.bill_key ?? "" };
    case "card":
      // 3DS: kalau ada redirect_url -> arahkan pembeli untuk OTP. Kalau tidak (mis.
      // non-3DS/langsung capture), transaksi sudah final -> UI tinggal poll status.
      return r.redirect_url ? { kind: "redirect", redirectUrl: r.redirect_url } : { kind: "done" };
  }
}

export async function charge(p: ChargeParams): Promise<ChargeResult> {
  if (!isConfigured()) throw new Error("MIDTRANS_SERVER_KEY belum diset di .env");

  const res = await fetch(CHARGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(buildChargeBody(p)),
  });

  const data = (await res.json().catch(() => ({}))) as ChargeResponse;

  // Charge sukses (async) mengembalikan status_code "201"; sinkron "200". Selain 2xx
  // adalah error logis Midtrans (mis. "402" metode nonaktif, "400" validasi) meski
  // HTTP bisa 200/201 — jadi cek field status_code, bukan hanya res.ok.
  const code = data.status_code ?? "";
  if (!code.startsWith("2")) {
    const detail = data.validation_messages?.join("; ") || data.status_message || `HTTP ${res.status}`;
    throw new Error(`Midtrans charge ${code || res.status}: ${detail}`);
  }

  const instruction: PaymentInstruction = {
    orderId: data.order_id ?? p.orderId,
    method: p.method,
    methodLabel: methodLabel(p.method),
    grossAmount: Math.round(p.grossAmount),
    transactionStatus: data.transaction_status ?? "pending",
    expiryTime: data.expiry_time ?? null,
    display: toDisplay(p.method, data),
  };

  return {
    instruction,
    transactionId: data.transaction_id ?? null,
    savedTokenId: data.saved_token_id ?? null,
    savedTokenExpiredAt: data.saved_token_id_expired_at ?? null,
  };
}
