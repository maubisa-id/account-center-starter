"use client";

import { useMemo } from "react";
import { cx, sortCx } from "@/utils/cx";
import { GenericCardMark, PaypassIcon } from "./icons";
import { payIcon, bankLogo } from "@/lib/pay-assets";

// Aset kartu kredit dari Untitled UI (untitleduico/react, shared-assets/credit-card),
// di-vendor faithful. Tambahan starter: (1) varian "primary" bertema gradient navigasi
// (biru brand-500 -> brand-700), (2) prop `brand` untuk menampilkan logo jaringan yang
// TERDETEKSI (Visa/MC/JCB/Amex/UnionPay/Discover) di kotak kanan-bawah alih-alih Mastercard.
// Murni presentasional; tak menyimpan/mengirim data kartu.

const styles = sortCx({
  // Normal
  transparent: {
    root: "bg-black/10 bg-linear-to-br from-white/30 to-transparent backdrop-blur-[6px] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:ring-1 before:ring-white/30 before:ring-inset",
    company: "text-white",
    footerText: "text-white",
    paypassIcon: "text-white",
    cardTypeRoot: "bg-white/10",
  },
  "transparent-gradient": {
    root: "bg-black/10 bg-linear-to-br from-white/30 to-transparent backdrop-blur-[6px] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:ring-1 before:ring-white/30 before:ring-inset",
    company: "text-white",
    footerText: "text-white",
    paypassIcon: "text-white",
    cardTypeRoot: "bg-white/10",
  },
  // Gradient navigasi (biru brand) + tekstur halus. Dipakai di seluruh app.
  primary: {
    root: "bg-brand-700 bg-linear-to-br from-brand-500 via-brand-600 to-brand-800 shadow-[0_12px_30px_-14px_rgba(5,32,79,0.55)] before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:ring-1 before:ring-white/20 before:ring-inset",
    company: "text-white",
    footerText: "text-white",
    paypassIcon: "text-white/80",
    cardTypeRoot: "bg-white/10",
  },
  "brand-dark": {
    root: "bg-linear-to-tr from-brand-900 to-brand-700 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:ring-1 before:ring-white/30 before:ring-inset",
    company: "text-white",
    footerText: "text-white",
    paypassIcon: "text-white",
    cardTypeRoot: "bg-white/10",
  },
  "brand-light": {
    root: "bg-brand-100 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:ring-1 before:ring-black/10 before:ring-inset",
    company: "text-neutral-700",
    footerText: "text-neutral-700",
    paypassIcon: "text-white",
    cardTypeRoot: "bg-white",
  },
  "gray-dark": {
    root: "bg-linear-to-tr from-neutral-900 to-neutral-700 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:ring-1 before:ring-white/30 before:ring-inset",
    company: "text-white",
    footerText: "text-white",
    paypassIcon: "text-white",
    cardTypeRoot: "bg-white/10",
  },
  "gray-light": {
    root: "bg-neutral-100 before:pointer-events-none before:absolute before:inset-0 before:z-1 before:rounded-[inherit] before:ring-1 before:ring-black/10 before:ring-inset",
    company: "text-neutral-700",
    footerText: "text-neutral-700",
    paypassIcon: "text-neutral-400",
    cardTypeRoot: "bg-white",
  },
});

const CARD_WITH_COLOR_LOGO = ["brand-dark", "brand-light", "gray-dark", "gray-light"] as const;

export type CreditCardType = keyof typeof styles;

// Kelompokkan + samarkan nomor kartu untuk PRIVASI: tampilkan 4 digit AWAL & 4 digit AKHIR,
// digit tengah jadi bullet. Karakter bullet (•) dari input tersimpan dipertahankan. Slot kosong
// juga bullet, jadi bentuk kartu utuh sejak awal (tak ada "1234 1234..." palsu).
function formatDisplayNumber(raw: string, amex: boolean, mask: boolean): string {
  const chars = raw.replace(/[^0-9\u2022]/g, "");
  const total = amex ? 15 : 16;
  const sizes = amex ? [4, 6, 5] : [4, 4, 4, 4];
  const cells: string[] = [];
  for (let i = 0; i < total; i++) {
    const ch = chars[i];
    if (mask && i >= 4 && i < total - 4) {
      cells.push("\u2022"); // digit tengah selalu disamarkan
    } else {
      cells.push(ch && ch !== "\u2022" ? ch : "\u2022");
    }
  }
  const out: string[] = [];
  let idx = 0;
  for (const s of sizes) {
    out.push(cells.slice(idx, idx + s).join(""));
    idx += s;
  }
  return out.join("  ");
}

