import Link from "next/link";
import { getAccount } from "@/lib/account";
import { idr, tanggal, metodeBayar, namaProduk } from "@/lib/format";
import {
  Panel,
  StatCard,
  Badge,
  Reveal,
  SectionTitle,
  EmptyState,
} from "@/components/ui";
import { DbError, NoSeed } from "@/components/states";
import { PendingPaymentBanner } from "@/components/dashboard/pending-payment-banner";
import { InvoiceRowCard } from "@/components/dashboard/invoice-row-card";
import { IconReceipt, IconCard, IconGrid, IconDownload } from "@/components/icons";
import { PendingInvoiceActions } from "@/components/dashboard/pending-invoice-actions";

export const dynamic = "force-dynamic";

// Status yang masih bisa/harus diselesaikan pembayarannya (tampilkan tombol "Bayar").
const PAYABLE = new Set(["pending"]);

export default async function Pembayaran() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  const inv = user.invoices;
  const paid = inv.filter((i) => i.status === "paid" || i.status === "settlement");
  const totalPaid = paid.reduce((s, i) => s + Number(i.grossAmount), 0);
  const lastMethod = inv.find((i) => i.paymentType)?.paymentType ?? null;
  const pendingCount = inv.filter((i) => PAYABLE.has(i.status)).length;
  const firstPending = inv.find((i) => PAYABLE.has(i.status));

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Pembayaran"
        title="Riwayat pembayaran"
        desc="Semua transaksi dan tagihan pada akun ini kamu."
      />

      {pendingCount > 0 ? (
        <PendingPaymentBanner count={pendingCount} orderId={firstPending?.orderId} />
      ) : null}

      <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<IconReceipt className="h-5 w-5" />}
          label="Total dibayar"
          value={idr(totalPaid)}
          hint={`${paid.length} transaksi lunas`}
        />
        <StatCard
          icon={<IconGrid className="h-5 w-5" />}
          label="Total transaksi"
          value={inv.length}
          hint="sepanjang waktu"
          accent="text-brand-500"
        />
        <StatCard
          icon={<IconCard className="h-5 w-5" />}
          label="Metode terakhir"
          value={metodeBayar(lastMethod)}
          hint="pembayaran terbaru"
          accent="text-lime-600"
        />
      </Reveal>

      {inv.length ? (
        <Reveal delay={100} className="space-y-3">
          {/* Mobile: kartu per invoice (tabel 7-kolom menyembunyikan aksi di balik scroll) */}
          <div className="space-y-3 md:hidden">
            {inv.map((row) => (
              <InvoiceRowCard key={row.id} invoice={row} payable={PAYABLE.has(row.status)} />
            ))}
          </div>
          <Panel innerClassName="overflow-hidden" className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                    <th className="px-5 py-3.5 font-semibold">Order</th>
                    <th className="px-5 py-3.5 font-semibold">Item</th>
                    <th className="px-5 py-3.5 font-semibold">Metode</th>
                    <th className="px-5 py-3.5 font-semibold">Tanggal</th>
                    <th className="px-5 py-3.5 text-right font-semibold">Jumlah</th>
                    <th className="px-5 py-3.5 font-semibold">Status</th>
                    <th className="px-5 py-3.5">
                      <span className="sr-only">Aksi</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {inv.map((row) => (
                    <tr key={row.id} className="transition-colors hover:bg-zinc-50/60">
                      <td className="px-5 py-4 font-mono text-xs text-zinc-400">{row.orderId}</td>
                      <td className="px-5 py-4 font-medium text-ink">
                        {row.itemName ?? namaProduk(row.productCode)}
                      </td>
                      <td className="px-5 py-4 text-zinc-500">{metodeBayar(row.paymentType)}</td>
                      <td className="px-5 py-4 text-zinc-500">
                        {tanggal(row.paidAt ?? row.createdAt)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-ink">
                        {idr(row.grossAmount)}
                      </td>
                      <td className="px-5 py-4">
                        <Badge value={row.status} />
                      </td>
                      <td className="px-5 py-4 text-right">
                        {PAYABLE.has(row.status) ? (
                          <PendingInvoiceActions orderId={row.orderId} />
                        ) : (
                          <Link
                            href={`/invoice/${row.orderId}`}
                            aria-label={`Unduh invoice ${row.orderId}`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 ring-1 ring-black/[0.06] transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                          >
                            <IconDownload className="h-4 w-4" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </Reveal>
      ) : (
        <EmptyState
          icon={<IconReceipt className="h-6 w-6" />}
          title="Belum ada transaksi"
          desc="Riwayat pembayaran akan muncul di sini setelah transaksi pertamamu."
        />
      )}
    </div>
  );
}
