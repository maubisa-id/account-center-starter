import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { getUserDetail } from "@/lib/admin-users";
import { idr, tanggal, metodeBayar, namaProduk, namaLayanan } from "@/lib/format";
import { SectionTitle, Panel, Badge, StatCard, EmptyState, InfoRow } from "@/components/ui";
import { DbError } from "@/components/states";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { GrantAccessForm, RevokeButton } from "@/components/admin/entitlement-actions";
import { IconReceipt, IconSparkle, IconAccess, IconDownload, IconUser } from "@/components/icons";

export const dynamic = "force-dynamic";

// Halaman admin: detail satu pengguna — profil ringkas + langganan + tagihan (tautan cetak
// invoice) + hak akses. Read-only. Gerbang: sesi (grup app) + email admin -> non-admin 404.
export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) notFound();

  const { uuid } = await params;
  const { data, error, notFound: missing } = await getUserDetail(uuid);
  if (missing) notFound();

  return (
    <div className="space-y-8">
      <AdminTabs />

      <div className="text-sm">
        <Link href="/admin/pengguna" className="font-medium text-brand-600 hover:underline">
          &larr; Kembali ke daftar pengguna
        </Link>
      </div>

      {error ? (
        <DbError error={error} />
      ) : (
        <UserDetail data={data!} />
      )}
    </div>
  );
}

function UserDetail({ data }: { data: NonNullable<Awaited<ReturnType<typeof getUserDetail>>["data"]> }) {
  const { user, totalPaid } = data;
  const activeSubs = user.subscriptions.filter((s) => s.status === "active").length;
  const activeEnts = user.entitlements.filter((e) => e.status === "active").length;

  return (
    <>
      <SectionTitle eyebrow="Admin · Pengguna" title={user.name || "Tanpa nama"} desc={user.email} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<IconReceipt className="h-5 w-5" />} label="Total dibayar" value={idr(totalPaid)} accent="text-lime-600" />
        <StatCard icon={<IconSparkle className="h-5 w-5" />} label="Langganan aktif" value={String(activeSubs)} />
        <StatCard icon={<IconAccess className="h-5 w-5" />} label="Akses aktif" value={String(activeEnts)} />
        <StatCard icon={<IconUser className="h-5 w-5" />} label="Status akun" value={<Badge value={user.status} />} />
      </div>

      <Panel innerClassName="p-6 sm:p-7">
        <h3 className="text-sm font-bold text-ink">Profil</h3>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Email">{user.email}</InfoRow>
          <InfoRow label="Telepon">{user.phone || "—"}</InfoRow>
          <InfoRow label="Kota">{user.city || "—"}</InfoRow>
          <InfoRow label="Bergabung">{tanggal(user.createdAt)}</InfoRow>
          <InfoRow label="Email terverifikasi">{user.emailVerifiedAt ? tanggal(user.emailVerifiedAt) : "Belum"}</InfoRow>
          <InfoRow label="ID Pengguna"><span className="font-mono text-xs">{user.uuid}</span></InfoRow>
        </div>
      </Panel>

      <Panel innerClassName="p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <IconSparkle className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-bold text-ink">Langganan</h3>
        </div>
        <div className="mt-5">
          {user.subscriptions.length === 0 ? (
            <EmptyState icon={<IconSparkle className="h-6 w-6" />} title="Belum ada langganan" />
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                    <th className="px-3 py-2">Produk</th>
                    <th className="px-3 py-2">Interval</th>
                    <th className="px-3 py-2 text-right">Nominal</th>
                    <th className="px-3 py-2">Periode berakhir</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {user.subscriptions.map((s) => (
                    <tr key={s.id} className="border-t border-black/[0.05]">
                      <td className="px-3 py-3 font-medium text-ink">{namaProduk(s.productCode)}</td>
                      <td className="px-3 py-3 text-zinc-500">{s.interval}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-ink">{idr(s.amount)}</td>
                      <td className="px-3 py-3 text-zinc-500">{tanggal(s.currentPeriodEnd)}</td>
                      <td className="px-3 py-3"><Badge value={s.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <Panel innerClassName="p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <IconReceipt className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-bold text-ink">Tagihan</h3>
        </div>
        <div className="mt-5">
          {user.invoices.length === 0 ? (
            <EmptyState icon={<IconReceipt className="h-6 w-6" />} title="Belum ada tagihan" />
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Metode</th>
                    <th className="px-3 py-2">Tanggal</th>
                    <th className="px-3 py-2 text-right">Jumlah</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"><span className="sr-only">Invoice</span></th>
                  </tr>
                </thead>
                <tbody>
                  {user.invoices.map((inv) => (
                    <tr key={inv.id} className="border-t border-black/[0.05]">
                      <td className="px-3 py-3 font-mono text-xs text-zinc-400">{inv.orderId}</td>
                      <td className="px-3 py-3 font-medium text-ink">{inv.itemName ?? namaProduk(inv.productCode)}</td>
                      <td className="px-3 py-3 text-zinc-500">{metodeBayar(inv.paymentType)}</td>
                      <td className="px-3 py-3 text-zinc-500">{tanggal(inv.paidAt ?? inv.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-ink">{idr(inv.grossAmount)}</td>
                      <td className="px-3 py-3"><Badge value={inv.status} /></td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/invoice/${inv.orderId}`}
                          aria-label={`Buka invoice ${inv.orderId}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 ring-1 ring-black/[0.06] transition-colors hover:text-ink"
                        >
                          <IconDownload className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>

      <Panel innerClassName="p-6 sm:p-7">
        <div className="flex items-center gap-2">
          <IconAccess className="h-4 w-4 text-brand-500" />
          <h3 className="text-sm font-bold text-ink">Hak akses</h3>
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          Beri akses manual (mis. kompensasi) atau cabut akses. Setiap tindakan tercatat di audit.
        </p>
        <div className="mt-4">
          <GrantAccessForm userUuid={user.uuid} />
        </div>
        <div className="mt-5">
          {user.entitlements.length === 0 ? (
            <EmptyState icon={<IconAccess className="h-6 w-6" />} title="Belum ada hak akses" />
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
                    <th className="px-3 py-2">Layanan</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Sumber</th>
                    <th className="px-3 py-2">Berlaku s/d</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody>
                  {user.entitlements.map((e) => (
                    <tr key={e.id} className="border-t border-black/[0.05]">
                      <td className="px-3 py-3 font-medium text-ink">{namaLayanan(e.scope)}</td>
                      <td className="px-3 py-3 text-zinc-500">{e.itemRef ?? namaProduk(e.productCode)}</td>
                      <td className="px-3 py-3 text-zinc-500">{e.source}</td>
                      <td className="px-3 py-3 text-zinc-500">{e.expiresAt ? tanggal(e.expiresAt) : "Selamanya"}</td>
                      <td className="px-3 py-3"><Badge value={e.status} /></td>
                      <td className="px-3 py-3 text-right">
                        {e.status === "active" ? (
                          <RevokeButton userUuid={user.uuid} entitlementId={e.id} />
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Panel>
    </>
  );
}
