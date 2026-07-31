import { API_BASE, authHeader, isConfigured } from "./config";

// ── Subscription API (Midtrans-managed recurring) ───────────────────────────
// Untuk MBG+ (langganan bulanan). Model: Midtrans yang menjadwalkan & menagih ulang
// memakai saved_token_id kartu (dari charge pertama dengan save_token_id:true).
// PENTING (skill "Subscription owner"): pilih SATU model — Midtrans-managed ATAU
// merchant-cron. Kita pakai Midtrans-managed, jadi JANGAN juga menagih via cron.
//
// Notifikasi charge berulang datang ke webhook (format sama: signature SHA512).
// Reconcile per order_id charge (bukan hanya subscription id).

const SUB_URL = `${API_BASE}/v1/subscriptions`;

export type SubscriptionSchedule = {
  intervalUnit?: "day" | "week" | "month";
  interval?: number; // tiap berapa unit (default 1)
  maxInterval?: number; // batas total tagihan (opsional = tak terbatas)
  startTime?: string; // "YYYY-MM-DD HH:mm:ss +0700"; masa lalu = tagih segera
};

export type CreateSubscriptionParams = {
  // WAJIB unik dalam akun merchant (reuse -> 4xx). Sertakan suffix deterministik.
  name: string;
  amount: number; // IDR; dikirim sebagai STRING (Subscription API beda dgn Snap integer)
  paymentType?: "credit_card" | "gopay";
  token: string; // saved_token_id kartu (atau token GoPay)
  schedule: SubscriptionSchedule;
  customerEmail?: string | null;
  metadata?: Record<string, unknown>;
  // Kebijakan retry saat gagal tagih (dunning). Tiap percobaan memicu notifikasi.
  retry?: { interval?: number; intervalUnit?: "day" | "week" | "month"; maxInterval?: number };
};

export type SubscriptionResult = {
  id: string;
  status: string;
};

async function subFetch(path: string, init: RequestInit): Promise<Record<string, unknown>> {
  if (!isConfigured()) throw new Error("MIDTRANS_SERVER_KEY belum diset di .env");
  const res = await fetch(`${SUB_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: authHeader(),
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  const code = String((data.status_code as string) ?? "");
  // Endpoint subscription mengembalikan objek subscription (punya `id`) saat sukses,
  // atau { status_code, status_message } saat error. Terima 2xx / objek ber-id.
  if (!res.ok || (code && !code.startsWith("2") && !data.id)) {
    const msg = (data.status_message as string) || `HTTP ${res.status}`;
    throw new Error(`Midtrans subscription ${code || res.status}: ${msg}`);
  }
  return data;
}

export async function createSubscription(p: CreateSubscriptionParams): Promise<SubscriptionResult> {
  const body: Record<string, unknown> = {
    name: p.name,
    amount: String(Math.round(p.amount)), // STRING — wajib untuk Subscription API
    currency: "IDR",
    payment_type: p.paymentType ?? "credit_card",
    token: p.token,
    schedule: {
      interval: p.schedule.interval ?? 1,
      interval_unit: p.schedule.intervalUnit ?? "month",
      ...(p.schedule.maxInterval ? { max_interval: p.schedule.maxInterval } : {}),
      ...(p.schedule.startTime ? { start_time: p.schedule.startTime } : {}),
    },
  };
  if (p.customerEmail) body.customer_details = { email: p.customerEmail };
  if (p.metadata) body.metadata = p.metadata;
  if (p.retry) {
    body.retry_schedule = {
      interval: p.retry.interval ?? 1,
      interval_unit: p.retry.intervalUnit ?? "day",
      max_interval: p.retry.maxInterval ?? 3,
    };
  }
  const data = await subFetch("", { method: "POST", body: JSON.stringify(body) });
  return { id: String(data.id ?? ""), status: String(data.status ?? "active") };
}

export async function getSubscription(id: string): Promise<Record<string, unknown> | null> {
  try {
    return await subFetch(`/${encodeURIComponent(id)}`, { method: "GET" });
  } catch {
    return null;
  }
}

// Disable = jeda (bisa di-enable lagi). Dipakai untuk "batal di akhir periode":
// hentikan tagihan berikutnya, akses tetap sampai currentPeriodEnd.
export async function disableSubscription(id: string): Promise<boolean> {
  try {
    await subFetch(`/${encodeURIComponent(id)}/disable`, { method: "POST" });
    return true;
  } catch {
    return false;
  }
}

export async function enableSubscription(id: string): Promise<boolean> {
  try {
    await subFetch(`/${encodeURIComponent(id)}/enable`, { method: "POST" });
    return true;
  } catch {
    return false;
  }
}

// Cancel = stop permanen (tak bisa di-resume).
export async function cancelSubscription(id: string): Promise<boolean> {
  try {
    await subFetch(`/${encodeURIComponent(id)}/cancel`, { method: "POST" });
    return true;
  } catch {
    return false;
  }
}
