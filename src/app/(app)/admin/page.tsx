import { notFound } from "next/navigation";
import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { getAdminOverview, type AdminInvoiceRow } from "@/lib/admin-stats";
import { idr, tanggal } from "@/lib/format";
import { SectionTitle, StatCard, Panel, Badge, ButtonLink, EmptyState } from "@/components/ui";
import { DbError } from "@/components/states";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { IconReceipt, IconClock, IconUser, IconSparkle, IconCalendar, IconCheck } from "@/components/icons";

export const dynamic = "force-dynamic";

// Dashboard admin (landing setelah login untuk email di ADMIN_EMAILS). Ikhtisar pembayaran,
// pengguna, langganan + daftar yang perlu ditindak. Read-only. Gerbang: sesi + email admin.
export default async function AdminOverviewPage() {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) notFound();

  const { data, error } = await getAdminOverview();
  if (error) {
    return (
      <div className="space-y-8">
        <AdminTabs />
        <DbError error={error} />
      </div>
    );
  }
  const o = data!;

  return (
    <div className="space-y-8">
      <AdminTabs />
      <SectionTitle
        eyebrow="Admin"
        title="Ringkasan"
        desc="Ikhtisar pembayaran, pengguna, dan langganan Maubisa. Halaman ini hanya untuk dilihat."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<IconReceipt className="h-5 w-5" />}
          label="Pendapatan bulan ini"
          value={idr(o.revenueMonth)}
          hint={`${o.paidCountMonth} transaksi lunas`}
          accent="text-lime-600"
        />
        <StatCard
          icon={<IconClock className="h-5 w-5" />}
          label="Menunggu pembayaran"
          value={String(o.pendingCount)}
          hint={o.pendingSum > 0 ? `${idr(o.pendingSum)} belum masuk` : "Tidak ada tunggakan"}
          accent="text-amber-600"
        />
        <StatCard
          icon={<IconUser className="h-5 w-5" />}
          label="Pengguna"
          value={String(o.totalUsers)}
          hint={`+${o.newUsersMonth} bulan ini`}
        />
        <StatCard
          icon={<IconSparkle className="h-5 w-5" />}
          label="Langganan aktif"
          value={String(o.activeSubs)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/admin/payment-link">Buat Payment Link</ButtonLink>
        <ButtonLink href="/admin/acara" variant="ghost" icon={false}>
          Pendaftar Acara
        </ButtonLink>
      </div>

      <Panel innerClassName="p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <IconClock className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-bold text-ink">Perlu tindakan</h3>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Invoice yang belum dibayar. Kirim ulang tautan atau follow-up ke pelanggan.
        </p>
        <div className="mt-5">
          {o.pending.length === 0 ? (
            <EmptyState
              icon={<IconCheck className="h-6 w-6" />}
              title="Tidak ada tunggakan"
              desc="Semua pembayaran sudah lunas. Mantap."
            />
          ) : (
            <InvoiceTable rows={o.pending} />
          )}
        </div>
      </Panel>

      <Panel innerClassName="p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <IconReceipt className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-bold text-ink">Pembayaran terbaru</h3>
        </div>
        <p className="mt-1 text-sm text-zinc-500">10 transaksi terakhir dari semua jalur pembayaran.</p>
        <div className="mt-5">
          {o.recent.length === 0 ? (
            <EmptyState
              icon={<IconCalendar className="h-6 w-6" />}
              title="Belum ada transaksi"
              desc="Pembayaran akan muncul di sini begitu ada pesanan masuk."
            />
          ) : (
            <InvoiceTable rows={o.recent} />
          )}
        </div>
      </Panel>
    </div>
  );
}

// Tabel invoice ringkas (server). Dipakai untuk "Perlu tindakan" & "Pembayaran terbaru".
function InvoiceTable({ rows }: { rows: AdminInvoiceRow[] }) {
  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
            <th className="px-3 py-2 font-semibold">Tanggal</th>
            <th className="px-3 py-2 font-semibold">Pesanan</th>
            <th className="px-3 py-2 font-semibold">Pelanggan</th>
            <th className="px-3 py-2 text-right font-semibold">Jumlah</th>
            <th className="px-3 py-2 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.orderId} className="border-t border-black/[0.05]">
              <td className="whitespace-nowrap px-3 py-3 text-zinc-500">
                {r.createdAt ? tanggal(r.createdAt) : "-"}
              </td>
              <td className="px-3 py-3">
                <div className="font-medium text-ink">{r.itemName ?? "-"}</div>
                <div className="text-xs text-zinc-400">{r.orderId}</div>
              </td>
              <td className="px-3 py-3 text-zinc-600">{r.who ?? "-"}</td>
              <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-ink">
                {idr(r.amount)}
              </td>
              <td className="px-3 py-3">
                <Badge value={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
