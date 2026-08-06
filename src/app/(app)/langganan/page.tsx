import { getAccount } from "@/lib/account";
import { idr, tanggal, sisaHari, namaProduk, metodeBayar } from "@/lib/format";
import {
  Panel,
  Card,
  Badge,
  InfoRow,
  ButtonLink,
  Reveal,
  SectionTitle,
  EmptyState,
} from "@/components/ui";
import { CancelSubscriptionButton } from "@/components/dashboard/cancel-subscription";
import { PendingInvoiceActions } from "@/components/dashboard/pending-invoice-actions";
import { PendingPaymentBanner } from "@/components/dashboard/pending-payment-banner";
import { InvoiceRowCard } from "@/components/dashboard/invoice-row-card";
import { DbError, NoSeed } from "@/components/states";
import { IconCheck, IconSparkle } from "@/components/icons";

export const dynamic = "force-dynamic";

const BENEFITS = [
  "Akses fitur langganan",
  "Prioritas dukungan pelanggan",
  "Materi dan rekaman eksklusif",
  "Pengalaman bebas iklan",
];

export default async function Langganan() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  const sub = user.subscriptions[0];
  const days = sisaHari(sub?.currentPeriodEnd ?? null);
  const subInvoices = user.invoices.filter(
    (i) => (sub && i.subscriptionId === sub.id) || i.itemType === "subscription",
  );
  const pendingSubInvoices = subInvoices.filter((i) => i.status === "pending");
  const firstPendingSub = pendingSubInvoices[0];

  if (!sub) {
    return (
      <div className="space-y-8">
        <SectionTitle eyebrow="Langganan" title="Paket & tagihan" />
        <EmptyState
          icon={<IconSparkle className="h-6 w-6" />}
          title="Belum ada langganan aktif"
          desc="Aktifkan langganan untuk membuka fitur dan materi eksklusif."
        />
        <div className="flex justify-center">
          <ButtonLink href="/langganan/ubah">Jelajahi paket</ButtonLink>
        </div>
      </div>
    );
  }

  const metodeInv =
    subInvoices.find((i) => i.paymentType && (i.status === "paid" || i.status === "settlement")) ??
    subInvoices.find((i) => i.paymentType);
  const metodePembayaran = metodeInv?.paymentType ? metodeBayar(metodeInv.paymentType) : "Midtrans";

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Langganan"
        title="Paket & tagihan"
        desc="Kelola paket langganan dan lihat tagihannya."
      />

      <PendingPaymentBanner count={pendingSubInvoices.length} orderId={firstPendingSub?.orderId} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Panel className="h-full" innerClassName="p-6 sm:p-8 h-full">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  Paket saat ini
                </div>
                <div className="mt-2 text-2xl font-bold tracking-tight text-ink">
                  {namaProduk(sub.productCode)}
                </div>
                <div className="mt-1 text-sm text-zinc-500">
                  {idr(sub.amount)} / {sub.interval === "yearly" ? "tahun" : "bulan"}
                </div>
              </div>
              <Badge value={sub.status} />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-4">
              <InfoRow label="Mulai">{tanggal(sub.currentPeriodStart)}</InfoRow>
              <InfoRow label="Berakhir">{tanggal(sub.currentPeriodEnd)}</InfoRow>
              <InfoRow label="Perpanjangan">
                {days != null ? `${Math.max(days, 0)} hari lagi` : "-"}
              </InfoRow>
              <InfoRow label="Metode">{metodePembayaran}</InfoRow>
            </div>

            {sub.cancelAtPeriodEnd ? (
              <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-inset ring-amber-600/20">
                Langganan akan berhenti pada akhir periode berjalan.
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/langganan/ubah">Tambah layanan lain</ButtonLink>
              <CancelSubscriptionButton cancelAtPeriodEnd={sub.cancelAtPeriodEnd} />
            </div>
          </Panel>
        </Reveal>

        <Reveal delay={80}>
          <Card className="h-full bg-gradient-to-b from-brand-50/80 to-white p-6">
            <h3 className="text-sm font-bold text-ink">Yang kamu dapatkan</h3>
            <ul className="mt-4 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-zinc-600">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={140}>
        <Panel innerClassName="overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <h3 className="text-sm font-bold text-ink">Tagihan langganan</h3>
            <ButtonLink href="/pembayaran" variant="ghost">
              Semua pembayaran
            </ButtonLink>
          </div>
          {/* Mobile: kartu tagihan (tabel memaksa scroll horizontal di ponsel) */}
          <div className="space-y-3 px-4 pb-4 md:hidden">
            {subInvoices.length ? (
              subInvoices.map((inv) => (
                <InvoiceRowCard
                  key={inv.id}
                  invoice={inv}
                  showItem={false}
                  payable={inv.status === "pending"}
                />
              ))
            ) : (
              <p className="py-4 text-center text-sm text-zinc-500">Belum ada tagihan.</p>
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-zinc-100 text-left text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                  <th className="px-6 py-3.5 font-semibold">Order</th>
                  <th className="px-6 py-3.5 font-semibold">Tanggal</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Jumlah</th>
                  <th className="px-6 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {subInvoices.map((inv) => (
                  <tr key={inv.id} className="transition-colors hover:bg-zinc-50/60">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-400">{inv.orderId}</td>
                    <td className="px-6 py-4 text-zinc-500">
                      {tanggal(inv.paidAt ?? inv.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-ink">
                      {idr(inv.grossAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Badge value={inv.status} />
                        {inv.status === "pending" ? (
                          <PendingInvoiceActions orderId={inv.orderId} align="start" />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {subInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-zinc-400">
                      Belum ada tagihan.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}
