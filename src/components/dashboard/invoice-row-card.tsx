import Link from "next/link";
import { idr, tanggal, metodeBayar, namaProduk } from "@/lib/format";
import { Badge } from "@/components/ui";
import { IconDownload } from "@/components/icons";
import { PendingInvoiceActions } from "./pending-invoice-actions";

// Kartu invoice untuk tampilan MOBILE (<md). Tabel 7-kolom di /pembayaran (dan tabel
// tagihan di /langganan) memaksa scroll horizontal di ponsel sehingga aksi "Bayar"
// tersembunyi — persona mobile-first. Satu komponen dipakai kedua halaman
// (hindari duplikasi markup). Server component; merender PendingInvoiceActions (client).
type InvoiceLike = {
  orderId: string;
  itemName?: string | null;
  productCode?: string | null;
  paymentType?: string | null;
  grossAmount: unknown;
  status: string;
  paidAt?: Date | null;
  createdAt: Date | null;
};

export function InvoiceRowCard({
  invoice,
  showItem = true,
  payable,
}: {
  invoice: InvoiceLike;
  // Tampilkan nama item (pembayaran) atau sembunyikan (tagihan langganan yang homogen).
  showItem?: boolean;
  payable: boolean;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showItem ? (
            <div className="truncate text-sm font-semibold text-ink">
              {invoice.itemName ?? namaProduk(invoice.productCode)}
            </div>
          ) : null}
          <div className="mt-0.5 font-mono text-[11px] text-zinc-500">{invoice.orderId}</div>
        </div>
        <Badge value={invoice.status} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 text-xs text-zinc-500">
          {invoice.paymentType ? <div className="truncate">{metodeBayar(invoice.paymentType)}</div> : null}
          <div>{tanggal(invoice.paidAt ?? invoice.createdAt)}</div>
        </div>
        <div className="shrink-0 text-base font-bold text-ink">{idr(invoice.grossAmount)}</div>
      </div>

      <div className="mt-3 flex items-center justify-end border-t border-zinc-100 pt-3">
        {payable ? (
          <PendingInvoiceActions orderId={invoice.orderId} align="end" />
        ) : (
          <Link
            href={`/invoice/${invoice.orderId}`}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-semibold text-brand-600 transition-colors hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
          >
            <IconDownload className="h-3.5 w-3.5" /> Unduh invoice
          </Link>
        )}
      </div>
    </div>
  );
}
