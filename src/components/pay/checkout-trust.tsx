import { IconCheck } from "@/components/icons";

// Lapisan kepercayaan untuk guest checkout: pembeli bisa mendarat di /beli langsung dari
// iklan tanpa pernah melihat situs utama, jadi halaman bayar harus meyakinkan sendiri.
// Isi sinyal kepercayaan dengan hal yang VERIFIABLE untuk bisnismu (badan hukum, lisensi,
// mitra) — jangan klaim kosong. Nada tenang (permukaan uang).

// (Template) Logo mitra opsional. Kosongkan atau isi dengan aset milikmu sendiri di
// /public/partners. Bila kosong, blok logo tidak dirender.
const CAMPUS: { alt: string; src: string }[] = [];

const POINTS = [
  "Diselenggarakan oleh badan hukum resmi (ganti dengan nama perusahaanmu).",
  "Pembayaran diproses aman oleh Midtrans (payment gateway berlisensi BI) dengan 3D Secure.",
];

const WA_URL =
  "https://wa.me/620000000000?text=" +
  encodeURIComponent("Halo, aku mau tanya soal pembayaran. Boleh dibantu?");

export function CheckoutTrust() {
  return (
    <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-soft sm:p-8">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
        Aman &amp; tepercaya
      </div>

      <ul className="mt-4 space-y-2.5">
        {POINTS.map((p) => (
          <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-600">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-lime-100 text-lime-700">
              <IconCheck className="h-3 w-3" />
            </span>
            {p}
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t border-zinc-100 pt-4">
        <div className="text-xs text-zinc-500">Dipercaya mahasiswa &amp; mitra kampus di berbagai kota</div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
          {CAMPUS.map((c) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={c.src}
              src={c.src}
              alt={c.alt}
              loading="lazy"
              width={96}
              height={96}
              className="h-7 w-auto opacity-70 grayscale transition-[opacity,filter] hover:opacity-100 hover:grayscale-0"
            />
          ))}
        </div>
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Ada pertanyaan sebelum bayar?{" "}
        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-brand-600 hover:underline"
        >
          Chat tim kami di WhatsApp
        </a>
        .
      </p>
    </div>
  );
}
