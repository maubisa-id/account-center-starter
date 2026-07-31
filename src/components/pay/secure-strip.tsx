import { IconLock } from "@/components/icons";

// Strip jaminan di bawah tombol bayar. Dua baris rapi (bukan satu kalimat panjang yang
// membungkus tak sejajar): baris-1 badan hukum + otoritas terkait, baris-2 logo Midtrans + 3D Secure.
// Tiap baris inline-flex items-center supaya ikon/logo benar-benar sejajar vertikal dgn teks.
export function SecureStrip({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-1.5 text-center ${className}`}>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        <IconLock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Acme Inc · Terdaftar otoritas terkait
      </span>
      <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 text-xs font-medium text-zinc-500">
        Pembayaran diamankan
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pay/midtrans.png"
          alt="Midtrans"
          width={80}
          height={14}
          className="h-3.5 w-auto translate-y-[0.5px] object-contain"
        />
        <span>(3D Secure)</span>
      </span>
    </div>
  );
}
