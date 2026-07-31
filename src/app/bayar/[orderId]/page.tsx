import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { idr } from "@/lib/format";
import type { PaymentInstruction } from "@/lib/midtrans/types";
import { PaymentResume } from "@/components/pay/resume-client";
import { BrandWordmark } from "@/components/auth/auth-ui";

export const dynamic = "force-dynamic";

// Halaman resume pembayaran (login). Membuka ulang instruksi bayar tersimpan
// (chargePayload) supaya pembeli bisa menyelesaikan VA/QR yang dibuat sebelumnya.
// Ditautkan dari email "menunggu pembayaran". Akses tetap diaktifkan webhook.
export default async function BayarPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) redirect(`/masuk?redirect=${encodeURIComponent(`/bayar/${orderId}`)}`);

  const user = await prisma.user.findFirst({ where: { email } });
  const invoice = user
    ? await prisma.invoice.findFirst({ where: { orderId, userId: user.id } })
    : null;
  if (!user || !invoice) notFound();

  const paid = invoice.status === "paid";

  let instruction: PaymentInstruction | null = null;
  if (invoice.chargePayload) {
    try {
      instruction = JSON.parse(invoice.chargePayload) as PaymentInstruction;
    } catch {
      instruction = null;
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandWordmark />
        </div>

        {paid ? (
          <div className="rounded-3xl border border-black/[0.06] bg-white p-8 text-center shadow-soft">
            <h1 className="text-xl font-bold text-ink">Pembayaran lunas</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Pesanan {invoice.orderId} sudah dibayar sebesar {idr(invoice.grossAmount)}.
            </p>
            <Link
              href="/akses"
              className="mt-5 inline-block rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Lihat akses saya
            </Link>
          </div>
        ) : instruction ? (
          <PaymentResume instruction={instruction} orderId={invoice.orderId} successUrl="/akses" />
        ) : (
          <div className="rounded-3xl border border-black/[0.06] bg-white p-8 text-center shadow-soft">
            <h1 className="text-xl font-bold text-ink">Instruksi tidak tersedia</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Cara bayar untuk pesanan ini tidak dapat ditampilkan. Silakan mulai ulang dari katalog.
            </p>
            <Link
              href="/langganan/ubah"
              className="mt-5 inline-block rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Lihat katalog
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
