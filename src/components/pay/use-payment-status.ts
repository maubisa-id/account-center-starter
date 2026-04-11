"use client";

import { useEffect, useRef, useState } from "react";

// Status pembayaran yang mungkin dikembalikan endpoint /api/pay/status/[orderId].
export type PayStatus = "pending" | "paid" | "failed" | "expired" | "cancelled" | "refunded";

const TERMINAL: PayStatus[] = ["paid", "failed", "expired", "cancelled", "refunded"];

// Polling status pembayaran. Core API tidak punya callback popup seperti Snap, jadi UI
// mengecek status berkala sampai terminal. Berhenti otomatis saat lunas/gagal/kedaluwarsa
// atau saat komponen di-unmount. onPaid dipanggil sekali ketika status jadi "paid".
export function usePaymentStatus(
  orderId: string | null,
  opts: { enabled: boolean; intervalMs?: number; onPaid?: () => void },
): { status: PayStatus; checking: boolean; checkNow: () => void } {
  const { enabled, intervalMs = 5000, onPaid } = opts;
  const [status, setStatus] = useState<PayStatus>("pending");
  const [checking, setChecking] = useState(false);
  const paidFired = useRef(false);
  const onPaidRef = useRef(onPaid);
  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  useEffect(() => {
    if (!enabled || !orderId) return;
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const check = async () => {
      if (!alive) return;
      setChecking(true);
      try {
        const res = await fetch(`/api/pay/status/${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as { status?: PayStatus };
        if (!alive || !data.status) return;
        setStatus(data.status);
        if (data.status === "paid" && !paidFired.current) {
          paidFired.current = true;
          onPaidRef.current?.();
        }
        // Berhenti polling begitu status terminal (lunas/gagal/kedaluwarsa) — hemat
        // permintaan ke server & Midtrans.
        if (TERMINAL.includes(data.status)) stop();
      } catch {
        /* jaringan sesaat — coba lagi pada tick berikutnya */
      } finally {
        if (alive) setChecking(false);
      }
    };

    void check();
    timer = setInterval(() => {
      void check();
    }, intervalMs);

    return () => {
      alive = false;
      stop();
    };
  }, [enabled, orderId, intervalMs]);

  const checkNow = () => {
    if (!orderId) return;
    setChecking(true);
    fetch(`/api/pay/status/${encodeURIComponent(orderId)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { status?: PayStatus }) => {
        if (d.status) {
          setStatus(d.status);
          if (d.status === "paid" && !paidFired.current) {
            paidFired.current = true;
            onPaidRef.current?.();
          }
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  };

  return { status, checking, checkNow };
}
