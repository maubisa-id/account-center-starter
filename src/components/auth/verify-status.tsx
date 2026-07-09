"use client";

import { Check, Loader2 } from "lucide-react";

// Kartu status verifikasi bergaya SAMA dengan hasil pembayaran (finish-status.tsx): ikon di
// dalam kotak membulat + judul + deskripsi. Dipakai ulang di modal verifikasi email (daftar &
// /profil) supaya pengalamannya konsisten. state "verifying" -> spinner; "success" -> centang.
export function VerifyStatusCard({
  state,
  title,
  desc,
}: {
  state: "verifying" | "success";
  title: string;
  desc: string;
}) {
  return (
    <div className="py-2 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-100">
        {state === "success" ? (
          <Check className="h-7 w-7 text-lime-accent" />
        ) : (
          <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
        )}
      </div>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{desc}</p>
    </div>
  );
}
