import Link from "next/link";
import { Reveal } from "@/components/ui";
import { IconReceipt } from "@/components/icons";

// Pengingat "ada pembayaran tertunda" yang dipakai bersama di Ringkasan, Pembayaran, dan
// Langganan — satu sumber supaya nada + gaya konsisten (bukan disalin per halaman). Tampil
// hanya bila count > 0; CTA menuju halaman lanjut-bayar invoice pending pertama.
export function PendingPaymentBanner({ count, orderId }: { count: number; orderId?: string }) {
  if (count <= 0) return null;
  return (
    <Reveal>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <IconReceipt className="h-4 w-4" />
          </span>
          <p className="text-sm text-amber-800">
            Ada <strong>{count} pembayaran</strong> yang belum selesai. Aksesmu aktif otomatis begitu
            pembayaran dikonfirmasi.
          </p>
        </div>
        {orderId ? (
          <Link
            href={`/bayar/${orderId}`}
            className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
          >
            Lanjutkan pembayaran
          </Link>
        ) : null}
      </div>
    </Reveal>
  );
}
