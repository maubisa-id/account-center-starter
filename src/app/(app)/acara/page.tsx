import { getAccount } from "@/lib/account";
import { getEvents, getDirectusRegistrations } from "@/lib/events";
import { Reveal, SectionTitle, EmptyState } from "@/components/ui";
import { EventsBrowser, type BrowserEvent } from "@/components/dashboard/events-browser";
import { DbError, NoSeed } from "@/components/states";
import { IconCalendar } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Acara() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  const { events, source } = await getEvents();
  // Terdaftar bila ada entitlement acara di core ATAU baris pendaftaran di Directus (menautkan
  // pendaftaran lewat form website anonim yang emailnya sama dgn akun ini).
  const cmsRegs = await getDirectusRegistrations({ email: user.email, coreUserId: user.uuid });
  const registeredIds = [
    ...user.entitlements.filter((e) => e.itemType === "event" && e.itemRef).map((e) => e.itemRef as string),
    ...cmsRegs.map((r) => r.eventRef),
  ];

  const browserEvents: BrowserEvent[] = events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startsAt: e.startsAt,
    location: e.location,
    isFree: e.isFree,
    priceIdr: e.priceIdr,
    service: e.service,
    productCode: e.productCode,
    href: e.href,
  }));

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Acara"
        title="Acara Acme"
        desc="Daftar acara gratis (Free Events) dan berbayar (Events). Riwayat keikutsertaanmu tercatat otomatis."
      />

      {source === "sample" && process.env.NODE_ENV !== "production" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-700">
          Menampilkan contoh acara (Directus belum dikonfigurasi). Set <code>DIRECTUS_URL</code> &{" "}
          <code>DIRECTUS_TOKEN</code> untuk menarik acara asli dari CMS.
        </div>
      ) : null}

      {browserEvents.length === 0 ? (
        <EmptyState
          icon={<IconCalendar className="h-6 w-6" />}
          title="Belum ada acara"
          desc="Acara baru akan muncul di sini begitu tersedia."
        />
      ) : (
        <Reveal>
          <EventsBrowser
            events={browserEvents}
            registeredIds={registeredIds}
            identity={{ name: user.name, email: user.email, phone: user.phone }}
          />
        </Reveal>
      )}
    </div>
  );
}

