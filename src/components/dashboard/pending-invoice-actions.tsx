"use client";

// impeccable-disable gray-on-color -- tombol batal (X): rest text-zinc-500 di atas putih;
// bg-red-50 hanya muncul saat hover BERSAMA text-red-600, jadi abu-abu & latar merah tak
// pernah koeksis (verified false-positive, dua penilai).

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrow, IconClose } from "@/components/icons";
import { useToast } from "@/components/toast";
import { CancelPaymentDialog } from "@/components/pay/cancel-payment-dialog";

// Aksi untuk invoice "pending" di tabel /pembayaran & /langganan: tombol Bayar (lanjut ke
// halaman instruksi) + Batalkan. Membatalkan memanggil /api/pay/cancel (verifikasi
// kepemilikan + membatalkan transaksi di Midtrans), lalu me-refresh daftar.
//
// PENTING (anti layout-shift): kedua state (default & konfirmasi) dibungkus rail dengan
// LEBAR & TINGGI TETAP, dan tombol "Ya" berlebar tetap (spinner saat proses, bukan teks
// yang memanjang). Jadi menekan Batalkan → Ya tidak pernah menggeser konten sel/baris lain
// (masalah sebelumnya: cluster tombol bergeser tiap ganti state / saat loading).
export function PendingInvoiceActions({
  orderId,
  align = "end",
}: {
  orderId: string;
  // Perataan isi di dalam rail lebar-tetap. "end" untuk kolom aksi rata-kanan (/pembayaran);
  // "start" agar menempel setelah badge tanpa celah (/langganan).
  align?: "start" | "end";
}) {
  const router = useRouter();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, startRefresh] = useTransition();
  const [cancelling, setCancelling] = useState(false);
  const busy = cancelling || pending;

  const doCancel = useCallback(async () => {
    setCancelling(true);
    const res = await fetch(`/api/pay/cancel/${encodeURIComponent(orderId)}`, {
      method: "POST",
    }).catch(() => null);
    setCancelling(false);
    if (res && res.ok) {
      setConfirming(false);
      toast.show("Pesanan dibatalkan.", "info");
      startRefresh(() => router.refresh());
      return;
    }
    toast.show("Gagal membatalkan pesanan. Coba lagi.", "error");
  }, [orderId, router, toast]);

  const justify = align === "end" ? "justify-end" : "justify-start";

  return (
    <>
      <div className={`flex h-10 items-center gap-2 ${justify} ${align === "end" ? "ml-auto" : ""}`}>
        <Link
          href={`/bayar/${orderId}`}
          className="group inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        >
          Bayar
          <IconArrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          aria-label={`Batalkan pesanan ${orderId}`}
          title="Batalkan pesanan"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 ring-1 ring-black/[0.06] transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
        >
          <IconClose className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Konfirmasi batal — modal fokus, konsisten dgn checkout (tak menggeser baris tabel) */}
      <CancelPaymentDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={doCancel}
        cancelling={busy}
      />
    </>
  );
}
