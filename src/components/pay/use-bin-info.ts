"use client";

import { useEffect, useState } from "react";

export type BinResult = { bank: string | null; bankCode?: string | null; brand: string | null; binType: string | null } | null;

// Ambil info BIN (bank penerbit + tipe) dari nomor kartu yang diketik, via proxy server kita.
// Debounce supaya tak spam saat mengetik; hanya jalan bila >= 8 digit (BIN stabil). Membatalkan
// permintaan usang (AbortController) agar hasil yang tampil selalu untuk nomor terakhir.
export function useBinInfo(cardNumber: string): { info: BinResult; loading: boolean } {
  const digits = cardNumber.replace(/\D/g, "");
  const bin = digits.slice(0, 8);
  const enough = digits.length >= 8;
  const [info, setInfo] = useState<BinResult>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enough) {
      // Reset lewat microtask agar bukan setState sinkron di body effect (aturan React).
      let active = true;
      queueMicrotask(() => {
        if (active) {
          setInfo(null);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pay/bin/${bin}`, { signal: ctrl.signal, cache: "no-store" });
        if (!res.ok) {
          setInfo(null);
          return;
        }
        const data = (await res.json()) as BinResult;
        setInfo(data && (data.bank || data.brand) ? data : null);
      } catch {
        /* dibatalkan / jaringan sesaat — abaikan */
      } finally {
        setLoading(false);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [bin, enough]);

  return { info, loading };
}
