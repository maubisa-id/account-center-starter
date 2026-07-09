import { notFound } from "next/navigation";
import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { idr } from "@/lib/format";
import { SectionTitle } from "@/components/ui";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { PaymentLinkForm } from "@/components/admin/paylink-form";

export const dynamic = "force-dynamic";

// Buat Payment Link (pembayaran sekali) lalu kirim ke pelanggan lewat WhatsApp. Saat dibayar,
// akun & akses aktif otomatis. Gerbang: sesi (grup (app)) + email admin (allowlist) -> non-admin 404.
export default async function AdminPaymentLinkPage() {
  const email = await getSessionEmail();
  if (!isAdminEmail(email)) notFound();

  const rows = await prisma.product.findMany({
    where: { active: true, type: { not: "subscription" } },
    select: { code: true, name: true, price: true },
    orderBy: { price: "asc" },
  });
  const products = rows.map((p) => ({ code: p.code, label: `${p.name} (${idr(p.price)})` }));

  return (
    <div className="space-y-8">
      <AdminTabs />
      <SectionTitle
        eyebrow="Admin"
        title="Buat Payment Link"
        desc="Buat link pembayaran lalu kirim ke pelanggan lewat WhatsApp. Saat dibayar, akun & akses aktif otomatis."
      />
      <PaymentLinkForm products={products} />
    </div>
  );
}
