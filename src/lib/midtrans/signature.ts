import { createHash, timingSafeEqual } from "crypto";
import { SERVER_KEY, isConfigured } from "./config";

// Verifikasi signature webhook Midtrans: SHA512(order_id + status_code + gross_amount + ServerKey).
// Format notifikasi Core API IDENTIK dengan Snap, jadi fungsi ini berlaku untuk keduanya.
// Bandingkan konstan-waktu (timingSafeEqual) untuk mencegah timing attack.
export function verifySignature(p: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
}): boolean {
  if (!isConfigured() || !p.signatureKey) return false;
  const expected = createHash("sha512")
    .update(p.orderId + p.statusCode + p.grossAmount + SERVER_KEY)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(p.signatureKey);
  return a.length === b.length && timingSafeEqual(a, b);
}
