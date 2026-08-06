"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { CATALOG } from "@/lib/catalog";
import { idr } from "@/lib/format";
import type { PayMethodId, PaymentInstruction } from "@/lib/midtrans/types";
import { getCardToken, detectCardNetwork, type CardInput, type ThreeDsOutcome } from "@/lib/midtrans-card";
import { safeInternalPath } from "@/lib/safe-redirect";
import { isValidEmail } from "@/lib/is-email";
import { MethodPicker } from "./method-picker";
import { CardForm } from "./card-form";
import { SavedCardPicker } from "./saved-card-picker";
import { CheckoutTrust } from "./checkout-trust";
import { SecureStrip } from "./secure-strip";
import { PaymentInstructions } from "./payment-instructions";
import { ThreeDsModal } from "./three-ds-modal";
import { usePaymentStatus } from "./use-payment-status";

// Kartu tersimpan (ringkas) untuk ditawarkan di checkout. TIDAK memuat token — hanya metadata
// tampilan; charge dengan token dilakukan di server berdasar id (kepemilikan diverifikasi).
export type SavedCardLite = {
  id: number;
  brand: string | null;
  bankCode: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  isPrimary: boolean;
};

type Props = {
  mode: "login" | "guest";
  product?: string;
  event?: string;
  eventTitle?: string;
  redirect?: string;
  // Apakah Midtrans terkonfigurasi (server key ada). Dihitung di server; kalau false
  // tampilkan "belum tersedia" tanpa membocorkan kunci.
  configured: boolean;
  // Client key + lingkungan untuk tokenisasi kartu (3DS) di browser. QRIS/VA/e-wallet
  // tidak memakainya; hanya kartu. Boleh string kosong bila kartu tak dipakai.
  clientKey: string;
  isProduction: boolean;
  // Harga acara ASLI dari Directus (server) untuk acara berbayar. Dipakai untuk DISPLAY
  // supaya nominal yang tampil = yang ditagih (charge memakai harga otoritatif ini juga).
  // null/undefined untuk produk katalog (pakai harga katalog).
  eventPriceIdr?: number | null;
  // Kartu tersimpan milik pengguna (login). Kosong untuk tamu.
  savedCards?: SavedCardLite[];
};

const inputCls =
  "w-full rounded-2xl border border-black/[0.08] bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-zinc-400 focus:border-brand-500";

