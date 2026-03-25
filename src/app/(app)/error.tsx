"use client";

import Link from "next/link";
import { useEffect } from "react";
import { IconWarn } from "@/components/icons";

// Error boundary segmen (app): tangkap error render/aksi server, beri jalan pulih (H9).
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log ke konsol; di produksi bisa dikirim ke layanan pemantauan.
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div className="mx-auto max-w-lg py-10">
      <div className="animate-rise rounded-3xl border border-rose-200 bg-rose-50/50 p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-rose-600 ring-1 ring-rose-200">
          <IconWarn className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-ink">Ada yang tidak beres</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Kami menemui kendala saat memuat halaman ini. Coba muat ulang. Bila masih berlanjut,
          hubungi{" "}
          <a href="mailto:halo@maubisa.id" className="font-semibold text-brand-600 hover:underline">
            halo@maubisa.id
          </a>
          .
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-brand transition-[transform,background-color] duration-300 hover:-translate-y-[1px] hover:bg-brand-600"
          >
            Coba lagi
          </button>
          <Link
            href="/"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-soft ring-1 ring-black/[0.08] transition-colors hover:bg-zinc-50"
          >
            Ke Ringkasan
          </Link>
        </div>
        {isDev ? (
          <pre className="mt-5 max-h-40 overflow-auto rounded-2xl bg-ink p-4 text-left text-xs text-white/80">
            {error.message}
            {error.digest ? `\n\ndigest: ${error.digest}` : ""}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
