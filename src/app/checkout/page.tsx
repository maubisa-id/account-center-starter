import type { Metadata } from "next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isConfigured, MIDTRANS_CLIENT_KEY, MIDTRANS_IS_PRODUCTION } from "@/lib/midtrans";
import { getEventPricing } from "@/lib/events";
import { listMethods } from "@/lib/payment-methods";
import { PaymentClient, type SavedCardLite } from "@/components/pay/payment-client";
import { BrandWordmark } from "@/components/auth/auth-ui";

export const metadata: Metadata = {
  title: "Pembayaran · Acme",
  description: "Selesaikan pembayaran layanan Acme.",
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; event?: string; judul?: string; redirect?: string }>;
}) {
  const sp = await searchParams;

  // Acara berbayar: harga & judul asli dari Directus (otoritatif; sama dgn yang ditagih).
  let eventTitle: string | undefined;
  let eventPriceIdr: number | null | undefined;
  if (sp.event) {
    const pricing = await getEventPricing(sp.event);
    eventTitle = pricing?.title ?? sp.judul ?? undefined;
    eventPriceIdr = pricing?.priceIdr ?? undefined;
  }

  // Kartu tersimpan milik pengguna login -> ditawarkan sebagai opsi di checkout (token tetap
  // di server; klien hanya menerima id + brand/last4 untuk ditampilkan, bukan token).
  let savedCards: SavedCardLite[] = [];
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user?.email) {
    const u = await prisma.user.findFirst({ where: { email: session.user.email }, select: { id: true } });
    if (u) {
      savedCards = (await listMethods(u.id)).map((m) => ({
        id: m.id,
        brand: m.brand,
        bankCode: m.bankCode,
        last4: m.last4,
        expMonth: m.expMonth,
        expYear: m.expYear,
        isPrimary: m.isPrimary,
      }));
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl">
        <div className="mb-8 flex justify-center">
          <BrandWordmark />
        </div>
        <PaymentClient
          mode="login"
          product={sp.product}
          event={sp.event}
          eventTitle={eventTitle}
          eventPriceIdr={eventPriceIdr}
          redirect={sp.redirect}
          configured={isConfigured()}
          clientKey={MIDTRANS_CLIENT_KEY}
          isProduction={MIDTRANS_IS_PRODUCTION}
          savedCards={savedCards}
        />
      </div>
    </div>
  );
}
