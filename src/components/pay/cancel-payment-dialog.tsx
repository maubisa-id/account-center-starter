"use client";

import { Loader2 } from "lucide-react";
import { Modal } from "@/components/dashboard/modal";
import { IconClose } from "@/components/icons";

// Dialog konfirmasi BATAL bayar — dipakai bersama oleh layar checkout (saat menunggu
// QR/VA) dan tabel pembayaran/langganan. Sengaja MODAL, bukan kartu inline: membatalkan
// pembayaran adalah keputusan destruktif yang butuh fokus sesaat, dan modal tidak
// menggeser konten di belakangnya (inline card menggeser layout — terasa "loncat").
export function CancelPaymentDialog({
  open,
  onClose,
  onConfirm,
  cancelling,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cancelling?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Batalkan pembayaran?"
      desc="Instruksi bayar (VA/QR/tagihan) ini akan dinonaktifkan. Kamu tetap bisa memesan lagi kapan saja."
    >
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={cancelling}
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-60"
        >
          Tidak, lanjut bayar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={cancelling}
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-rose-accent px-5 py-2.5 text-sm font-semibold text-white transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 disabled:opacity-70"
        >
          {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <IconClose className="h-4 w-4" />}
          Ya, batalkan
        </button>
      </div>
    </Modal>
  );
}
