import type { Metadata } from "next";
import { FinishStatus } from "@/components/pay/finish-status";
import { BrandWordmark } from "@/components/auth/auth-ui";

export const metadata: Metadata = {
  title: "Status Pembayaran · Maubisa",
  description: "Status pembayaran layanan Maubisa.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

// Halaman tujuan "Finish Redirect URL" Midtrans. Midtrans mengarahkan pembeli ke sini
// setelah menyelesaikan pembayaran (mis. kembali dari 3DS kartu atau halaman Payment
// Link) dengan query `order_id`. Status di query hanya petunjuk UX; komponen klien
// memverifikasi status resmi ke server (webhook tetap satu-satunya yang mengaktifkan akses).
export default async function SelesaiPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string; order_di?: string }>;
}) {
  const sp = await searchParams;
  // Midtrans memakai `order_id`; sebagian channel lama memakai `order_di` — dukung keduanya.
  const orderId = sp.order_id ?? sp.order_di ?? null;

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <BrandWordmark />
        </div>
        <FinishStatus orderId={orderId} />
      </div>
    </div>
  );
}
