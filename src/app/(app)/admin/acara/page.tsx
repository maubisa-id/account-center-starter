import { notFound } from "next/navigation";
import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { listEventRegistrations } from "@/lib/event-registrations";
import { SectionTitle, StatCard, EmptyState } from "@/components/ui";
import { IconCalendar, IconUser, IconReceipt, IconCheck } from "@/components/icons";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { RegistrationsTable } from "@/components/admin/registrations-table";

export const dynamic = "force-dynamic";

// Halaman admin: daftar pendaftar acara (gratis dari CMS + berbayar dari checkout).
// Read-only. Gerbang: sesi (grup (app)) + email admin (allowlist) -> non-admin 404.
export default async function AdminEventsPage() {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) notFound();

  const { rows, freeConfigured, freeError } = await listEventRegistrations();
  const gratis = rows.filter((r) => r.source === "free").length;
  const bayar = rows.filter((r) => r.source === "paid").length;
  const lunas = rows.filter(
    (r) => r.source === "paid" && (r.status === "paid" || r.status === "settlement"),
  ).length;

  return (
    <div className="space-y-8">
      <AdminTabs />
      <SectionTitle
        eyebrow="Admin"
        title="Pendaftar Acara"
        desc="Gabungan pendaftar gratis (dari website) dan berbayar (dari checkout). Halaman ini hanya untuk dilihat."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<IconCalendar className="h-5 w-5" />} label="Total" value={String(rows.length)} />
        <StatCard icon={<IconUser className="h-5 w-5" />} label="Gratis" value={String(gratis)} />
        <StatCard icon={<IconReceipt className="h-5 w-5" />} label="Berbayar" value={String(bayar)} />
        <StatCard icon={<IconCheck className="h-5 w-5" />} label="Lunas" value={String(lunas)} />
      </div>

      {!freeConfigured ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-inset ring-amber-500/20">
          Pendaftar gratis dari CMS tidak ditampilkan di lingkungan ini (mis. demo). Yang tampil hanya pendaftar berbayar.
        </p>
      ) : null}
      {freeError ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-inset ring-rose-500/20">
          Gagal membaca pendaftar gratis dari CMS. Coba muat ulang nanti.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={<IconCalendar className="h-6 w-6" />}
          title="Belum ada pendaftar"
          desc="Pendaftar acara akan muncul di sini begitu ada yang mendaftar (gratis) atau membayar (berbayar)."
        />
      ) : (
        <RegistrationsTable rows={rows} />
      )}
    </div>
  );
}
