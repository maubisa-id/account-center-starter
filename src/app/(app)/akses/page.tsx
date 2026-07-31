import { getAccount } from "@/lib/account";
import { tanggal, sisaHari, judulEntitlement, subjudulEntitlement } from "@/lib/format";
import { activeServices, launchFor } from "@/lib/services";
import { effectiveEntitlementStatus } from "@/lib/entitlement";
import { eventTitleMap } from "@/lib/events";
import { Card, Badge, Reveal, SectionTitle, EmptyState } from "@/components/ui";
import { ServiceLauncher } from "@/components/dashboard/service-launcher";
import { DbError, NoSeed } from "@/components/states";
import { IconAccess, IconArrow } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Akses() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  const ents = user.entitlements;
  const services = activeServices(ents);
  const invoiceById = new Map(user.invoices.map((i) => [i.id, i] as const));
  const eventTitles = await eventTitleMap();

  // Judul akses: nama produk -> nama item invoice -> judul acara (CMS) -> slug dirapikan.
  const namaAkses = (e: (typeof ents)[number]) =>
    judulEntitlement({
      productCode: e.productCode,
      itemRef: e.itemRef,
      itemName:
        (e.invoiceId ? invoiceById.get(e.invoiceId)?.itemName : null) ??
        (e.itemType === "event" && e.itemRef ? eventTitles.get(e.itemRef) : null),
    });

  return (
    <div className="space-y-10">
      <SectionTitle
        eyebrow="Akses"
        title="Akses & layanan"
        desc="Buka layanan Acme yang aktif, lalu lihat rincian hak aksesmu."
      />

      <ServiceLauncher services={services} heading="Buka layanan" subheading="Layanan Acme yang aktif untukmu. Satu login untuk semuanya." />

      <section className="space-y-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
          Rincian akses
        </div>
        {ents.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ents.map((e, i) => {
              const days = sisaHari(e.expiresAt);
              const target = launchFor(e);
              return (
                <Reveal key={e.id} delay={i * 60}>
                  <Card className="group flex h-full flex-col p-5 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-lift">
                    <div className="flex items-start justify-between">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-black/[0.04]">
                        <IconAccess className="h-5 w-5" />
                      </span>
                      <Badge value={effectiveEntitlementStatus(e)} />
                    </div>
                    <div className="mt-4 truncate text-[15px] font-semibold text-ink">
                      {namaAkses(e)}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {subjudulEntitlement({
                        itemType: e.itemType,
                        productCode: e.productCode,
                        scope: e.scope,
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
                      <div className="text-xs text-zinc-500">
                        {e.expiresAt ? (
                          <>
                            Berlaku sampai{" "}
                            <span className="font-medium text-ink">{tanggal(e.expiresAt)}</span>
                            {days != null && days >= 0 ? (
                              <span className="text-zinc-400"> · {days} hari lagi</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="font-medium text-brand-700">Akses tanpa batas</span>
                        )}
                      </div>
                      {target ? (
                        <a
                          href={target.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600 transition-colors hover:text-brand-700"
                        >
                          Buka
                          <IconArrow className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </div>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<IconAccess className="h-6 w-6" />}
            title="Belum ada akses"
            desc="Akses akan muncul di sini setelah kamu berlangganan atau membeli produk."
          />
        )}
      </section>
    </div>
  );
}
