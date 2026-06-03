import { demoMailboxEnabled, getDemoEmail } from "@/lib/demo/mailbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kembalikan HTML email mentah untuk dirender di <iframe sandbox> pada halaman kotak demo.
// Sengaja terpisah dari daftar (JSON) supaya HTML besar tidak ikut di setiap polling.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!demoMailboxEnabled()) return new Response("Tidak ditemukan.", { status: 404 });
  const { id } = await ctx.params;
  const email = getDemoEmail(id);
  if (!email) return new Response("Tidak ditemukan.", { status: 404 });
  // Konten dirender di iframe sandbox (tanpa skrip). nosniff + no-store menghindari cache.
  return new Response(email.html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
