import { API_BASE, authHeader, isConfigured } from "./config";

// Status invoice internal (dipetakan dari transaction_status Midtrans).
export type InvoiceStatus = "paid" | "pending" | "failed" | "expired" | "cancelled" | "refunded";

// Petakan transaction_status Midtrans -> status invoice internal.
// Referensi: https://docs.midtrans.com (Transaction Status Cycle + Fraud Status).
// Berlaku sama untuk Core API & Snap (siklus status identik). Untuk `capture` (kartu
// one-step) fraud_status WAJIB dicek: accept=lunas, challenge=tinjau manual (pending),
// deny=ditolak (failed).
export function resolveStatus(transactionStatus: string, fraudStatus?: string | null): InvoiceStatus {
  switch (transactionStatus) {
    case "capture":
      if (fraudStatus === "challenge") return "pending";
      if (fraudStatus === "deny") return "failed";
      return "paid"; // accept (atau tanpa fraud_status)
    case "settlement":
      return "paid";
    case "authorize": // pre-auth kartu (two-step) -> belum ditangkap, tahan dulu
    case "pending":
      return "pending";
    case "deny":
    case "failure":
      return "failed";
    case "expire":
      return "expired";
    case "cancel":
      return "cancelled";
    case "refund":
    case "partial_refund":
      return "refunded";
    default:
      return "pending";
  }
}

// Get Status API Midtrans. Best-practice yang direkomendasikan docs: JANGAN hanya
// mengandalkan payload notifikasi — verifikasi ulang status transaksi ke server Midtrans
// (defense-in-depth terhadap replay/spoof, khususnya saat fraud_status=challenge).
// Dipakai juga oleh endpoint polling status (Core API tidak punya callback popup).
// Return null bila gagal (pemanggil boleh fallback ke payload/DB).
export async function fetchTransactionStatus(
  orderId: string,
): Promise<{ transactionStatus: string; fraudStatus: string | null; grossAmount: string | null; paymentType: string | null } | null> {
  if (!isConfigured() || !orderId) return null;
  try {
    const res = await fetch(`${API_BASE}/v2/${encodeURIComponent(orderId)}/status`, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: authHeader() },
      // Dipakai di jalur panas webhook (defense-in-depth) & polling. Timeout supaya
      // Get-Status yang lambat tak menahan ACK webhook; gagal -> null -> fallback payload/DB.
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const j = (await res.json()) as {
      transaction_status?: string;
      fraud_status?: string;
      gross_amount?: string;
      payment_type?: string;
    };
    if (!j.transaction_status) return null;
    return {
      transactionStatus: j.transaction_status,
      fraudStatus: j.fraud_status ?? null,
      grossAmount: j.gross_amount ?? null,
      paymentType: j.payment_type ?? null,
    };
  } catch {
    return null;
  }
}

// Cancel (void) transaksi yang MASIH bisa dibatalkan: pending (VA/QRIS/e-wallet menunggu
// bayar) atau kartu `capture` dengan fraud challenge. Untuk transaksi pending, Midtrans
// memindahkan status -> `cancel` (bukan refund; refund hanya untuk yang sudah settlement).
// Dipakai fitur "Batal bayar". Return {statusCode, transactionStatus} atau null bila gagal.
// status_code: "200" = berhasil dibatalkan; "412" = tak bisa (mis. sudah settle); "404" = tak ada.
export async function cancelTransaction(
  orderId: string,
): Promise<{ statusCode: string | null; transactionStatus: string } | null> {
  if (!isConfigured() || !orderId) return null;
  try {
    const res = await fetch(`${API_BASE}/v2/${encodeURIComponent(orderId)}/cancel`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      signal: AbortSignal.timeout(8000),
    });
    const j = (await res.json().catch(() => null)) as {
      status_code?: string;
      transaction_status?: string;
    } | null;
    if (!j) return null;
    return { statusCode: j.status_code ?? null, transactionStatus: j.transaction_status ?? "" };
  } catch {
    return null;
  }
}
