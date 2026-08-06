"use client";

import { useState } from "react";
import { BRAND } from "@/lib/brand";

// Aksi "kirim ulang email" di halaman /terima-kasih (§5 handoff). Memakai orderId (dibawa
// dari alur bayar tamu) supaya server bisa menargetkan email pembeli tanpa menerima alamat
// dari klien. Tanpa orderId, jatuh ke kontak dukungan (tak bisa menargetkan akun yang tepat).
export function ResendAccessEmail({ orderId }: { orderId: string | null }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function resend() {
    if (!orderId || state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/pay/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      setState(res.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  if (!orderId) {
    return (
      <p className="mt-6 text-xs text-zinc-400">
        Belum menerima email dalam 15 menit? Cek folder spam atau hubungi{" "}
        <a href={`mailto:${BRAND.supportEmail}`} className="font-medium text-brand-600 hover:underline">
          {BRAND.supportEmail}
        </a>
        .
      </p>
    );
  }

  return (
    <p className="mt-6 text-xs text-zinc-400">
      Belum menerima email dalam 15 menit? Cek folder spam, atau{" "}
      {state === "sent" ? (
        <span className="font-medium text-lime-700">email sudah dikirim ulang. Cek kotak masukmu.</span>
      ) : (
        <button
          type="button"
          onClick={resend}
          disabled={state === "sending"}
          className="font-medium text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60"
        >
          {state === "sending" ? "Mengirim ulang…" : "kirim ulang email"}
        </button>
      )}
      {state === "error" ? <span className="text-rose-600"> Gagal. Coba lagi sebentar.</span> : null}
    </p>
  );
}
