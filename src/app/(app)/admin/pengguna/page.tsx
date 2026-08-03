import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { listUsers } from "@/lib/admin-users";
import { tanggal } from "@/lib/format";
import { SectionTitle, Panel, Badge, EmptyState } from "@/components/ui";
import { DbError } from "@/components/states";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { ScopeFilter } from "@/components/admin/scope-filter";
import { IconUser, IconSearch } from "@/components/icons";

export const dynamic = "force-dynamic";

// Halaman admin: telusuri pengguna (cari nama/email) lalu buka detailnya. Read-only.
// Gerbang: sesi (grup app) + email admin (allowlist) -> non-admin 404.
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; scope?: string }>;
}) {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) notFound();

  const { q, scope } = await searchParams;
  const { data, error } = await listUsers(q, scope);

  return (
    <div className="space-y-8">
      <AdminTabs />
      <SectionTitle
        eyebrow="Admin"
        title="Pengguna"
        desc="Telusuri pelanggan lalu buka detail langganan, tagihan, dan akses mereka. Halaman ini hanya untuk dilihat."
      />

      <form method="get" className="flex max-w-md items-center gap-2">
        {scope ? <input type="hidden" name="scope" value={scope} /> : null}
        <div className="flex flex-1 items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm shadow-soft ring-1 ring-black/[0.08] focus-within:ring-brand-300">
          <IconSearch className="h-4 w-4 text-zinc-400" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Cari nama atau email..."
            aria-label="Cari pengguna"
            className="w-full bg-transparent text-ink placeholder:text-zinc-400 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition-colors hover:bg-brand-600"
        >
          Cari
        </button>
      </form>

      <ScopeFilter basePath="/admin/pengguna" current={scope} params={{ q }} />

      {error ? (
        <DbError error={error} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<IconUser className="h-6 w-6" />}
          title={q ? "Tidak ada pengguna cocok" : "Belum ada pengguna"}
          desc={q ? `Tidak ada hasil untuk "${q}". Coba kata kunci lain.` : "Pengguna akan muncul di sini begitu ada yang mendaftar."}
        />
      ) : (
        <Panel innerClassName="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                  <th className="px-5 py-3.5 font-semibold">Nama</th>
                  <th className="px-5 py-3.5 font-semibold">Bergabung</th>
                  <th className="px-5 py-3.5 text-center font-semibold">Langganan</th>
                  <th className="px-5 py-3.5 text-center font-semibold">Tagihan</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {data.map((u) => (
                  <tr key={u.uuid} className="transition-colors hover:bg-zinc-50/60">
                    <td className="px-5 py-4">
                      <Link href={`/admin/pengguna/${u.uuid}`} className="group block">
                        <div className="font-semibold text-ink group-hover:text-brand-600">{u.name || "—"}</div>
                        <div className="text-xs text-zinc-500">{u.email}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-zinc-500">{tanggal(u.createdAt)}</td>
                    <td className="px-5 py-4 text-center text-zinc-600">{u.subsCount}</td>
                    <td className="px-5 py-4 text-center text-zinc-600">{u.invoiceCount}</td>
                    <td className="px-5 py-4">
                      <Badge value={u.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
