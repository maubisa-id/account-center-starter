import Link from "next/link";
import { getAccount } from "@/lib/account";
import { idr, tanggal, sisaHari, namaProduk, judulEntitlement, subjudulEntitlement, namaProvider } from "@/lib/format";
import { isEntitlementActive } from "@/lib/entitlement";
import { activeServices } from "@/lib/services";
import { eventTitleMap } from "@/lib/events";
import {
  Panel,
  Card,
  StatCard,
  Badge,
  InfoRow,
  ButtonLink,
  Reveal,
  Eyebrow,
} from "@/components/ui";
import { DbError, NoSeed } from "@/components/states";
import { PendingPaymentBanner } from "@/components/dashboard/pending-payment-banner";
import { ServiceLauncher } from "@/components/dashboard/service-launcher";
import {
  IconSparkle,
  IconAccess,
  IconReceipt,
  IconCalendar,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Ringkasan() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  const sub = user.subscriptions[0];
  const paid = user.invoices.filter(
    (i) => i.status === "paid" || i.status === "settlement",
  );
  const pendingInvoices = user.invoices.filter((i) => i.status === "pending");
  const firstPending = pendingInvoices[0];
  const totalPaid = paid.reduce((s, i) => s + Number(i.grossAmount), 0);
  const aksesAktif = user.entitlements.filter((e) => isEntitlementActive(e)).length;
  // Layanan yang AKTIF dimiliki user → peluncur "Layanan saya" (gerbang SSO ke dashboard produk).
  // Sumber sama dengan /akses (lib/services) supaya nama & perilaku konsisten.
  const services = activeServices(user.entitlements);
  const days = sisaHari(sub?.currentPeriodEnd ?? null);
  const firstName = user.name.split(/\s+/)[0];
  // Pintasan "Akses aktif": hak akses yang dimiliki (mis. Pro, webinar) untuk pratinjau cepat →
  // /akses. Beda dari launcher di atas: launcher = BUKA dashboard produk; ini = APA yang dimiliki.
  const invoiceById = new Map(user.invoices.map((i) => [i.id, i] as const));
  const eventTitles = await eventTitleMap();
  const aktifEnts = user.entitlements.filter((e) => isEntitlementActive(e)).slice(0, 4);
  const namaAkses = (e: (typeof user.entitlements)[number]) =>
    judulEntitlement({
      productCode: e.productCode,
      itemRef: e.itemRef,
      itemName:
        (e.invoiceId ? invoiceById.get(e.invoiceId)?.itemName : null) ??
        (e.itemType === "event" && e.itemRef ? eventTitles.get(e.itemRef) : null),
    });

  return (
    <div className="space-y-10">
      <PendingPaymentBanner count={pendingInvoices.length} orderId={firstPending?.orderId} />
      <Reveal className="flex flex-wrap items-end justify-between gap-6">
        <div className="space-y-4">
          <Eyebrow>Selamat datang kembali</Eyebrow>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Halo, {firstName}.
          </h1>
          <p className="max-w-lg text-sm leading-relaxed text-zinc-500">
            Selamat melanjutkan langkahmu bersama Acme. Dari sini kamu bisa lanjut belajar,
            kelola langganan, pantau akses, dan selesaikan pembayaran, semuanya di satu tempat.
          </p>
        </div>
        <ButtonLink href="/langganan">Kelola langganan</ButtonLink>
      </Reveal>

      <ServiceLauncher
        services={services}
        onlyEnabled
        heading="Lanjutkan belajar"
        subheading="Buka layanan yang aktif untukmu. Cukup satu login."
      />

      <Reveal delay={80} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<IconSparkle className="h-5 w-5" />}
          label="Langganan"
          value={sub ? "Aktif" : "Tidak ada"}
          hint={sub ? namaProduk(sub.productCode) : "Belum berlangganan"}
        />
        <StatCard
          icon={<IconAccess className="h-5 w-5" />}
          label="Akses aktif"
          value={aksesAktif}
          hint="paket yang aktif"
          accent="text-lime-600"
        />
        <StatCard
          icon={<IconReceipt className="h-5 w-5" />}
          label="Total dibayar"
          value={idr(totalPaid)}
          hint={`${paid.length} transaksi`}
          accent="text-brand-500"
        />
        <StatCard
          icon={<IconCalendar className="h-5 w-5" />}
          label="Perpanjangan"
          value={days != null ? `${Math.max(days, 0)} hari` : "-"}
          hint={sub?.currentPeriodEnd ? tanggal(sub.currentPeriodEnd) : "Tidak terjadwal"}
          accent="text-amber-600"
        />
      </Reveal>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Reveal delay={140} className="lg:col-span-2">
          <Panel className="h-full" innerClassName="p-6 sm:p-8 h-full">
            {sub ? (
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                      Langganan aktif
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
                <div className="mt-6 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-6 sm:grid-cols-3">
                  <InfoRow label="Mulai">{tanggal(sub.currentPeriodStart)}</InfoRow>
                  <InfoRow label="Berakhir">{tanggal(sub.currentPeriodEnd)}</InfoRow>
                  <InfoRow label="Metode">{namaProvider(sub.provider)}</InfoRow>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <ButtonLink href="/langganan">Detail langganan</ButtonLink>
                  <ButtonLink href="/pembayaran" variant="ghost">
                    Lihat tagihan
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-lg font-semibold text-ink">Belum ada langganan aktif</p>
                <p className="mt-1 text-sm text-zinc-500">
                  Aktifkan Pro untuk membuka semua fitur.
                </p>
                <div className="mt-5 flex justify-center">
                  <ButtonLink href="/langganan/ubah">Jelajahi paket</ButtonLink>
                </div>
              </div>
            )}
          </Panel>
        </Reveal>

        <Reveal delay={200}>
          <Panel className="h-full" innerClassName="p-6 h-full">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Pembayaran terakhir</h3>
              <Link
                href="/pembayaran"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Semua
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {user.invoices.slice(0, 4).map((inv) => (
                <div key={inv.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-50 text-zinc-500 ring-1 ring-black/[0.04]">
                    <IconReceipt className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink">
                      {inv.itemName ?? namaProduk(inv.productCode)}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {tanggal(inv.paidAt ?? inv.createdAt)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-ink">{idr(inv.grossAmount)}</div>
                </div>
              ))}
              {user.invoices.length === 0 ? (
                <p className="text-sm text-zinc-400">Belum ada transaksi.</p>
              ) : null}
            </div>
          </Panel>
        </Reveal>
      </div>

      {aktifEnts.length ? (
        <Reveal delay={240} className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-ink">Akses aktif</h2>
              <p className="mt-0.5 text-sm text-zinc-500">Hak akses yang kamu miliki saat ini.</p>
            </div>
            <Link
              href="/akses"
              className="shrink-0 text-sm font-semibold text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
            >
              Lihat semua
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {aktifEnts.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-black/[0.04]">
                    <IconAccess className="h-4 w-4" />
                  </span>
                  <Badge value={e.status} />
                </div>
                <div className="mt-3 truncate text-sm font-semibold text-ink">{namaAkses(e)}</div>
                <div className="text-xs text-zinc-500">
                  {subjudulEntitlement({
                    itemType: e.itemType,
                    productCode: e.productCode,
                    scope: e.scope,
                  })}
                </div>
              </Card>
            ))}
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}
