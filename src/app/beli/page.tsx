import type { Metadata } from "next";
import { isConfigured, MIDTRANS_CLIENT_KEY, MIDTRANS_IS_PRODUCTION } from "@/lib/midtrans";
import { getEventPricing } from "@/lib/events";
import { PaymentClient } from "@/components/pay/payment-client";
import { BrandWordmark } from "@/components/auth/auth-ui";

export const metadata: Metadata = {
  title: "Beli - Account Center Starter",
  description: "Isi data diri dan selesaikan pembayaran.",
};

export const dynamic = "force-dynamic";

// Halaman "Beli langsung" (guest checkout, ADR-002 §1). Tanpa login: isi data diri lalu
// bayar lewat Midtrans. Dipanggil dari web utama untuk event/produk BERBAYAR.
export default async function BeliPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string; event?: string; judul?: string; redirect?: string }>;
}) {
  const sp = await searchParams;

  // Untuk ACARA: harga & judul OTORITATIF dari Directus (jangan percaya query param untuk
  // uang). `judul` param hanya fast-path tampilan bila fetch judul gagal. Harga SELALU dari
  // server — konsisten dengan yang ditagih resolveCheckout.
  let eventTitle: string | undefined;
  let eventPriceIdr: number | null | undefined;
  if (sp.event) {
    const pricing = await getEventPricing(sp.event);
    eventTitle = pricing?.title ?? sp.judul ?? undefined;
    eventPriceIdr = pricing?.priceIdr ?? undefined;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl">
        <div className="mb-8 flex justify-center">
          <BrandWordmark />
        </div>
        <PaymentClient
          mode="guest"
          product={sp.product}
          event={sp.event}
          eventTitle={eventTitle}
          eventPriceIdr={eventPriceIdr}
          redirect={sp.redirect}
          configured={isConfigured()}
          clientKey={MIDTRANS_CLIENT_KEY}
          isProduction={MIDTRANS_IS_PRODUCTION}
        />
      </div>
    </div>
  );
}
