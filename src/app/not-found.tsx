import Link from "next/link";
import { IconArrow } from "@/components/icons";

// Halaman 404 ramah: bantu user pulih dari salah alamat (H9) alih-alih layar kosong browser.
export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <div className="animate-rise w-full max-w-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/maubisa-logo.png"
          alt="Maubisa"
          width={130}
          height={35}
          className="mx-auto h-8 w-auto object-contain"
        />
        <div className="mt-8 text-[64px] font-bold leading-none tracking-tight text-brand-500">404</div>
        <h1 className="mt-4 text-xl font-bold text-ink">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Tautan mungkin salah, kedaluwarsa, atau halaman sudah dipindahkan. Yuk kembali ke pusat
          akun kamu.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 rounded-full bg-brand-500 py-2.5 pl-5 pr-2 text-sm font-semibold text-white shadow-brand transition-[transform,background-color] duration-300 hover:-translate-y-[1px] hover:bg-brand-600"
          >
            <span>Ke Ringkasan</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <IconArrow className="h-4 w-4" />
            </span>
          </Link>
          <a
            href="mailto:halo@maubisa.id"
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-soft ring-1 ring-black/[0.08] transition-colors hover:bg-zinc-50"
          >
            Hubungi bantuan
          </a>
        </div>
      </div>
    </main>
  );
}