// Orkestrator checkout Core API (UI custom aplikasi). Menggantikan popup Snap: pembeli
// memilih metode -> charge -> instruksi (QR/VA/tagihan) dirender in-page + polling status.
// Satu komponen dipakai untuk login (/checkout) DAN guest (/beli) supaya alurnya linear.
export function PaymentClient({ mode, product, event, eventTitle, redirect, configured, clientKey, isProduction, eventPriceIdr, savedCards = [] }: Props) {
  const router = useRouter();
  const item = useMemo(
    () =>
      event
        ? CATALOG.find((c) => c.key === "webinar-sample")
        : CATALOG.find((c) => c.key === product || c.productCode === product),
    [event, product],
  );
  // Harga yang DITAMPILKAN: untuk acara berbayar pakai harga asli Directus (bukan harga
  // template event), untuk produk katalog pakai harga katalog. Ini yang juga ditagih.
  const displayPrice = event ? eventPriceIdr ?? item?.priceIdr ?? null : item?.priceIdr ?? null;
  const purchasable =
    !!item && item.status === "live" && !!displayPrice && (item.cta === "subscribe" || item.cta === "buy");
  // Item langganan -> tampilkan pemberitahuan perpanjangan otomatis (consent).
  const isSubscription = item?.itemType === "subscription";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [method, setMethod] = useState<PayMethodId | null>(null);
  const [card, setCard] = useState<CardInput>({ number: "", expMonth: "", expYear: "", cvv: "" });
  const [saveCard, setSaveCard] = useState(false);
  // Pilihan kartu tersimpan: id kartu, atau "new" untuk memakai kartu baru. Default = kartu utama
  // bila ada (checkout lebih cepat), else "new".
  const primarySaved = useMemo(
    () => savedCards.find((c) => c.isPrimary) ?? savedCards[0] ?? null,
    [savedCards],
  );
  const [savedChoice, setSavedChoice] = useState<number | "new">(primarySaved ? primarySaved.id : "new");
  const [instruction, setInstruction] = useState<PaymentInstruction | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgTone, setMsgTone] = useState<"error" | "info">("error");
  // URL 3DS aktif → membuka modal verifikasi in-page (iframe). null = tertutup.
  const [threeDsUrl, setThreeDsUrl] = useState<string | null>(null);

  // Redirect sukses hanya boleh ke PATH internal (anti open-redirect via ?redirect=).
  const successUrl = safeInternalPath(redirect, mode === "guest" ? "/terima-kasih" : "/akses");

  const { status, checking, checkNow } = usePaymentStatus(orderId, {
    enabled: !!instruction && !!orderId,
    onPaid: () => {
      // Beri jeda agar pengguna melihat konfirmasi "Pembayaran berhasil" sebelum pindah.
      // Untuk tamu, bawa nomor pesanan ke /terima-kasih supaya bisa ditampilkan (recovery).
      setTimeout(() => {
        const dest =
          mode === "guest" && orderId
            ? `${successUrl}${successUrl.includes("?") ? "&" : "?"}order=${encodeURIComponent(orderId)}`
            : successUrl;
        window.location.href = dest;
      }, 2000);
    },
  });

  const submit = useCallback(async () => {
    setMsg(null);
    setMsgTone("error");
    if (!configured) {
      setMsg("Pembayaran belum tersedia saat ini. Silakan coba lagi nanti.");
      return;
    }
    if (!method) {
      setMsg("Pilih metode pembayaran dulu.");
      return;
    }
    if (mode === "guest") {
      if (!name.trim()) return setMsg("Nama wajib diisi.");
      if (!isValidEmail(email)) return setMsg("Email belum valid.");
    }
    setSubmitting(true);
    try {
      // KARTU: tokenisasi di browser dulu (getCardToken) -> token_id sekali-pakai.
      // PAN/CVV tak pernah dikirim ke server kita (PCI). Kartu TERSIMPAN: tak menokenisasi di
      // klien, cukup kirim savedMethodId; server memakai token tersimpan (tak bocor ke browser).
      let cardToken: string | undefined;
      const useSaved = method === "card" && mode === "login" && savedChoice !== "new";
      if (method === "card" && !useSaved) {
        if (!clientKey) throw new Error("Pembayaran kartu belum tersedia.");
        if (card.number.replace(/\s/g, "").length < 12 || !card.expMonth || !card.expYear || !card.cvv) {
          throw new Error("Lengkapi data kartu dulu.");
        }
        cardToken = await getCardToken(clientKey, isProduction, card);
      }
      const endpoint = mode === "guest" ? "/api/pay/charge/guest" : "/api/pay/charge";
      const wantSave = mode === "login" && method === "card" && !useSaved && saveCard && !isSubscription;
      const body =
        mode === "guest"
          ? { name, email, phone, method, cardToken, ...(event ? { event } : { product }) }
          : {
              method,
              cardToken,
              saveCard: wantSave,
              ...(useSaved ? { savedMethodId: savedChoice } : {}),
              ...(event ? { event } : { product }),
            };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Pembayaran gagal dimulai.");
      const instr = data.instruction as PaymentInstruction;
      setInstruction(instr);
      setOrderId(data.orderId as string);
      // KARTU 3DS 2.0: buka verifikasi in-page (iframe modal) daripada tab baru, sesuai
      // pedoman UI/UX EMV 3DS (jaga konteks). Polling status backend tetap jalan di bawahnya.
      if (instr.method === "card" && instr.display.kind === "redirect") {
        setThreeDsUrl(instr.display.redirectUrl);
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }, [configured, method, mode, name, email, phone, event, product, card, clientKey, isProduction, saveCard, isSubscription, savedChoice]);

  const reset = useCallback(() => {
    // "Ganti metode": batalkan transaksi lama di Midtrans best-effort supaya VA/QR lama tak
    // ikut bisa dibayar (mencegah dobel bayar), lalu kembali ke pilih metode.
    const stale = orderId;
    setInstruction(null);
    setOrderId(null);
    setMsg(null);
    if (stale) {
      void fetch(`/api/pay/cancel/${encodeURIComponent(stale)}`, { method: "POST" }).catch(() => {});
    }
  }, [orderId]);

  // "Batal bayar": batalkan transaksi di Midtrans (server memverifikasi kepemilikan/pending),
  // hentikan polling, lalu kembali ke fase pilih dengan pesan. Untuk tamu, karena tak ada yang
  // ditulis DB sebelum lunas, membatalkan di Midtrans sudah cukup membuat batal final.
  const cancel = useCallback(async () => {
    if (!orderId) return;
    setCancelling(true);
    try {
      await fetch(`/api/pay/cancel/${encodeURIComponent(orderId)}`, { method: "POST" });
    } catch {
      /* jaringan sesaat — instruksi tetap dibersihkan di klien */
    } finally {
      setCancelling(false);
      setInstruction(null);
      setOrderId(null);
      setMsgTone("info");
      setMsg("Pembayaran dibatalkan. Kamu bisa memilih metode lain atau menutup halaman ini.");
    }
  }, [orderId]);

  // Kembali ke halaman sebelumnya bila ada riwayat; else ke katalog (login) / situs utama (tamu).
  const goBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      window.location.href = mode === "guest" ? "/beli" : "/langganan/ubah";
    }
  }, [router, mode]);

  // Hasil verifikasi 3DS (dari modal in-page). "failure" → beri pesan + biarkan pembeli
  // mengulang/ganti metode. "success"/"pending" → 3DS 2.0 ASINKRON: jangan anggap lunas dari
  // sini; alihkan tampilan ke "memverifikasi" dan biarkan polling status backend memutuskan.
  const on3dsResolved = useCallback(
    (outcome: ThreeDsOutcome) => {
      setThreeDsUrl(null);
      if (outcome === "failure") {
        setMsgTone("error");
        setMsg("Verifikasi kartu belum selesai. Coba lagi atau pilih metode lain.");
        return;
      }
      setInstruction((prev) => (prev ? { ...prev, display: { kind: "done" } } : prev));
      checkNow();
    },
    [checkNow],
  );

  // URL redirect 3DS aktif untuk kartu (untuk membuka ulang modal bila pembeli menutupnya).
  const cardRedirectUrl =
    instruction && instruction.display.kind === "redirect" ? instruction.display.redirectUrl : null;

  if (!item || !purchasable) {
    return (
      <div className="rounded-3xl border border-black/[0.06] bg-white p-8 text-center shadow-soft">
        <h1 className="text-xl font-bold text-ink">Produk tidak ditemukan</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Tautan pembelian tidak dikenali atau produk belum tersedia.
        </p>
        <Link
          href="/langganan/ubah"
          className="mt-5 inline-block rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
        >
          Lihat katalog
        </Link>
      </div>
    );
  }

  // Fase instruksi: tampilkan cara bayar + polling.
  if (instruction && orderId) {
    return (
      <div className="mx-auto max-w-md">
        <PaymentInstructions
          instruction={instruction}
          status={status}
          checking={checking}
          onCheckNow={checkNow}
          onCancel={cancel}
          cancelling={cancelling}
          onVerify={cardRedirectUrl ? () => setThreeDsUrl(cardRedirectUrl) : undefined}
        />
        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
          <span>No. pesanan: {orderId}</span>
          {status !== "paid" ? (
            <button type="button" onClick={reset} className="font-semibold text-brand-600 hover:underline">
              Ganti metode
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
          {mode === "guest"
            ? "Akun & akses dibuat otomatis setelah pembayaran dikonfirmasi. Invoice + tautan atur kata sandi dikirim ke emailmu."
            : "Akses aktif otomatis setelah pembayaran dikonfirmasi."}
        </p>
        {threeDsUrl ? (
          <ThreeDsModal
            redirectUrl={threeDsUrl}
            clientKey={clientKey}
            isProduction={isProduction}
            amountLabel={idr(displayPrice ?? instruction.grossAmount)}
            network={detectCardNetwork(card.number)}
            onResolved={on3dsResolved}
            onCancel={() => setThreeDsUrl(null)}
          />
        ) : null}
      </div>
    );
  }

  // Fase pilih: 2 kolom di desktop (KIRI ringkasan sticky, KANAN form) supaya bayar-kartu
  // tak perlu scroll jauh; 1 kolom di mobile (ringkasan → form → jaminan).
  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={goBack}
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 rounded-full"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Kembali
      </button>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* KIRI: ringkasan + jaminan singkat (sticky di desktop, teratas di mobile) */}
      <div className="space-y-4 lg:sticky lg:top-6">
      <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-gradient-to-b from-white to-cream-50 shadow-soft">
        <div className="p-6 sm:p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Ringkasan pesanan
          </div>
          <div className="mt-3 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="text-lg font-bold text-ink">{eventTitle || item.name}</div>
              {event ? (
                <div className="mt-0.5 text-xs text-zinc-500">
                  {eventTitle ? item.name : "Acara"} · kode {event}
                </div>
              ) : null}
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">{item.blurb}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-2xl font-bold tracking-tight text-ink">{idr(displayPrice)}</div>
              {item.cadence ? <div className="text-xs text-zinc-500">{item.cadence}</div> : null}
            </div>
          </div>
          {isSubscription ? (
            <p className="mt-4 rounded-2xl border border-black/[0.06] bg-white px-4 py-3 text-xs leading-relaxed text-zinc-500">
              <span className="font-semibold text-ink">Langganan otomatis.</span> Dibayar kartu,{" "}
              {item.name} diperpanjang {idr(displayPrice)}
              {item.cadence ? ` ${item.cadence}` : "/bln"} tiap periode sampai kamu batalkan dari
              dashboard. Bayar QRIS/VA/e-wallet berlaku 30 hari lalu diperpanjang manual.
            </p>
          ) : null}
        </div>
      </div>

      {mode === "guest" ? <SecureStrip className="px-1" /> : null}
      </div>

      {/* KANAN: data diri (guest) + metode + tombol bayar + jaminan penuh */}
      <div className="space-y-4">
      {mode === "guest" ? (
        <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-soft sm:p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Data diri
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <div>
              <label htmlFor="g-name" className="mb-1.5 block text-sm font-semibold text-ink">
                Nama lengkap
              </label>
              <input
                id="g-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama sesuai identitas"
                autoComplete="name"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="g-email" className="mb-1.5 block text-sm font-semibold text-ink">
                Email
              </label>
              <input
                id="g-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                autoComplete="email"
                className={inputCls}
              />
              <p className="mt-1.5 text-xs text-zinc-500">Invoice + tautan buat akun dikirim ke email ini.</p>
            </div>
            <div>
              <label htmlFor="g-phone" className="mb-1.5 block text-sm font-semibold text-ink">
                No. WhatsApp <span className="font-normal text-zinc-500">(opsional)</span>
              </label>
              <input
                id="g-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xx"
                autoComplete="tel"
                className={inputCls}
              />
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-3xl border border-black/[0.06] bg-white p-6 shadow-soft sm:p-8">
        <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
          Metode pembayaran
        </div>
        <MethodPicker selected={method} onSelect={setMethod} disabled={submitting} />

        {method === "card" ? (
          <>
            {mode === "login" && savedCards.length > 0 ? (
              <SavedCardPicker
                cards={savedCards}
                choice={savedChoice}
                onChoice={setSavedChoice}
                disabled={submitting}
              />
            ) : null}
            {mode !== "login" || savedCards.length === 0 || savedChoice === "new" ? (
              <CardForm
                value={card}
                onChange={setCard}
                disabled={submitting}
                buyerName={mode === "guest" ? name : undefined}
                canSave={mode === "login" && !isSubscription}
                save={saveCard}
                onToggleSave={setSaveCard}
              />
            ) : null}
          </>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={submitting || !method}
          className="group mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-500 py-4 text-sm font-semibold text-white shadow-soft transition-[transform,background-color] duration-300 hover:bg-brand-600 active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Memproses…
            </>
          ) : (
            <>
              <span>Bayar {idr(displayPrice)}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
        {msg ? (
          <p
            role={msgTone === "error" ? "alert" : "status"}
            className={`mt-3 text-center text-xs font-medium ${
              msgTone === "error" ? "text-rose-600" : "text-zinc-500"
            }`}
          >
            {msg}
          </p>
        ) : null}
      </div>

      {mode === "guest" ? (
        <>
          <CheckoutTrust />
          <p className="text-center text-xs leading-relaxed text-zinc-500">
            Akun &amp; akses dibuat otomatis setelah pembayaran dikonfirmasi. Sudah punya akun?{" "}
            <Link href="/masuk" className="font-semibold text-brand-500 hover:underline">
              Masuk
            </Link>
            .
          </p>
        </>
      ) : (
        <div className="space-y-2 text-center">
          <SecureStrip />
          <p className="text-xs leading-relaxed text-zinc-500">
            Akses aktif otomatis setelah pembayaran dikonfirmasi.
          </p>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
