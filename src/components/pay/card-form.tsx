"use client";

import { useMemo } from "react";
import { detectCardNetwork, type CardInput } from "@/lib/midtrans-card";
import { IconShieldCheck, IconCard } from "@/components/icons";
import CreditCard from "@/components/shared-assets/credit-card/credit-card";
import { payIcon } from "@/lib/pay-assets";
import { useBinInfo } from "./use-bin-info";

// Form input kartu (Core API 3DS). Data kartu HANYA dipakai untuk tokenisasi di
// browser (getCardToken) lalu dibuang, tak pernah dikirim/disimpan di server kita.
const inputCls =
  "w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";

const labelCls = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500";

// Jaringan yang diterima, ditampilkan sebagai lencana kecil di kepala form.
const ACCEPTED = [
  { id: "visa", src: payIcon("visa.png"), alt: "Visa" },
  { id: "mastercard", src: payIcon("mastercard.png"), alt: "Mastercard" },
  { id: "jcb", src: payIcon("jcb.png"), alt: "JCB" },
] as const;

function onlyDigits(v: string, max: number) {
  return v.replace(/\D/g, "").slice(0, max);
}

function formatCardNumber(v: string, amex: boolean) {
  const d = onlyDigits(v, amex ? 15 : 16);
  const groups = amex ? [4, 6, 5] : [4, 4, 4, 4];
  const out: string[] = [];
  let i = 0;
  for (const g of groups) {
    if (i >= d.length) break;
    out.push(d.slice(i, i + g));
    i += g;
  }
  return out.join(" ");
}

export function CardForm({
  value,
  onChange,
  disabled,
  buyerName,
  canSave,
  save,
  onToggleSave,
}: {
  value: CardInput;
  onChange: (v: CardInput) => void;
  disabled?: boolean;
  // Nama pembeli (dari sesi/isian) untuk mengisi awal nama di kartu, mempercantik pratinjau
  // dan menaikkan peluang 3DS frictionless. Boleh ditimpa pengguna.
  buyerName?: string;
  // Opsi simpan kartu (hanya untuk pengguna login; tamu belum punya akun saat checkout).
  canSave?: boolean;
  save?: boolean;
  onToggleSave?: (v: boolean) => void;
}) {
  const net = useMemo(() => detectCardNetwork(value.number), [value.number]);
  const { info: bin } = useBinInfo(value.number);
  const previewName = value.name ?? buyerName ?? "";
  const expLabel =
    value.expMonth || value.expYear
      ? `${(value.expMonth || "\u2022\u2022").padStart(2, "0").slice(0, 2)}/${
          value.expYear ? value.expYear.slice(-2).padStart(2, "0") : "\u2022\u2022"
        }`
      : undefined;

  return (
    <div className="mt-4 space-y-4 rounded-3xl border border-black/[0.06] bg-gradient-to-b from-white to-cream-50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-100">
          <IconShieldCheck className="h-3.5 w-3.5" /> Diamankan 3-D Secure
        </span>
        <span className="flex items-center gap-1.5">
          {ACCEPTED.map((m) => (
            <span
              key={m.id}
              className="flex h-5 w-8 items-center justify-center rounded bg-white ring-1 ring-black/[0.05]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.src} alt={m.alt} width={36} height={22} className="max-h-3 max-w-[26px] object-contain" />
            </span>
          ))}
        </span>
      </div>

      {/* Pratinjau kartu hidup (aset Untitled UI, varian gradient navigasi brand) */}
      <div className="flex justify-center">
        <CreditCard
          type="primary"
          cardNumber={value.number || undefined}
          cardHolder={previewName || undefined}
          cardExpiration={expLabel}
          brand={net.id}
          bankCode={bin?.bankCode ?? undefined}
          width={320}
        />
      </div>

      {/* Nomor kartu */}
      <div>
        <label htmlFor="c-num" className={labelCls}>
          Nomor kartu
        </label>
        <div className="relative">
          <input
            id="c-num"
            inputMode="numeric"
            autoComplete="cc-number"
            value={value.number}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, number: formatCardNumber(e.target.value, net.id === "amex") })}
            placeholder="1234 1234 1234 1234"
            className={`${inputCls} pr-14`}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
            {net.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={net.logo} alt={net.label} width={44} height={28} className="h-5 w-10 object-contain" />
            ) : (
              <IconCard className="h-5 w-5 text-zinc-300" />
            )}
          </span>
        </div>
        {/* Bank penerbit terdeteksi dari BIN (advisory). Muncul begitu >= 8 digit. */}
        {bin?.bank ? (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime-accent" />
            {bin.bank}
            {bin.binType ? <span className="text-zinc-400">· {bin.binType === "debit" ? "Debit" : "Kredit"}</span> : null}
          </p>
        ) : null}
      </div>

      {/* Nama di kartu */}
      <div>
        <label htmlFor="c-name" className={labelCls}>
          Nama di kartu
        </label>
        <input
          id="c-name"
          autoComplete="cc-name"
          value={value.name ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ ...value, name: e.target.value.replace(/[^\p{L}\s.'-]/gu, "").slice(0, 40) })}
          placeholder={buyerName || "Nama sesuai kartu"}
          className={inputCls}
        />
      </div>

      {/* Masa berlaku + CVV */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="c-mm" className={labelCls}>
            Masa berlaku
          </label>
          <div className="flex items-center gap-2">
            <input
              id="c-mm"
              inputMode="numeric"
              autoComplete="cc-exp-month"
              value={value.expMonth}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, expMonth: onlyDigits(e.target.value, 2) })}
              placeholder="MM"
              aria-label="Bulan kedaluwarsa (MM)"
              className={`${inputCls} w-16 text-center`}
            />
            <span className="text-zinc-300" aria-hidden="true">
              /
            </span>
            <input
              id="c-yy"
              inputMode="numeric"
              autoComplete="cc-exp-year"
              value={value.expYear}
              disabled={disabled}
              onChange={(e) => onChange({ ...value, expYear: onlyDigits(e.target.value, 4) })}
              placeholder="YY"
              aria-label="Tahun kedaluwarsa (YY)"
              className={`${inputCls} w-16 text-center`}
            />
          </div>
        </div>
        <div className="w-24">
          <label htmlFor="c-cvv" className={labelCls}>
            CVV
          </label>
          <input
            id="c-cvv"
            inputMode="numeric"
            autoComplete="cc-csc"
            value={value.cvv}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, cvv: onlyDigits(e.target.value, 4) })}
            placeholder="123"
            className={`${inputCls} text-center`}
          />
        </div>
      </div>

      {/* Simpan kartu (opsi, hanya pengguna login). Token aman dari Midtrans yang disimpan,
          bukan nomor kartu; dipakai untuk checkout & perpanjangan berikutnya lebih cepat. */}
      {canSave ? (
        <label
          htmlFor="c-save"
          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/[0.06] bg-white p-3.5 transition-colors hover:border-brand-300"
        >
          <input
            id="c-save"
            type="checkbox"
            checked={!!save}
            disabled={disabled}
            onChange={(e) => onToggleSave?.(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 text-brand-500 accent-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">Simpan kartu ini</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">
              Bayar berikutnya cukup sekali klik. Yang kami simpan hanya token aman dari Midtrans, bukan nomor kartumu.
            </span>
          </span>
        </label>
      ) : null}
    </div>
  );
}
