import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Proxy (dulu "middleware") — Next.js 16. Arahkan akar domain (`/`) ke /masuk untuk
// pengunjung anonim DI EDGE, sebelum layout grup (app) yang menyentuh DB dijalankan.
// Tahan banting: tetap redirect walau DB tak terjangkau (mis. prod yang DATABASE_URL-nya
// belum diisi), jadi membuka domain selalu mendarat di halaman masuk alih-alih 500.
// Pengguna yang sudah login (punya cookie sesi) diteruskan ke dashboard. Matcher HANYA
// "/" sehingga tak ada loop redirect.
export function proxy(req: NextRequest) {
  const hasSession = req.cookies
    .getAll()
    .some((c) => c.name.includes("better-auth.session_token") && c.value);
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/masuk";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/"] };
