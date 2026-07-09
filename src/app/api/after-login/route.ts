import { NextResponse } from "next/server";
import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { safeInternalPath } from "@/lib/safe-redirect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Gerbang tujuan SETELAH login. Klien hard-nav ke sini (cookie sesi ikut terbawa di request
// dokumen pertama), lalu SERVER yang memutuskan tujuan: admin -> /admin, selain itu -> "/".
// Status admin (ADMIN_EMAILS) TIDAK diekspos ke klien, jadi keputusan ini harus di server.
// Deep-link internal (?next=, mis. tadi mau buka /langganan lalu dipantul ke /masuk) tetap
// dihormati supaya alih-ke-admin tidak menimpa maksud pengguna.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const email = await getSessionEmail();
  const adminHome = isAdminEmail(email) ? "/admin" : "/";

  let dest = adminHome;
  const raw = url.searchParams.get("next");
  if (raw) {
    const safe = safeInternalPath(raw, "/");
    // Hormati deep-link nyata; abaikan root & halaman auth supaya tak menimpa adminHome.
    if (safe !== "/" && safe !== "/masuk" && safe !== "/daftar") dest = safe;
  }
  // Location RELATIF (bukan absolut dari url.origin): di balik proxy/Cloudflare, req.url server
  // sering ber-host internal (localhost:3000) sehingga URL absolut akan salah arah. Location
  // relatif di-resolve browser terhadap origin publik yang benar (akun.maubisa.id).
  return new NextResponse(null, { status: 307, headers: { Location: dest } });
}
