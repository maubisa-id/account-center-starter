import { useEffect, useState } from "react";
import { Check, Copy, Clock, Loader2, QrCode, Smartphone, ShieldCheck, X } from "lucide-react";
import type { PaymentInstruction } from "@/lib/midtrans/types";
import { getPaymentGuides } from "@/lib/midtrans/pay-instructions";
import { idr } from "@/lib/format";
import { BrandLogo } from "./brand-logo";
import { InstructionAccordion } from "./instruction-accordion";
import { CancelPaymentDialog } from "./cancel-payment-dialog";

// Parse waktu WIB "YYYY-MM-DD HH:mm:ss" dari Midtrans jadi epoch ms. Midtrans
// mengembalikan waktu zona server (WIB), jadi tempelkan offset +07:00 eksplisit.
function parseExpiry(wib: string | null): number | null {
  if (!wib) return null;
  const t = Date.parse(wib.replace(" ", "T") + "+07:00");
  return Number.isFinite(t) ? t : null;
}

function useCountdown(expiryTime: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = parseExpiry(expiryTime);
  if (end == null) return null;
  const left = Math.max(0, end - now);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  const s = Math.floor((left % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* clipboard diblokir; abaikan */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100"
      aria-label={label ? `Salin ${label}` : "Salin"}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Tersalin" : "Salin"}
    </button>
  );
}

const BANK_LABEL: Record<string, string> = {
  bca: "BCA",
  bni: "BNI",
  bri: "BRI",
  permata: "Permata",
  cimb: "CIMB Niaga",
  mandiri: "Mandiri",
};

function bankName(code: string): string {
  return BANK_LABEL[code.toLowerCase()] ?? code.toUpperCase();
}

// Deskriptor tampilan per status pembayaran. "wait" = masih menunggu (spinner), "ok" =
// lunas (centang), "bad" = terminal gagal/batal/kedaluwarsa (silang, nada merah). Mencegah
// bug UX: status failed/expired/cancelled TIDAK boleh lagi tampil "Menunggu pembayaran…".
const STATUS_UI: Record<string, { label: string; tone: "wait" | "ok" | "bad" }> = {
  pending: { label: "Menunggu pembayaran…", tone: "wait" },
  paid: { label: "Pembayaran diterima", tone: "ok" },
  failed: { label: "Pembayaran gagal", tone: "bad" },
  expired: { label: "Waktu pembayaran habis", tone: "bad" },
  cancelled: { label: "Pembayaran dibatalkan", tone: "bad" },
  refunded: { label: "Pembayaran dikembalikan", tone: "bad" },
};

// Kotak nomor/kode yang bisa disalin (dipakai VA & tagihan Mandiri).
function CodeField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-cream-100 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="break-all font-mono text-lg font-bold tracking-wide text-ink">
          {value || "-"}
        </span>
        {value ? <CopyButton value={value} label={label} /> : null}
      </div>
    </div>
  );
}

