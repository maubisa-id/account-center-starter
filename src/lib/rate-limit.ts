import { NextResponse } from "next/server";

// Rate limiter sederhana (in-memory, sliding window) untuk endpoint POST sensitif —
// mencegah abuse/spam (mis. guest charge yang membuat transaksi Midtrans, provision,
// export/hapus akun). Kunci = bucket + IP.
//
// CATATAN penskalaan: penyimpanan di memori proses, jadi berlaku PER-INSTANCE. Untuk
// deployment multi-instance, ganti store ke Redis/Upstash (antarmuka `hit()` tetap sama).
// Endpoint auth (masuk/daftar/OTP/reset) sudah dibatasi oleh better-auth (lib/auth.ts).

type Hit = { count: number; resetAt: number };
const store = new Map<string, Hit>();

// Bersihkan entri kedaluwarsa sesekali agar Map tak tumbuh tak terbatas.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}

// Ambil IP klien untuk kunci rate-limit. PENTING: jangan pernah percaya nilai PALING KIRI
// dari X-Forwarded-For — itu bisa diisi klien, sehingga penyerang tinggal merotasi IP palsu
// untuk memicu ember baru tiap request (bypass total). Acme berada di belakang Cloudflare,
// yang menetapkan `cf-connecting-ip` ke IP klien asli dan MENOLAK header itu bila dikirim klien
// (tak bisa dipalsukan). Urutan kepercayaan: Cloudflare -> proxy edge (x-real-ip) -> hop PALING
// KANAN X-Forwarded-For (ditambahkan proxy tepercaya terdekat), baru "unknown".
export function clientIp(req: Request): string {
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1]!;
  }
  return "unknown";
}

export type RateResult = { ok: boolean; remaining: number; retryAfterSec: number };

// Catat satu percobaan. `max` percobaan per `windowMs`. Mengembalikan ok=false bila lewat.
export function hit(bucket: string, key: string, max: number, windowMs: number): RateResult {
  const now = Date.now();
  sweep(now);
  const id = `${bucket}:${key}`;
  const cur = store.get(id);
  if (!cur || cur.resetAt <= now) {
    store.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1, retryAfterSec: Math.ceil(windowMs / 1000) };
  }
  cur.count += 1;
  const retryAfterSec = Math.max(1, Math.ceil((cur.resetAt - now) / 1000));
  if (cur.count > max) return { ok: false, remaining: 0, retryAfterSec };
  return { ok: true, remaining: max - cur.count, retryAfterSec };
}

// Helper langsung untuk route handler: batasi berdasar IP. Kembalikan Response 429 bila
// lewat batas, atau null bila boleh lanjut.
export function rateLimit(
  req: Request,
  bucket: string,
  opts: { max: number; windowMs: number },
): NextResponse | null {
  const res = hit(bucket, clientIp(req), opts.max, opts.windowMs);
  if (res.ok) return null;
  return NextResponse.json(
    { error: "Terlalu banyak percobaan. Coba lagi sebentar." },
    { status: 429, headers: { "Retry-After": String(res.retryAfterSec) } },
  );
}