// Merek jaringan yang punya PNG di bucket pembayaran untuk override logo kartu.
const BRAND_LOGO: Record<string, string> = {
  visa: payIcon("visa.png"),
  mastercard: payIcon("mastercard.png"),
  jcb: payIcon("jcb.png"),
  amex: payIcon("amex.png"),
  unionpay: payIcon("unionpay.png"),
  discover: payIcon("discover.png"),
};

// Logo bank penerbit (dari kode bank BIN API) untuk chip kiri-atas kartu. Aset SVG di bucket
// subfolder logo-bank/ (via bankLogo). Bank Indonesia besar; slug kanonik dari bin.ts. Bank
// tanpa aset -> tak menampilkan logo (tetap rapi). Lisensi: penanda metode bayar (nominative use).
const BANK_SLUGS = [
  "bca", "bni", "bri", "bsi", "btn", "btpn", "cimb", "citibank", "commonwealth", "danamon",
  "dbs", "hsbc", "jago", "jenius", "mandiri", "maybank", "mega", "muamalat", "ocbc", "panin",
  "permata", "seabank", "sinarmas", "uob",
] as const;
const BANK_LOGO: Record<string, string> = Object.fromEntries(BANK_SLUGS.map((s) => [s, bankLogo(s)]));

interface CreditCardProps {
  company?: string;
  cardNumber?: string;
  cardHolder?: string;
  cardExpiration?: string;
  type?: CreditCardType;
  // Merek jaringan terdeteksi -> tampilkan logonya di kotak kanan-bawah. Bila tak dikenal,
  // jatuh ke penanda kartu netral.
  brand?: string;
  // Kode bank penerbit (BIN API, mis. "bca") -> logo bank di chip kiri-atas bila asetnya ada.
  bankCode?: string;
  // Samarkan digit tengah (privasi). Default true; set false bila memang perlu tampil penuh.
  mask?: boolean;
  className?: string;
  width?: number;
}

const calculateScale = (desiredWidth: number, originalWidth: number, originalHeight: number) => {
  const scale = desiredWidth / originalWidth;
  return {
    scale: Number(scale.toFixed(4)),
    scaledWidth: Number((originalWidth * scale).toFixed(2)),
    scaledHeight: Number((originalHeight * scale).toFixed(2)),
  };
};

