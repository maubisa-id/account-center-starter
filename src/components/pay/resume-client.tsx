"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import type { PaymentInstruction } from "@/lib/midtrans/types";
import { PaymentInstructions } from "./payment-instructions";
import { usePaymentStatus } from "./use-payment-status";

// Pembungkus klien untuk halaman /bayar/[orderId] (resume). Menampilkan ulang instruksi
// bayar yang tersimpan (mis. nomor VA) + polling status. Dipakai pengguna login yang
// menutup tab lalu kembali menyelesaikan pembayaran (VA bisa dibayar berjam-jam kemudian).
export function PaymentResume({
  instruction,
  orderId,
  successUrl,
}: {
  instruction: PaymentInstruction;
  orderId: string;
  successUrl: string;
}) {
  const [cancelling, setCancelling] = useState(false);
  const { status, checking, checkNow } = usePaymentStatus(orderId, {
    enabled: true,
    onPaid: () => {
      setTimeout(() => {
        window.location.href = successUrl;
      }, 1200);
    },
  });

  // Batal bayar dari halaman resume: batalkan di Midtrans lalu kembali ke riwayat pembayaran.
  const cancel = useCallback(async () => {
    setCancelling(true);
    try {
      await fetch(`/api/pay/cancel/${encodeURIComponent(orderId)}`, { method: "POST" });
    } catch {
      /* abaikan; tetap arahkan ke riwayat */
    } finally {
      window.location.href = "/pembayaran";
    }
  }, [orderId]);

  return (
    <div>
      <PaymentInstructions
        instruction={instruction}
        status={status}
        checking={checking}
        onCheckNow={checkNow}
        onCancel={cancel}
        cancelling={cancelling}
      />
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>No. pesanan: {orderId}</span>
        <Link href="/pembayaran" className="font-semibold text-brand-600 hover:underline">
          Riwayat pembayaran
        </Link>
      </div>
    </div>
  );
}
