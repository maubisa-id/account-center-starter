import type { PayMethodId } from "@/lib/midtrans/types";
import { IconCard } from "@/components/icons";

// Penanda merek metode pembayaran. Logo bank & jaringan kartu memakai pustaka SVG
// idn-finlogos (hafidznoor/idn-finlogos) — logo resmi teroptimasi; dipilih varian TERBARU
// bila bank sudah redesain (BRI 2020, Permata) dan minimalis untuk sisanya. QRIS tetap
// memakai logo resmi Bank Indonesia (berwarna) karena varian idn-finlogos monokrom.
// Logo berupa WORDMARK melebar → ditaruh di chip lebar-tetap dgn TINGGI logo konsisten
// (bukan kotak kecil yang bikin wordmark tampak mungil).

// Berkas logo per metode (di public/pay/). Di-raster dari SVG idn-finlogos ke PNG transparan
// (PNG lebih andal sebagai gambar lintas browser; SVG idn-finlogos dioptimasi untuk inline/React).
const LOGO_SRC: Record<Exclude<PayMethodId, "card">, string> = {
  qris: "/pay/qris.png",
  gopay: "/pay/gopay.png",
  shopeepay: "/pay/shopeepay.png",
  bca: "/pay/bca.png",
  bni: "/pay/bni.png",
  bri: "/pay/bri.png",
  cimb: "/pay/cimb.png",
  permata: "/pay/permata.png",
  mandiri: "/pay/mandiri.png",
};

const LABEL: Record<PayMethodId, string> = {
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  bca: "BCA",
  bni: "BNI",
  bri: "BRI",
  cimb: "CIMB Niaga",
  permata: "PermataBank",
  mandiri: "Bank Mandiri",
  card: "Kartu Kredit / Debit",
};

export function BrandLogo({ id, className }: { id: PayMethodId; className?: string }) {
  // Chip lebar-tetap (default 56×36) supaya kolom teks di daftar metode tetap sejajar.
  const box =
    "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/[0.05] " +
    (className ?? "h-9 w-14");

  // Kartu: pakai ikon kartu netral (bukan logo satu jaringan spt Visa) — semua penerbit
  // & jaringan didukung, jadi ikon generik lebih jujur daripada menonjolkan satu merek.
  if (id === "card") {
    return (
      <span className={box} aria-label={LABEL.card} role="img">
        <IconCard className="h-5 w-5 text-brand-600" />
      </span>
    );
  }

  return (
    <span className={box}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_SRC[id]}
        alt={LABEL[id]}
        className="h-full w-full object-contain px-1.5 py-1.5"
        loading="lazy"
      />
    </span>
  );
}
