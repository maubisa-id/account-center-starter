"use client";

import Link from "next/link";
import { Check, Loader2, XCircle, Clock } from "lucide-react";
import { usePaymentStatus } from "./use-payment-status";

// Tampilan hasil pembayaran di halaman "selesai" (Finish Redirect URL Midtrans).
// Dipakai untuk kembalinya kartu 3DS & Payment Link. Status dari query hanya petunjuk;
// yang otoritatif tetap webhook — di sini kita polling status resmi ke server.
export function FinishStatus({ orderId }: { orderId: string | null }) {
  const { status, checking, checkNow } = usePaymentStatus(orderId, { enabled: !!orderId });

  if (!orderId) {
    return (
      <div className="rounded-3xl border border-black/[0.06] bg-white p-8 text-center shadow-soft">
        <h1 className="text-xl font-bold text-ink">Pesanan tidak dikenali</h1>
        <p className="mt-2 text-sm text-zinc-500">Tautan tidak memuat nomor pesanan.</p>
        <Link
          href="/akses"
          className="mt-5 inline-block rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Ke halaman akses
        </Link>
      </div>
    );
  }

  const view =
    status === "paid"
      ? {
          icon: <Check className="h-7 w-7 text-lime-accent" />,
          title: "Pembayaran berhasil",
          desc: "Akses kamu sedang diaktifkan otomatis. Kamu bisa menutup halaman ini.",
        }
      : status === "failed" || status === "expired" || status === "cancelled"
        ? {
            icon: <XCircle className="h-7 w-7 text-red-500" />,
            title: "Pembayaran tidak selesai",
            desc: "Pembayaran gagal atau kedaluwarsa. Silakan ulangi dari katalog.",
          }
        : {
            icon: <Loader2 className="h-7 w-7 animate-spin text-brand-500" />,
            title: "Menunggu konfirmasi…",
            desc: "Kami sedang memastikan pembayaranmu. Halaman ini memperbarui otomatis.",
          };

  return (
    <div className="rounded-3xl border border-black/[0.06] bg-white p-8 text-center shadow-soft">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-100">
        {view.icon}
      </div>
      <h1 className="mt-4 text-xl font-bold text-ink">{view.title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{view.desc}</p>
      <div className="mt-3 text-xs text-zinc-500">No. pesanan: {orderId}</div>

      <div className="mt-6 flex flex-col gap-2">
        {status === "paid" ? (
          <Link
            href="/akses"
            className="inline-block rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Lihat akses saya
          </Link>
        ) : status === "failed" || status === "expired" || status === "cancelled" ? (
          <Link
            href="/langganan/ubah"
            className="inline-block rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Coba lagi
          </Link>
        ) : (
          <button
            type="button"
            onClick={checkNow}
            disabled={checking}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
          >
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
            Cek status
          </button>
        )}
      </div>
    </div>
  );
}
