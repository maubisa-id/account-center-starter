import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { idr, tanggal, namaProduk, namaLayanan, metodeBayar } from "@/lib/format";
import { PrintButton } from "@/components/dashboard/print-button";

export const dynamic = "force-dynamic";

// Identitas penerbit (penjual) yang tampil di invoice. Ubah di sini bila berubah.
const SELLER = {
  name: "Maubisa",
  legal: "PT Litera Edu Solusi",
  address: ["Taman Harapan No 26, Jakarta, 13630"],
  phone: "+62 811 134069",
  web: "https://maubisa.id",
  email: "halo@maubisa.id",
  npwp: "10.000.000.0-014.620.53",
};

export default async function InvoicePage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) redirect(`/masuk?redirect=${encodeURIComponent(`/invoice/${orderId}`)}`);

  const user = await prisma.user.findFirst({ where: { email } });
  const invoice = user
    ? await prisma.invoice.findFirst({ where: { orderId, userId: user.id } })
    : null;
  if (!user || !invoice) notFound();

  const paid = invoice.status === "paid" || invoice.status === "settlement";
  const statusLabel: Record<string, string> = {
    paid: "LUNAS",
    settlement: "LUNAS",
    pending: "MENUNGGU",
    failed: "GAGAL",
    expired: "KEDALUWARSA",
    refunded: "DIKEMBALIKAN",
  };
  const label = statusLabel[invoice.status] ?? invoice.status.toUpperCase();

  const qty = invoice.quantity ?? 1;
  const unit = Number(invoice.unitPrice ?? invoice.grossAmount);
  const total = Number(invoice.grossAmount);
  const lineGross = unit * qty;
  const disc = lineGross > total ? lineGross - total : 0;
  const itemLabel = invoice.itemName ?? namaProduk(invoice.productCode);

  return (
    <div className="min-h-[100dvh] bg-canvas px-4 py-10 text-ink print:bg-white print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <a href="/pembayaran" className="text-sm font-medium text-brand-600 hover:underline">
            &larr; Kembali ke pembayaran
          </a>
          <PrintButton />
        </div>

        <div className="rounded-3xl bg-white p-8 shadow-soft ring-1 ring-black/[0.06] sm:p-12 print:rounded-none print:p-0 print:shadow-none print:ring-0">
          {/* Header: logo + INVOICE */}
          <div className="flex items-start justify-between gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/maubisa-logo.png" alt="Maubisa" width={150} height={40} className="h-9 w-auto" />
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tight text-ink">INVOICE</div>
              <div className="mt-1 text-sm text-zinc-500">No. {invoice.orderId}</div>
              <div className="text-sm text-zinc-500">{tanggal(invoice.createdAt)}</div>
            </div>
          </div>

          {/* Status pill (paid = tanggal bayar; else = status) */}
          <div className="mt-8">
            <span
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold [print-color-adjust:exact] [-webkit-print-color-adjust:exact] ${
                paid ? "bg-lime-soft text-lime-accent" : "bg-cream-100 text-ink"
              }`}
            >
              {paid ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-lime-bright" />
                  LUNAS &middot; dibayar {tanggal(invoice.paidAt ?? invoice.createdAt)}
                </>
              ) : (
                `Status: ${label}`
              )}
            </span>
          </div>

          {/* From / Bill to / Dibayar via */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="text-sm leading-relaxed">
              <div className="font-bold text-ink">Dari:</div>
              <div className="mt-1 font-semibold text-ink">{SELLER.name}</div>
              <div className="text-zinc-500">{SELLER.legal}</div>
              {SELLER.address.map((line) => (
                <div key={line} className="text-zinc-500">{line}</div>
              ))}
              <div className="text-zinc-500">{SELLER.phone}</div>
              <div className="text-zinc-500">{SELLER.web}</div>
              <div className="text-zinc-500">{SELLER.email}</div>
              <div className="text-zinc-500">NPWP: {SELLER.npwp}</div>
            </div>

            <div className="text-sm leading-relaxed">
              <div className="font-bold text-ink">Ditagihkan kepada:</div>
              <div className="mt-1 font-semibold text-ink">{user.name}</div>
              <div className="text-zinc-500">{user.email}</div>
              {user.phone ? <div className="text-zinc-500">{user.phone}</div> : null}
            </div>

            <div className="rounded-2xl bg-cream-100 p-4 text-sm leading-relaxed [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
              <div className="font-bold text-ink">Dibayar via:</div>
              <div className="mt-1 font-semibold text-ink">{metodeBayar(invoice.paymentType)}</div>
              {invoice.midtransTxnId ? (
                <div className="mt-1 break-all font-mono text-[11px] text-zinc-500">
                  ID: {invoice.midtransTxnId}
                </div>
              ) : null}
            </div>
          </div>

          {/* Total dibayar + Order ID */}
          <div className="mt-8">
            <div className="text-xl font-bold text-ink">
              {paid ? "Total dibayar:" : "Total tagihan:"}{" "}
              <span className="text-brand-600">{idr(total)}</span>
            </div>
            <div className="mt-1 text-sm font-semibold text-zinc-500">Order ID: {invoice.orderId}</div>
          </div>

          {/* Line items */}
          <table className="mt-6 w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500">
                <th className="py-2 text-left font-semibold">Deskripsi</th>
                <th className="py-2 text-center font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Harga (Rp)</th>
                <th className="py-2 text-right font-semibold">Disc</th>
                <th className="py-2 text-right font-semibold">Total (Rp)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-100 align-top">
                <td className="py-4">
                  <div className="font-semibold text-ink">{itemLabel}</div>
                  <div className="mt-0.5 text-xs text-zinc-400">{namaLayanan(invoice.scope)}</div>
                </td>
                <td className="py-4 text-center text-zinc-600">{qty}</td>
                <td className="py-4 text-right text-zinc-600">{idr(unit)}</td>
                <td className="py-4 text-right text-zinc-600">{disc > 0 ? `-${idr(disc)}` : "-"}</td>
                <td className="py-4 text-right font-semibold text-ink">{idr(total)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-2 space-y-2 border-t border-zinc-200 pt-4 text-sm">
            <div className="flex items-center justify-between text-zinc-500">
              <span>Subtotal</span>
              <span>{idr(lineGross)}</span>
            </div>
            {disc > 0 ? (
              <div className="flex items-center justify-between text-zinc-500">
                <span>Diskon</span>
                <span>-{idr(disc)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t border-zinc-200 pt-2 text-base font-bold text-ink">
              <span>{paid ? "Total dibayar" : "Total tagihan"}</span>
              <span>{idr(total)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-10 border-t border-zinc-100 pt-6 text-center">
            <p className="text-sm font-medium text-ink">Terima kasih atas kepercayaanmu 🙏</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              Invoice ini diterbitkan secara elektronik oleh {SELLER.name} ({SELLER.legal}) dan sah
              tanpa tanda tangan. Untuk pertanyaan, hubungi {SELLER.email}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
