import Link from "next/link";
import { getAccount } from "@/lib/account";
import { serviceUrl, consultUrl, type ServiceKey } from "@/lib/services";
import { getCatalog } from "@/lib/products";
import { SectionTitle } from "@/components/ui";
import { CatalogBrowser, type BrowserItem } from "@/components/dashboard/catalog-browser";
import { DbError, NoSeed } from "@/components/states";
import { IconChevron } from "@/components/icons";

export const dynamic = "force-dynamic";

const SCOPES: ServiceKey[] = ["app", "kelas", "thesis", "book"];

export default async function UbahPaket() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  const activeCodes = new Set<string>();
  for (const s of user.subscriptions) if (s.status === "active") activeCodes.add(s.productCode);
  for (const e of user.entitlements)
    if (e.status === "active" && e.productCode) activeCodes.add(e.productCode);
  const hasPlus = activeCodes.has("mbg-plus");

  // URL CTA eksternal (daftar/konsultasi) diresolusi di SERVER supaya klien tak baca env.
  const serviceUrls = Object.fromEntries(SCOPES.map((k) => [k, serviceUrl(k)])) as Record<
    ServiceKey,
    string
  >;

  const items: BrowserItem[] = (await getCatalog())
    .filter((i) => i.status !== "off")
    .map((i) => ({
      ...i,
      // CTA "konsultasi" (mis. bimbingan skripsi) mengarah ke WhatsApp selama Payment Link
      // belum aktif; CTA "daftar" mengarah ke halaman layanannya. Diresolusi di SERVER.
      ctaUrl:
        i.cta === "consult"
          ? consultUrl(i.scope as ServiceKey)
          : (SCOPES as string[]).includes(i.scope)
            ? serviceUrls[i.scope as ServiceKey]
            : null,
    }));

  return (
    <div className="space-y-8">
      <Link
        href="/langganan"
        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-ink"
      >
        <IconChevron className="h-3.5 w-3.5 rotate-180" />
        Kembali ke Langganan
      </Link>

      <SectionTitle
        eyebrow="Katalog layanan"
        title="Semua layanan Maubisa"
        desc="Langganan MBG+, ikut kelas & sertifikasi, mulai bimbingan skripsi, atau jelajahi Book Universe. Setiap layanan berdiri sendiri, jadi menambah satu layanan tidak mengubah langganan lain yang sedang aktif. Pilih kategori untuk memfilter."
      />

      <CatalogBrowser items={items} activeCodes={[...activeCodes]} hasPlus={hasPlus} />

      <p className="text-xs leading-relaxed text-zinc-400">
        Layanan berlangganan &amp; sekali beli dibayar dengan aman lewat Midtrans. Untuk bimbingan
        skripsi, mulai dengan konsultasi gratis via WhatsApp untuk memilih paket yang pas. Begitu
        pembayaran paket aktif, layanannya langsung muncul di halaman &quot;Akses&quot; dan bisa
        kamu buka dari sana. Item bertanda &quot;Segera hadir&quot; akan aktif begitu tersedia.
      </p>
    </div>
  );
}
