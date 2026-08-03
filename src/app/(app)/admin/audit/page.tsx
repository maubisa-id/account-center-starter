import { notFound } from "next/navigation";
import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { listAudit } from "@/lib/audit";
import { tanggal } from "@/lib/format";
import { SectionTitle, Panel, EmptyState } from "@/components/ui";
import { DbError } from "@/components/states";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { IconShieldCheck } from "@/components/icons";

export const dynamic = "force-dynamic";

// Jejak audit aksi admin sensitif (beri/cabut akses, dll). Read-only, admin-gated.
const ACTION_LABEL: Record<string, string> = {
  grant_manual: "Beri akses manual",
  revoke_entitlement: "Cabut hak akses",
  create_payment_link: "Buat Payment Link",
  data_export: "Ekspor data pribadi",
  account_deletion: "Hapus akun",
  suspend: "Suspend akun",
  role_change: "Ubah peran",
};

export default async function AdminAuditPage() {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) notFound();

  const { data, error } = await listAudit(150);

  return (
    <div className="space-y-8">
      <AdminTabs />
      <SectionTitle
        eyebrow="Admin"
        title="Jejak Audit"
        desc="Catatan tindakan admin yang sensitif (beri/cabut akses, dll). Hanya untuk dilihat."
      />

      {error ? (
        <DbError error={error} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<IconShieldCheck className="h-6 w-6" />}
          title="Belum ada catatan"
          desc="Tindakan admin akan tercatat di sini begitu ada yang dilakukan."
        />
      ) : (
        <Panel innerClassName="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-[11px] uppercase tracking-[0.12em] text-zinc-400">
                  <th className="px-5 py-3.5 font-semibold">Waktu</th>
                  <th className="px-5 py-3.5 font-semibold">Admin</th>
                  <th className="px-5 py-3.5 font-semibold">Tindakan</th>
                  <th className="px-5 py-3.5 font-semibold">Target</th>
                  <th className="px-5 py-3.5 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {data.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-3.5 text-zinc-500">{tanggal(r.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-ink">{r.actorName ?? "Sistem"}</div>
                      {r.actorEmail ? <div className="text-xs text-zinc-400">{r.actorEmail}</div> : null}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-ink">{ACTION_LABEL[r.action] ?? r.action}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-zinc-500">{r.target ?? "-"}</td>
                    <td className="px-5 py-3.5 text-xs text-zinc-500">
                      {r.metadata ? (
                        <span className="break-all">
                          {Object.entries(r.metadata)
                            .filter(([, v]) => v != null && v !== "")
                            .map(([k, v]) => `${k}: ${String(v)}`)
                            .join(" · ")}
                        </span>
                      ) : (
                        "-"
                      )}
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
