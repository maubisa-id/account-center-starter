import { timingSafeEqual } from "crypto";

// Bandingkan dua rahasia dalam waktu KONSTAN (anti timing side-channel). Dipakai untuk
// shared secret (PROVISION_SECRET) agar konsisten dengan verifikasi signature webhook.
// Membandingkan panjang dulu tanpa membocorkan panjang lewat waktu: bila beda panjang,
// tetap lakukan satu perbandingan dummy berukuran sama supaya waktu tak bergantung input.
export function secureEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Bandingkan bufA dengan dirinya sendiri supaya durasi tetap, hasil tetap false.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
