import { IconCheck } from "@/components/icons";

// Lapisan kepercayaan untuk guest checkout: pembeli bisa mendarat di /beli langsung dari
// iklan tanpa pernah melihat maubisa.id, jadi halaman bayar harus meyakinkan sendiri.
// Sinyalnya SEMUA verifiable & sudah publik (badan hukum, terdaftar KOMDIGI, keamanan
// Midtrans) — bukan klaim baru. Nada tenang (permukaan uang).
//
// Catatan template: bila memakai ulang, ganti nama badan hukum, nomor WhatsApp, dan poin
// kepercayaan di bawah dengan milik Anda sendiri.

const POINTS = [
  "Diselenggarakan PT Litera Edu Solusi, penyelenggara sistem elektronik terdaftar KOMDIGI.",
  "Pembayaran diproses aman oleh Midtrans (payment gateway berlisensi BI) dengan 3D Secure.",
];

const WA_URL =
  "https://wa.me/62811134069?text=" +
  encodeURIComponent("Halo MinBi, aku mau tanya soal pembayaran di sini. Boleh dibantu?");

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
        <div className="text-xs text-zinc-500">
          Dipercaya mahasiswa &amp; mitra kampus di berbagai kota di Indonesia.
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
