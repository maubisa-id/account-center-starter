"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Star, Trash2, X } from "lucide-react";
import { registerCard, detectCardNetwork } from "@/lib/midtrans-card";
import { useBinInfo } from "@/components/pay/use-bin-info";
import { IconCard as CardIcon } from "@/components/icons";
import CreditCard from "@/components/shared-assets/credit-card/credit-card";

export type SavedMethod = {
  id: number;
  brand: string | null;
  bankCode: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isPrimary: boolean;
};

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  jcb: "JCB",
  amex: "American Express",
  unionpay: "UnionPay",
  discover: "Discover",
};

function onlyDigits(v: string, max: number) {
  return v.replace(/\D/g, "").slice(0, max);
}
function formatNumber(v: string) {
  return onlyDigits(v, 16).replace(/(.{4})/g, "$1 ").trim();
}
function expLabel(m: number | null, y: number | null) {
  if (!m || !y) return null;
  return `${String(m).padStart(2, "0")}/${String(y).slice(-2)}`;
}

export function PaymentMethodsManager({
  initialMethods,
  configured,
  clientKey,
  isProduction,
}: {
  initialMethods: SavedMethod[];
  configured: boolean;
  clientKey: string;
  isProduction: boolean;
}) {
  const router = useRouter();
  const [methods, setMethods] = useState<SavedMethod[]>(initialMethods);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);

  async function setPrimary(id: number) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/payment-methods/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primary: true }),
      });
      if (res.ok) {
        setMethods((prev) => prev.map((m) => ({ ...m, isPrimary: m.id === id })));
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMethods((prev) => {
          const next = prev.filter((m) => m.id !== id);
          // Bila yang dihapus utama, promosikan yang teratas tersisa (server juga melakukan ini).
          if (!next.some((m) => m.isPrimary) && next[0]) next[0] = { ...next[0], isPrimary: true };
          return next;
        });
        router.refresh();
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {methods.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {methods.map((m) => (
            <div
              key={m.id}
              className={`rounded-3xl border bg-white p-4 shadow-soft transition-colors ${
                m.isPrimary ? "border-brand-500/40" : "border-black/[0.06]"
              }`}
            >
              <CreditCard
                type="maubisa"
                brand={m.brand ?? undefined}
                bankCode={m.bankCode ?? undefined}
                cardHolder=" "
                cardNumber={m.last4 ? `${"\u2022".repeat(12)}${m.last4}` : undefined}
                cardExpiration={expLabel(m.expMonth, m.expYear) ?? undefined}
                width={296}
                className="mx-auto"
              />
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-ink">
                      {m.brand ? BRAND_LABEL[m.brand] ?? "Kartu" : "Kartu"}
                    </span>
                    {m.isPrimary ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-brand-600/15">
                        <Star className="h-3 w-3 fill-current" /> Utama
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {m.last4 ? `Berakhir \u2022\u2022\u2022\u2022 ${m.last4}` : "Kartu tersimpan"}
                    {expLabel(m.expMonth, m.expYear) ? ` \u00b7 ${expLabel(m.expMonth, m.expYear)}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {!m.isPrimary ? (
                    <button
                      type="button"
                      onClick={() => setPrimary(m.id)}
                      disabled={busyId === m.id}
                      className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 disabled:opacity-50"
                    >
                      {busyId === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Jadikan utama"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => remove(m.id)}
                    disabled={busyId === m.id}
                    aria-label="Hapus kartu"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-rose-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-black/[0.12] bg-white/60 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-400">
            <Plus className="h-5 w-5" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-ink">Belum ada kartu tersimpan</h4>
          <p className="mx-auto mt-1 max-w-xs text-sm leading-relaxed text-zinc-500">
            Simpan kartu supaya pembayaran berikutnya lebih cepat. Yang kami simpan hanya token aman dari Midtrans, bukan nomor kartumu.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAdding(true)}
        disabled={!configured}
        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-[transform,background-color] hover:bg-brand-600 active:scale-[0.99] disabled:opacity-60"
      >
        <Plus className="h-4 w-4" /> Tambah kartu
      </button>
      {!configured ? (
        <p className="text-xs text-zinc-400">Penambahan kartu belum tersedia saat ini.</p>
      ) : null}

      {adding ? (
        <AddCardDialog
          clientKey={clientKey}
          isProduction={isProduction}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function AddCardDialog({
  clientKey,
  isProduction,
  onClose,
  onAdded,
}: {
  clientKey: string;
  isProduction: boolean;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  const [mm, setMm] = useState("");
  const [yy, setYy] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const { info: bin } = useBinInfo(number);
  // Portal butuh document (klien). mounted memastikan createPortal hanya jalan setelah mount
  // (hindari mismatch SSR); setState-on-mount disengaja, bukan cascading render merugikan.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  // Kunci scroll body + tutup dengan Escape selama dialog terbuka (paritas dgn modal lain).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function submit() {
    setErr(null);
    if (number.replace(/\s/g, "").length < 12 || !mm || !yy) {
      setErr("Lengkapi nomor kartu dan masa berlaku.");
      return;
    }
    setBusy(true);
    try {
      const reg = await registerCard(clientKey, isProduction, { number, expMonth: mm, expYear: yy });
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savedTokenId: reg.savedTokenId,
          maskedCard: reg.maskedCard,
          bankCode: bin?.bankCode ?? undefined,
          expMonth: Number(mm),
          expYear: yy.length === 2 ? Number(`20${yy}`) : Number(yy),
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Gagal menyimpan kartu.");
      }
      onAdded();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menambahkan kartu.");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15";

  if (!mounted) return null;

  // PENTING: render lewat portal ke <body>. Modal ini dipakai di halaman yang membungkus
  // konten dengan <Reveal> (animate-rise -> transform tetap ada karena fill-mode "both").
  // Elemen position:fixed di dalam ancestor ber-transform jadi relatif ke ancestor itu, BUKAN
  // viewport, sehingga modal "terjebak" & footernya terpotong. Portal ke body membebaskannya.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-brand-900/45 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tambah kartu"
        className="animate-rise relative flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-lift ring-1 ring-black/[0.06] sm:max-h-[90vh] sm:rounded-3xl"
      >
        {/* Header (tetap) */}
        <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-6">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-ink">Tambah kartu</h3>
            <p className="mt-1 text-sm leading-relaxed text-zinc-500">
              Kartu disimpan sebagai token aman Midtrans. Nomor kartu tidak disimpan di server layanan ini.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Isi (bisa scroll bila layar pendek) */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6">
          <div className="flex justify-center">
            <CreditCard
              type="maubisa"
              brand={detectCardNetwork(number).id}
              bankCode={bin?.bankCode ?? undefined}
              cardNumber={number || undefined}
              cardHolder={name || undefined}
              cardExpiration={mm || yy ? `${(mm || "\u2022\u2022").padStart(2, "0")}/${yy ? yy.slice(-2) : "\u2022\u2022"}` : undefined}
              width={248}
            />
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="a-num" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Nomor kartu
              </label>
              <div className="relative">
                <input
                  id="a-num"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={number}
                  onChange={(e) => setNumber(formatNumber(e.target.value))}
                  placeholder="1234 1234 1234 1234"
                  className={`${inputCls} pr-14`}
                />
                {/* Logo jaringan terdeteksi di dalam field (Visa/MC/JCB/Amex/UnionPay/Discover). */}
                <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
                  {detectCardNetwork(number).logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={detectCardNetwork(number).logo} alt={detectCardNetwork(number).label} width={44} height={28} className="h-5 w-10 object-contain" />
                  ) : (
                    <CardIcon className="h-5 w-5 text-zinc-300" />
                  )}
                </span>
              </div>
              {bin?.bank ? (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-500">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-lime-accent" />
                  {bin.bank}
                  {bin.binType ? <span className="text-zinc-400">· {bin.binType === "debit" ? "Debit" : "Kredit"}</span> : null}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="a-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Nama di kartu
              </label>
              <input
                id="a-name"
                autoComplete="cc-name"
                value={name}
                onChange={(e) => setName(e.target.value.replace(/[^\p{L}\s.'-]/gu, "").slice(0, 40))}
                placeholder="Nama sesuai kartu"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="a-mm" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Masa berlaku
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="a-mm"
                  inputMode="numeric"
                  value={mm}
                  onChange={(e) => setMm(onlyDigits(e.target.value, 2))}
                  placeholder="MM"
                  aria-label="Bulan"
                  className={`${inputCls} w-16 text-center`}
                />
                <span className="text-zinc-300" aria-hidden="true">
                  /
                </span>
                <input
                  inputMode="numeric"
                  value={yy}
                  onChange={(e) => setYy(onlyDigits(e.target.value, 4))}
                  placeholder="YY"
                  aria-label="Tahun"
                  className={`${inputCls} w-16 text-center`}
                />
              </div>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Registrasi kartu tidak menagih apa pun. CVV diminta nanti saat kartu dipakai membayar.
            </p>
          </div>

          {err ? <p className="mt-3 text-center text-xs font-medium text-rose-600">{err}</p> : null}
        </div>

        {/* Footer (tetap terlihat) */}
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-black/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2.5 text-sm font-semibold text-zinc-600 transition-colors hover:bg-zinc-100"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? "Menyimpan…" : "Simpan kartu"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
