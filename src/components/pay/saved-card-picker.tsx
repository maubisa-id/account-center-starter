"use client";

import CreditCard from "@/components/shared-assets/credit-card/credit-card";
import type { SavedCardLite } from "./payment-client";

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  jcb: "JCB",
  amex: "American Express",
  unionpay: "UnionPay",
  discover: "Discover",
};

function expLabel(m: number | null, y: number | null): string | undefined {
  if (!m || !y) return undefined;
  return `${String(m).padStart(2, "0")}/${String(y).slice(-2)}`;
}

// Pemilih kartu tersimpan di checkout (pengguna login). Menampilkan kartu-kartu yang sudah
// disimpan sebagai opsi cepat + baris "Pakai kartu lain" untuk memasukkan kartu baru. Token
// TIDAK ada di klien; membayar dengan kartu tersimpan mengirim id-nya, server yang memakai token.
export function SavedCardPicker({
  cards,
  choice,
  onChoice,
  disabled,
}: {
  cards: SavedCardLite[];
  choice: number | "new";
  onChoice: (v: number | "new") => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-4 space-y-2.5">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Kartu tersimpan</div>
      {cards.map((c) => {
        const active = choice === c.id;
        return (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            onClick={() => onChoice(c.id)}
            aria-pressed={active}
            className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-[border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:opacity-60 ${
              active ? "border-brand-500 bg-brand-50/60" : "border-black/[0.08] bg-white hover:border-brand-300"
            }`}
          >
            <CreditCard
              type="primary"
              brand={c.brand ?? undefined}
              bankCode={c.bankCode ?? undefined}
              cardHolder=" "
              cardNumber={c.last4 ? `${"\u2022".repeat(12)}${c.last4}` : undefined}
              cardExpiration={expLabel(c.expMonth, c.expYear)}
              width={72}
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">
                  {c.brand ? BRAND_LABEL[c.brand] ?? "Kartu" : "Kartu"}
                </span>
                {c.isPrimary ? (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-600/15">
                    Utama
                  </span>
                ) : null}
              </span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {c.last4 ? `\u2022\u2022\u2022\u2022 ${c.last4}` : "Kartu tersimpan"}
                {expLabel(c.expMonth, c.expYear) ? ` \u00b7 ${expLabel(c.expMonth, c.expYear)}` : ""}
              </span>
            </span>
            <span
              className={`h-4 w-4 shrink-0 rounded-full border-[5px] transition-colors ${
                active ? "border-brand-500" : "border-zinc-200"
              }`}
              aria-hidden="true"
            />
          </button>
        );
      })}

      <button
        type="button"
        disabled={disabled}
        onClick={() => onChoice("new")}
        aria-pressed={choice === "new"}
        className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-[border-color,background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:opacity-60 ${
          choice === "new" ? "border-brand-500 bg-brand-50/60" : "border-black/[0.08] bg-white hover:border-brand-300"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-ink">Pakai kartu lain</span>
          <span className="mt-0.5 block text-xs text-zinc-500">Masukkan nomor kartu baru</span>
        </span>
        <span
          className={`h-4 w-4 shrink-0 rounded-full border-[5px] transition-colors ${
            choice === "new" ? "border-brand-500" : "border-zinc-200"
          }`}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
