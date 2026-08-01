import { randomBytes } from "crypto";

// Pembuat order_id yang TAK BISA DITEBAK. Sebelumnya `MB-<itemRef>-<Date.now()>` bersifat
// deterministik (itemRef diketahui + timestamp ms) sehingga status pesanan bisa dienumerasi
// lewat endpoint status yang publik. Kini disisipkan 40-bit entropi kriptografis (randomBytes)
// sehingga tebakan brute-force tidak layak, sambil tetap menjaga prefix yang enak dibaca ops.
//
// Batas Midtrans: order_id maksimum 50 karakter, hanya alfanumerik dan `-_.:`. Format ini
// (MB-<hint<=12>-<ts36>-<rand10hex>) maksimum ~35 karakter, jadi aman.
export function newOrderId(itemRef: string): string {
  // Bangun slug pendek yang enak dibaca ops TANPA regex rawan-backtracking. Satu kali lewat:
  // pertahankan [a-z0-9], padatkan sisanya jadi satu '-', batasi 12 karakter. Linear (O(n)),
  // jadi tak ada polynomial-ReDoS pada itemRef tak terkontrol.
  const lower = itemRef.toLowerCase();
  let hint = "";
  let prevDash = false;
  for (let i = 0; i < lower.length && hint.length < 12; i++) {
    const c = lower.charCodeAt(i);
    const isAlnum = (c >= 97 && c <= 122) || (c >= 48 && c <= 57); // a-z / 0-9
    if (isAlnum) {
      hint += lower[i];
      prevDash = false;
    } else if (!prevDash && hint.length > 0) {
      hint += "-";
      prevDash = true;
    }
  }
  if (hint.endsWith("-")) hint = hint.slice(0, -1); // buang '-' menggantung (tanpa regex)

  const ts = Date.now().toString(36);
  const rand = randomBytes(5).toString("hex"); // 10 hex chars = 40-bit entropi
  return hint ? `MB-${hint}-${ts}-${rand}` : `MB-${ts}-${rand}`;
}