export function PaymentInstructions({
  instruction,
  status,
  checking,
  onCheckNow,
  onCancel,
  cancelling,
  onVerify,
}: {
  instruction: PaymentInstruction;
  status: string;
  checking: boolean;
  onCheckNow: () => void;
  // Batal bayar (opsional). Bila diberi & status belum lunas, tampilkan tombol X + konfirmasi.
  onCancel?: () => void;
  cancelling?: boolean;
  // Kartu 3DS: buka ulang modal verifikasi in-page (bukan tab baru).
  onVerify?: () => void;
}) {
  const countdown = useCountdown(instruction.expiryTime);
  const d = instruction.display;
  const [confirmCancel, setConfirmCancel] = useState(false);
  const s = STATUS_UI[status] ?? STATUS_UI.pending;
  const terminal = status !== "pending" && status !== "paid";
  // Hanya pesanan yang MASIH menunggu yang bisa dibatalkan (bukan yang sudah lunas/gagal/batal).
  const canCancel = !!onCancel && status === "pending";

  // LUNAS: ganti seluruh isi kotak dengan konfirmasi sukses (centang) — jelas & meyakinkan,
  // bukan sekadar strip status kecil. Pemanggil (payment-client) mengalihkan ke dashboard
  // sesaat setelah ini muncul, jadi ada jeda untuk pembeli melihat keberhasilannya.
  if (status === "paid") {
    return (
      <div className="rounded-3xl border border-black/[0.06] bg-gradient-to-b from-white to-cream-50 p-8 text-center shadow-soft">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lime-100 ring-8 ring-lime-50">
          <Check className="h-8 w-8 text-lime-accent" strokeWidth={3} />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink">
          Pembayaran berhasil
        </h2>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-zinc-500">
          Terima kasih. Aksesmu sedang diaktifkan otomatis dan kamu akan dialihkan sebentar lagi.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-medium text-zinc-500 ring-1 ring-black/[0.06]">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-500" /> Mengalihkan…
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-3xl border border-black/[0.06] bg-white p-6 shadow-soft sm:p-8">
      {/* Tombol batal (X) di pojok kanan atas — hanya bila belum lunas */}
      {canCancel ? (
        <button
          type="button"
          onClick={() => setConfirmCancel(true)}
          disabled={cancelling}
          aria-label="Batalkan pembayaran"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}

      {/* Header metode + nominal */}
      <div className="flex items-start justify-between gap-4 pr-8">
        <div className="flex items-center gap-3">
          <BrandLogo id={instruction.method} className="h-10 w-16" />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Selesaikan pembayaran
            </div>
            <div className="mt-0.5 text-base font-bold text-ink">{instruction.methodLabel}</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-display text-xl font-bold tracking-tight text-ink">{idr(instruction.grossAmount)}</div>
          {countdown ? (
            <div className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
              <Clock className="h-3.5 w-3.5" /> {countdown}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        {/* QR (QRIS / GoPay) */}
        {d.kind === "qr" ? (
          <div className="flex flex-col items-center">
            {d.qrImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={d.qrImageUrl}
                alt={`QR ${instruction.methodLabel}`}
                width={260}
                height={260}
                className="h-64 w-64 rounded-2xl border border-black/[0.06] bg-white p-3"
              />
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-2xl border border-dashed border-black/10 text-zinc-500">
                <QrCode className="h-10 w-10" />
              </div>
            )}
            <p className="mt-4 max-w-xs text-center text-sm text-zinc-500">
              Buka aplikasi pembayaran, pilih <strong>Scan QR</strong>, lalu pindai kode di atas.
            </p>
            {d.deeplinkUrl ? (
              <a
                href={d.deeplinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 sm:hidden"
              >
                <Smartphone className="h-4 w-4" /> Buka aplikasi
              </a>
            ) : null}
          </div>
        ) : null}

        {/* Deeplink e-wallet (ShopeePay) */}
        {d.kind === "deeplink" ? (
          <div className="flex flex-col items-center text-center">
            {d.qrImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={d.qrImageUrl}
                alt={`QR ${instruction.methodLabel}`}
                width={260}
                height={260}
                className="h-64 w-64 rounded-2xl border border-black/[0.06] bg-white p-3"
              />
            ) : null}
            <p className="mt-2 max-w-xs text-sm text-zinc-500">
              Lanjutkan pembayaran di aplikasi {instruction.methodLabel}.
            </p>
            {d.deeplinkUrl ? (
              <a
                href={d.deeplinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
              >
                <Smartphone className="h-4 w-4" /> Buka {instruction.methodLabel}
              </a>
            ) : (
              <p className="mt-3 text-xs text-zinc-500">
                Tautan aplikasi tidak tersedia. Coba metode QRIS agar bisa dipindai.
              </p>
            )}
          </div>
        ) : null}

        {/* Virtual Account */}
        {d.kind === "va" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <BrandLogo id={instruction.method} className="h-8 w-12" />
              <span className="text-sm font-bold text-ink">Bank {bankName(d.bank)}</span>
            </div>
            <CodeField label={`No. Virtual Account ${bankName(d.bank)}`} value={d.vaNumber} />
            <p className="text-xs leading-relaxed text-zinc-500">
              Pembayaran diproses lewat Midtrans (payment gateway). Nama penerima yang tampil di
              aplikasi bank mengikuti sistem Midtrans. Cukup pastikan <strong>nominalnya</strong>{" "}
              sesuai.
            </p>
            <InstructionAccordion guides={getPaymentGuides(instruction.method, { va: d.vaNumber })} />
          </div>
        ) : null}

        {/* Mandiri Bill Payment */}
        {d.kind === "bill" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <BrandLogo id={instruction.method} className="h-8 w-12" />
              <span className="text-sm font-bold text-ink">Mandiri Bill Payment</span>
            </div>
            <CodeField label="Kode Perusahaan (Biller)" value={d.billerCode} />
            <CodeField label="Kode Bayar (Bill Key)" value={d.billKey} />
            <InstructionAccordion
              guides={getPaymentGuides(instruction.method, {
                biller: d.billerCode,
                billkey: d.billKey,
              })}
            />
          </div>
        ) : null}

        {/* Kartu 3DS 2.0: verifikasi in-page (iframe modal), bukan tab baru — jaga konteks. */}
        {d.kind === "redirect" ? (
          <div className="flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-600">
              Satu langkah lagi. Selesaikan verifikasi <strong>3D Secure</strong> dari bankmu untuk
              mengonfirmasi kartu.
            </p>
            {onVerify ? (
              <button
                type="button"
                onClick={onVerify}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-brand transition-[transform,background-color] hover:bg-brand-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
              >
                <ShieldCheck className="h-4 w-4" /> Verifikasi 3D Secure
              </button>
            ) : (
              <a
                href={d.redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-600"
              >
                <ShieldCheck className="h-4 w-4" /> Verifikasi kartu (OTP)
              </a>
            )}
            <p className="mt-3 text-xs text-zinc-500">
              Bankmu mungkin mengirim OTP via SMS atau aplikasi. Verifikasi bisa selesai tanpa OTP
              bila transaksimu dinilai aman.
            </p>
          </div>
        ) : null}

        {/* Kartu tanpa 3DS / sudah final / setelah challenge: tinggal tunggu konfirmasi (poll). */}
        {d.kind === "done" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <p className="max-w-xs text-sm leading-relaxed text-zinc-500">
              Memverifikasi pembayaran kartumu. Halaman ini otomatis lanjut setelah dikonfirmasi,
              tak perlu menutupnya.
            </p>
          </div>
        ) : null}
      </div>

      {/* Status pembayaran + cek manual. Nada menyesuaikan status (menunggu/lunas/gagal). */}
      <div
        role="status"
        aria-live="polite"
        className={`mt-6 flex items-center justify-between gap-3 rounded-2xl px-4 py-3 ${
          s.tone === "bad" ? "bg-rose-50" : "bg-cream-100"
        }`}
      >
        <span
          className={`inline-flex items-center gap-2 text-sm font-medium ${
            s.tone === "bad" ? "text-rose-700" : "text-zinc-600"
          }`}
        >
          {s.tone === "ok" ? (
            <Check className="h-4 w-4 text-lime-accent" />
          ) : s.tone === "bad" ? (
            <X className="h-4 w-4 text-rose-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-brand-500" />
          )}
          {s.label}
        </span>
        {status === "pending" ? (
          <button
            type="button"
            onClick={onCheckNow}
            disabled={checking}
            className="text-xs font-semibold text-brand-600 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Cek status
          </button>
        ) : null}
      </div>

      {/* Panduan pemulihan untuk status terminal gagal/batal/kedaluwarsa */}
      {terminal ? (
        <p className="mt-2 text-center text-xs leading-relaxed text-zinc-500">
          Pesanan ini tidak dapat dilanjutkan. Silakan mulai pesanan baru atau pilih metode lain.
        </p>
      ) : null}

      {/* Konfirmasi batal — MODAL fokus (bukan kartu inline yang menggeser konten) */}
      <CancelPaymentDialog
        open={canCancel && confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          onCancel?.();
        }}
        cancelling={cancelling}
      />
    </div>
  );
}
