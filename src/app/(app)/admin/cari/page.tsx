import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { searchAdmin } from "@/lib/admin-search";
import { idr, namaProduk } from "@/lib/format";
import { SectionTitle, Panel, Badge, EmptyState } from "@/components/ui";
import { DbError } from "@/components/states";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { IconSearch, IconUser, IconReceipt } from "@/components/icons";

export const dynamic = "force-dynamic";

// Pencarian admin global: satu kotak -> pengguna (nama/email) + invoice (order ID).
// Read-only. Gerbang: sesi (grup app) + email admin (allowlist) -> non-admin 404.
export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) notFound();

  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const { data, error } = await searchAdmin(term);

  return (
    <div className="space-y-8">
      <AdminTabs />
      <SectionTitle
        eyebrow="Admin"
        title="Pencarian"
        desc="Cari pelanggan berdasarkan nama/email, atau tagihan berdasarkan order ID."
      />

      <form method="get" className="flex max-w-xl items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm shadow-soft ring-1 ring-black/[0.08] focus-within:ring-brand-300">
          <IconSearch className="h-4 w-4 text-zinc-400" />
          <input
            type="search"
            name="q"
            defaultValue={term}
            placeholder="Nama, email, atau order ID..."
            aria-label="Pencarian admin"
            className="w-full bg-transparent text-ink placeholder:text-zinc-400 focus:outline-none"
          />
        </div>
        <button type="submit" className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition-colors hover:bg-brand-600">
          Cari
        </button>
      </form>

      {error ? (
        <DbError error={error} />
      ) : !term ? (
        <EmptyState icon={<IconSearch className="h-6 w-6" />} title="Ketik kata kunci" desc="Masukkan nama, email, atau order ID untuk mencari." />
      ) : (data!.users.length === 0 && data!.invoices.length === 0) ? (
        <EmptyState icon={<IconSearch className="h-6 w-6" />} title="Tidak ada hasil" desc={`Tidak ada pengguna atau tagihan cocok untuk "${term}".`} />
      ) : (
        <>
          <Panel innerClassName="p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <IconUser className="h-4 w-4 text-brand-500" />
              <h3 className="text-sm font-bold text-ink">Pengguna ({data!.users.length})</h3>
            </div>
            <div className="mt-4 space-y-1">
              {data!.users.length === 0 ? (
                <p className="text-sm text-zinc-400">Tidak ada pengguna cocok.</p>
              ) : (
                data!.users.map((u) => (
                  <Link
                    key={u.uuid}
                    href={`/admin/pengguna/${u.uuid}`}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-zinc-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-ink">{u.name || "—"}</span>
                      <span className="block truncate text-xs text-zinc-500">{u.email}</span>
                    </span>
                    <Badge value={u.status} />
                  </Link>
                ))
              )}
            </div>
          </Panel>

          <Panel innerClassName="p-6 sm:p-7">
            <div className="flex items-center gap-2">
              <IconReceipt className="h-4 w-4 text-brand-500" />
              <h3 className="text-sm font-bold text-ink">Tagihan ({data!.invoices.length})</h3>
            </div>
            <div className="mt-4 space-y-1">
              {data!.invoices.length === 0 ? (
                <p className="text-sm text-zinc-400">Tidak ada tagihan cocok.</p>
              ) : (
                data!.invoices.map((inv) => (
                  <Link
                    key={inv.orderId}
                    href={`/invoice/${inv.orderId}`}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-zinc-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{inv.itemName ?? namaProduk(null)}</span>
                      <span className="block truncate font-mono text-xs text-zinc-400">{inv.orderId}</span>
                      {inv.who ? <span className="block truncate text-xs text-zinc-500">{inv.who}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="font-semibold text-ink">{idr(inv.amount)}</span>
                      <Badge value={inv.status} />
                    </span>
                  </Link>
                ))
              )}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
