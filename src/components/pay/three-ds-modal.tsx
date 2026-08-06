"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";
import { authenticate3ds, type ThreeDsOutcome, type CardNetwork } from "@/lib/midtrans-card";
import { IconShieldCheck, IconLock, IconClose } from "@/components/icons";
import { payIcon } from "@/lib/pay-assets";

// Modal verifikasi 3D Secure 2.0 (EMV 3DS) IN-PAGE. Isi di dalam iframe adalah halaman ACS
// milik BANK PENERBIT (di sandbox: simulator Midtrans). Konten itu lintas-origin dan tak bisa
// kita gaya, memang begitu desain EMVCo: hanya bank yang boleh merender langkah otentikasinya.
// Yang kita rapikan adalah BINGKAI-nya (chrome bermerek aplikasi) supaya pembeli tak merasa
// terlempar keluar: perisai, judul, merek program 3DS sesuai kartu, dan jaminan Midtrans.
// Hasil dilaporkan lewat callback authenticate() (js_event); "pending" = asinkron, jadi
// keputusan final diserahkan ke polling status backend (webhook = sumber kebenaran).

// Merek PROGRAM 3D Secure per jaringan (bukan sekadar logo kartu). Hanya Visa & Mastercard
// yang punya aset merek program di pustaka; jaringan lain memakai logo kartunya + lencana
// "3-D Secure" generik (jujur, tetap per-kartu). Diselaraskan dengan kartu yang dipakai.
const PROGRAM_MARK: Partial<Record<CardNetwork["id"], { src: string; alt: string }>> = {
  visa: { src: payIcon("visa-secure.png"), alt: "Verified by Visa" },
  mastercard: { src: payIcon("mc-securecode.png"), alt: "Mastercard SecureCode" },
};

// Tampilkan jaminan 3DS sesuai jaringan kartu yang terdeteksi.
function NetworkAssurance({ network }: { network?: CardNetwork }) {
  const program = network ? PROGRAM_MARK[network.id] : undefined;
  if (program) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={program.src} alt={program.alt} width={64} height={20} className="h-5 w-auto object-contain" />;
  }
  if (network?.logo) {
    return (
      <span className="inline-flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={network.logo} alt={network.label} width={36} height={22} className="h-4 w-9 object-contain" />
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
          3-D Secure
        </span>
      </span>
    );
  }
  // Kartu belum terdeteksi: tampilkan dua merek umum sebagai penenang.
  return (
    <span className="flex items-center gap-2 opacity-80">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={payIcon("visa-secure.png")} alt="Verified by Visa" width={56} height={20} className="h-5 w-auto object-contain" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={payIcon("mc-securecode.png")} alt="Mastercard SecureCode" width={56} height={20} className="h-5 w-auto object-contain" />
    </span>
  );
}

export function ThreeDsModal({
  redirectUrl,
  clientKey,
  isProduction,
  amountLabel,
  network,
  onResolved,
  onCancel,
}: {
  redirectUrl: string;
  clientKey: string;
  isProduction: boolean;
  amountLabel: string;
  // Jaringan kartu yang dipakai; menentukan merek program 3DS yang ditampilkan.
  network?: CardNetwork;
  onResolved: (outcome: ThreeDsOutcome) => void;
  onCancel: () => void;
}) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    authenticate3ds(clientKey, isProduction, redirectUrl, (url) => setIframeUrl(url))
      .then(onResolved)
      .catch(() => setFailed(true));
  }, [clientKey, isProduction, redirectUrl, onResolved]);

  // Kunci scroll body selama modal terbuka.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!mounted) return null;

  // Portal ke <body>: modal 3DS bisa dirender di dalam ancestor ber-transform (mis. Reveal /
  // animate-rise dgn fill-mode both). position:fixed di dalam transform jadi relatif ke ancestor,
  // bukan viewport -> modal terjebak. Portal membebaskannya (kritikal untuk verifikasi kartu).
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop TANPA klik-tutup: verifikasi 3DS adalah langkah kritikal; klik tak sengaja
          di luar tak boleh membatalkannya. Tutup hanya via tombol X eksplisit. */}
      <div className="absolute inset-0 bg-brand-900/50 backdrop-blur-sm" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Verifikasi 3D Secure"
        className="animate-rise relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-lift ring-1 ring-black/[0.06]"
      >
        <div className="flex items-start gap-3 border-b border-black/[0.06] bg-gradient-to-b from-brand-50 to-white px-5 py-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-brand">
            <IconShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-ink">Verifikasi dari bankmu</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
              Langkah aman untuk membayar {amountLabel}. Halaman di bawah dari bank penerbit kartumu.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup verifikasi"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <div className="relative min-h-[420px] flex-1 bg-cream-50">
          {failed ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm leading-relaxed text-zinc-600">
                Verifikasi tidak bisa dimuat di halaman ini. Lanjutkan di tab baru, halaman ini
                akan otomatis melanjutkan setelah kamu selesai.
              </p>
              <a
                href={redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
              >
                <IconShieldCheck className="h-4 w-4" /> Buka verifikasi di tab baru
              </a>
            </div>
          ) : iframeUrl ? (
            <iframe
              title="Halaman verifikasi 3D Secure bank"
              src={iframeUrl}
              className="h-full w-full border-0"
              style={{ minHeight: 420 }}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
              <p className="text-sm text-zinc-500">Menghubungkan ke bankmu…</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] px-5 py-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
            <IconLock className="h-3.5 w-3.5 shrink-0" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={payIcon("midtrans.png")} alt="Midtrans" width={80} height={14} className="h-3.5 w-auto object-contain" />
          </span>
          <NetworkAssurance network={network} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
