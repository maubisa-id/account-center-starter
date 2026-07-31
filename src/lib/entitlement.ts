// Status akses efektif dihitung SAAT DIBACA (lazy), bukan lewat cron/worker.
// Sesuai pembayaran.md ("akses dicek dengan membandingkan expires_at terhadap waktu
// sekarang"). Keuntungan: NOL proses background / nol resource tambahan — entitlement
// yang sudah lewat expires_at otomatis dianggap tidak aktif tanpa perlu job penjadwal.

type EntitlementLike = { status: string; expiresAt?: Date | string | null };
type SubscriptionLike = {
  status: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date | string | null;
};

function toDate(v?: Date | string | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Entitlement dianggap aktif bila status 'active' DAN belum lewat expires_at (kalau ada).
export function isEntitlementActive(e: EntitlementLike, now: Date = new Date()): boolean {
  if (e.status !== "active") return false;
  const exp = toDate(e.expiresAt);
  return exp ? exp.getTime() > now.getTime() : true;
}

// Status yang ditampilkan: 'expired' bila sudah lewat masa berlaku, selain itu apa adanya.
export function effectiveEntitlementStatus(e: EntitlementLike, now: Date = new Date()): string {
  if (e.status === "active" && !isEntitlementActive(e, now)) return "expired";
  return e.status;
}

// Langganan efektif: kalau sudah lewat periode -> 'expired' (belum diperpanjang webhook).
export function effectiveSubscriptionStatus(s: SubscriptionLike, now: Date = new Date()): string {
  if (s.status === "active") {
    const end = toDate(s.currentPeriodEnd);
    if (end && end.getTime() <= now.getTime()) return "expired";
  }
  return s.status;
}

export function isSubscriptionActive(s: SubscriptionLike, now: Date = new Date()): boolean {
  return effectiveSubscriptionStatus(s, now) === "active";
}