export const CreditCard = ({
  company = "",
  cardNumber = "",
  cardHolder = "NAMA DI KARTU",
  cardExpiration = "\u2022\u2022/\u2022\u2022",
  type = "primary",
  brand,
  bankCode,
  mask = true,
  className,
  width,
}: CreditCardProps) => {
  const originalWidth = 316;
  const originalHeight = 190;

  const { scale, scaledWidth, scaledHeight } = useMemo(() => {
    if (!width) return { scale: 1, scaledWidth: originalWidth, scaledHeight: originalHeight };
    return calculateScale(width, originalWidth, originalHeight);
  }, [width]);

  const brandLogo = brand && brand !== "unknown" ? BRAND_LOGO[brand] : undefined;
  const bankLogo = bankCode ? BANK_LOGO[bankCode.toLowerCase()] : undefined;
  const displayNumber = formatDisplayNumber(cardNumber, brand === "amex", mask);
  const holderText = (cardHolder ?? "").trim();

  return (
    <div style={{ width: `${scaledWidth}px`, height: `${scaledHeight}px` }} className={cx("relative flex", className)}>
      <div
        style={{ transform: `scale(${scale})`, width: `${originalWidth}px`, height: `${originalHeight}px` }}
        className={cx(
          "absolute top-0 left-0 flex origin-top-left flex-col justify-between overflow-hidden rounded-2xl p-4",
          styles[type].root,
        )}
      >
        {/* Gradient diffusor (khas transparent-gradient Untitled) */}
        {type === "transparent-gradient" && (
          <div className="absolute -top-4 -left-4 grid grid-cols-2 blur-3xl">
            <div className="size-20 rounded-tl-full bg-pink-500 opacity-30" />
            <div className="size-20 rounded-tr-full bg-orange-500 opacity-50" />
            <div className="size-20 rounded-bl-full bg-blue-500 opacity-30" />
            <div className="size-20 rounded-br-full bg-green-500 opacity-30" />
          </div>
        )}

        {/* Tekstur brand: sheen kanan-atas, cincin konsentris kiri-bawah, sapuan cahaya
            diagonal. Murni dekoratif (pointer-events-none, z-0) — di belakang teks. */}
        {type === "primary" && (
          <>
            <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]">
              <div className="absolute -top-14 -right-8 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
              <div className="absolute -bottom-16 -left-10 h-44 w-44 rounded-full border border-white/10" />
              <div className="absolute -bottom-9 -left-3 h-32 w-32 rounded-full border border-white/[0.07]" />
              <div className="absolute inset-y-0 left-1/4 w-1/2 -skew-x-12 bg-linear-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>
            {/* Chip EMV (anatomi kartu; emas lembut dengan garis kontak) */}
            <div className="absolute top-[60px] left-4 z-[1] h-7 w-9">
              <div className="h-full w-full rounded-[5px] bg-linear-to-br from-amber-200 via-amber-300 to-amber-500 ring-1 ring-amber-600/30" />
              <div className="absolute inset-0 flex flex-col justify-evenly px-1">
                <span className="h-px bg-amber-800/25" />
                <span className="h-px bg-amber-800/25" />
                <span className="h-px bg-amber-800/25" />
              </div>
              <span className="absolute inset-y-1 left-1/2 w-px -translate-x-1/2 bg-amber-800/25" />
            </div>
          </>
        )}

        <div className="relative flex items-start justify-between px-1 pt-1">
          {bankLogo ? (
            <span className="flex h-8 items-center justify-center rounded-lg bg-white px-2 shadow-sm ring-1 ring-black/[0.06]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={bankLogo} alt={bankCode} className="h-5 w-auto max-w-[72px] object-contain" />
            </span>
          ) : (
            <div className={cx("text-base leading-[normal] font-semibold tracking-wide", styles[type].company)}>{company}</div>
          )}
          <PaypassIcon className={styles[type].paypassIcon} />
        </div>

        <div className="relative space-y-3.5">
          {/* Nomor kartu — baris sendiri, lebar penuh (tak menggeser elemen lain saat diisi). */}
          <div className={cx("text-base leading-[normal] font-semibold tracking-[1px] tabular-nums", styles[type].footerText)}>
            {displayNumber}
            {/* Placeholder tak terlihat agar tinggi baris nomor kartu selalu terjaga. */}
            <span className="pointer-events-none invisible inline-block w-0 max-w-0 opacity-0">1</span>
          </div>

          {/* Baris bawah: pemegang | berlaku | logo — kolom TETAP (berlaku tak ikut geser). */}
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              {holderText ? (
                <>
                  <div className={cx("mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-60", styles[type].footerText)}>
                    Pemegang
                  </div>
                  <p
                    style={{ wordBreak: "break-word" }}
                    className={cx("truncate text-xs leading-snug font-semibold tracking-[0.6px] uppercase", styles[type].footerText)}
                  >
                    {holderText}
                  </p>
                </>
              ) : null}
            </div>
            <div className="shrink-0">
              <div className={cx("mb-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-60", styles[type].footerText)}>
                Berlaku
              </div>
              <p className={cx("text-xs leading-none font-semibold tracking-[0.6px] tabular-nums", styles[type].footerText)}>
                {cardExpiration}
              </p>
            </div>
            <div
              className={cx(
                "flex h-8 w-[46px] shrink-0 items-center justify-center rounded",
                brandLogo ? "bg-white" : "bg-transparent",
              )}
            >
              {brandLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brandLogo} alt={brand} width={40} height={26} className="h-4 w-9 object-contain" />
              ) : CARD_WITH_COLOR_LOGO.includes(type as (typeof CARD_WITH_COLOR_LOGO)[number]) ? (
                // Placeholder NETRAL (bukan merek): jaringan belum terdeteksi.
                <GenericCardMark className="text-neutral-500" />
              ) : (
                <GenericCardMark className="text-white/70" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCard;
