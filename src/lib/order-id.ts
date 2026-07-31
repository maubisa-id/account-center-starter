import { randomBytes } from "crypto";

// Pembuat order_id yang TAK BISA DITEBAK. Sebelumnya `MB-<itemRef>-<Date.now()>` bersifat
// deterministik (itemRef diketahui + timestamp ms) sehingga status pesanan bisa dienumerasi
// lewat endpoint status yang publik. Kini disisipkan 40-bit entropi kriptografis (randomBytes)
// sehingga tebakan brute-force tidak layak, sambil tetap menjaga prefix yang enak dibaca ops.
//
// Batas Midtrans: order_id maksimum 50 karakter, hanya alfanumerik dan `-_.:`. Format ini
// (MB-<hint<=12>-<ts36>-<rand10hex>) maksimum ~35 karakter, jadi aman.
export function newOrderId(itemRef: string): string {
  const hint = itemRef
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 12)
    .replace(/-+$/g, "");
  const ts = Date.now().toString(36);
  const rand = randomBytes(5).toString("hex"); // 10 hex chars = 40-bit entropi
  return hint ? `MB-${hint}-${ts}-${rand}` : `MB-${ts}-${rand}`;
}
