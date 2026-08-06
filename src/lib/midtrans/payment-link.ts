import { API_BASE, authHeader, isConfigured } from "./config";
import type { PayMethodId } from "./types";

// ── Payment Link API (Payment Link) ──────────────────────────
// ADR-001 §2.4 / ADR-002 §Payment Link diawali konsultasi WhatsApp,
// lalu admin men-generate Payment Link VIA API (bukan manual di dashboard) supaya
// order_id + data pembeli tercatat dan webhook mengaktifkan akun otomatis — sama
// seperti Snap/Core API. Notifikasi memakai format & signature yang sama.

const LINK_URL = `${API_BASE}/v1/payment-links`;

// Petakan metode internal -> nilai enabled_payments Midtrans (subset yang relevan).
const ENABLED_PAYMENT_MAP: Record<PayMethodId, string> = {
  qris: "qris",
  gopay: "gopay",
  shopeepay: "shopeepay",
  bca: "bca_va",
  bni: "bni_va",
  bri: "bri_va",
  cimb: "cimb_va",
  permata: "permata_va",
  mandiri: "echannel",
  card: "credit_card",
};

export type CreatePaymentLinkParams = {
  orderId: string;
  grossAmount: number;
  itemId: string;
  itemName: string;
  customer?: { name?: string | null; email?: string | null; phone?: string | null };
  // Batasi metode yang tampil di halaman (opsional). Kalau kosong -> semua metode aktif.
  enabledMethods?: PayMethodId[];
  // Berapa lama link berlaku (jam). Default 24 jam. Payment Link expiry relatif ke start.
  expiryHours?: number;
  // Berapa kali link boleh sukses dibayar. Untuk tagihan 1 orang -> 1.
  usageLimit?: number;
  // Wajibkan pembeli mengisi data diri di halaman (untuk Motion C biasanya sudah diisi admin).
  customerRequired?: boolean;
  // Redirect setelah bayar.
  finishUrl?: string;
};

export type PaymentLinkResult = {
  orderId: string;
  paymentUrl: string;
};

export async function createPaymentLink(p: CreatePaymentLinkParams): Promise<PaymentLinkResult> {
  if (!isConfigured()) throw new Error("MIDTRANS_SERVER_KEY belum diset di .env");

  const amount = Math.round(p.grossAmount);
  const body: Record<string, unknown> = {
    transaction_details: { order_id: p.orderId, gross_amount: amount },
    item_details: [{ id: p.itemId, price: amount, quantity: 1, name: p.itemName.slice(0, 50) }],
    // FIXED_AMOUNT: nominal terkunci (net item_details == gross_amount).
    payment_link_type: "FIXED_AMOUNT",
    // Selalu set eksplisit (skill: jangan andalkan default usage_limit).
    usage_limit: p.usageLimit ?? 1,
    expiry: { duration: p.expiryHours ?? 24, unit: "hours" },
  };

  if (p.customer && (p.customer.name || p.customer.email || p.customer.phone)) {
    body.customer_details = {
      first_name: p.customer.name ?? undefined,
      email: p.customer.email ?? undefined,
      phone: p.customer.phone ?? undefined,
    };
  }
  if (p.customerRequired) body.customer_required = true;
  if (p.enabledMethods && p.enabledMethods.length > 0) {
    body.enabled_payments = p.enabledMethods.map((m) => ENABLED_PAYMENT_MAP[m]);
  }
  if (p.finishUrl) body.callbacks = { finish: p.finishUrl };

  const res = await fetch(LINK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as {
    order_id?: string;
    payment_url?: string;
    error_messages?: string[];
    status_message?: string;
  };

  if (!res.ok || !data.payment_url) {
    const detail = data.error_messages?.join("; ") || data.status_message || `HTTP ${res.status}`;
    throw new Error(`Midtrans payment-link ${res.status}: ${detail}`);
  }

  return { orderId: data.order_id ?? p.orderId, paymentUrl: data.payment_url };
}
