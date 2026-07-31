"use client";

import { useMemo, useState } from "react";
import { idr, tanggalPanjang } from "@/lib/format";
import { Card, Badge, Reveal, ButtonLink } from "@/components/ui";
import { RegisterEventButton } from "@/components/dashboard/register-event";
import { IconCalendar, IconGlobe } from "@/components/icons";

export type BrowserEvent = {
  id: string;
  title: string;
  description?: string | null;
  startsAt?: string | null;
  location?: string | null;
  isFree: boolean;
  priceIdr?: number | null;
  service?: string | null;
  productCode?: string | null;
  href?: string | null;
};

type Identity = { name: string; email: string; phone: string | null };

// Label kategori selaras dengan web utama (eventsData.ts). Fallback: rapikan slug.
const CATEGORY_LABEL: Record<string, string> = {
  akademik: "Akademik",
  "pengembangan-diri": "Pengembangan Diri",
  sertifikasi: "Kelas & Sertifikasi",
};

function labelFor(service: string): string {
  return (
    CATEGORY_LABEL[service] ??
    service
      .split(/[-_\s]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

export function EventsBrowser({
  events,
  registeredIds,
  identity,
}: {
  events: BrowserEvent[];
  registeredIds: string[];
  identity: Identity;
}) {
  const [cat, setCat] = useState<string>("semua");
  const registered = useMemo(() => new Set(registeredIds), [registeredIds]);

  // Kategori yang benar-benar ada di data (urut sesuai kemunculan), plus "Semua".
  const cats = useMemo(() => {
    const seen: string[] = [];
    for (const e of events) {
      const s = e.service?.trim();
      if (s && !seen.includes(s)) seen.push(s);
    }
    return [{ id: "semua", label: "Semua" }, ...seen.map((s) => ({ id: s, label: labelFor(s) }))];
  }, [events]);

  const shown = cat === "semua" ? events : events.filter((e) => e.service === cat);

  return (
    <div className="space-y-6">
      {cats.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => {
            const on = cat === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCat(c.id)}
                aria-pressed={on}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  on
                    ? "bg-brand-500 text-white shadow-soft"
                    : "bg-white text-zinc-600 ring-1 ring-inset ring-black/[0.08] hover:text-ink"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((ev, i) => {
          const isReg = registered.has(ev.id);
          // Target checkout diturunkan dari id acara. CMS boleh menimpa lewat `href`, TAPI hanya
          // path internal (mulai "/" bukan "//") yang dihormati -> cegah open-redirect dari CMS.
          const derivedHref = `/checkout?event=${encodeURIComponent(ev.id)}${
            ev.productCode ? `&product=${encodeURIComponent(ev.productCode)}` : ""
          }`;
          const safeCmsHref =
            ev.href && ev.href.startsWith("/") && !ev.href.startsWith("//") ? ev.href : null;
          const paidHref = safeCmsHref ?? derivedHref;
          return (
            <Reveal key={ev.id} delay={i * 50}>
              <Card className="flex h-full flex-col p-6">
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-black/[0.04]">
                    <IconCalendar className="h-5 w-5" />
                  </span>
                  <div className="flex items-center gap-2">
                    {ev.service ? (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-semibold text-zinc-500 ring-1 ring-inset ring-zinc-500/15">
                        {labelFor(ev.service)}
                      </span>
                    ) : null}
                    <Badge value={ev.isFree ? "gratis" : "berbayar"} />
                  </div>
                </div>
                <div className="mt-4 text-[15px] font-semibold text-ink">{ev.title}</div>
                {ev.description ? (
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-zinc-500">{ev.description}</p>
                ) : (
                  <div className="flex-1" />
                )}
                <div className="mt-3 space-y-1 text-xs text-zinc-500">
                  {ev.startsAt ? (
                    <div className="flex items-center gap-1.5">
                      <IconCalendar className="h-3.5 w-3.5" /> {tanggalPanjang(new Date(ev.startsAt))}
                    </div>
                  ) : null}
                  {ev.location ? (
                    <div className="flex items-center gap-1.5">
                      <IconGlobe className="h-3.5 w-3.5" /> {ev.location}
                    </div>
                  ) : null}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                  <div className="text-sm font-bold text-ink">
                    {ev.isFree ? "Gratis" : idr(ev.priceIdr ?? 0)}
                  </div>
                  {ev.isFree ? (
                    <RegisterEventButton
                      eventId={ev.id}
                      eventTitle={ev.title}
                      registered={isReg}
                      identity={identity}
                    />
                  ) : isReg ? (
                    <span className="rounded-full bg-lime-50 px-4 py-2 text-sm font-semibold text-lime-700 ring-1 ring-inset ring-lime-600/20">
                      Terdaftar
                    </span>
                  ) : (
                    <ButtonLink href={paidHref}>Daftar &amp; bayar</ButtonLink>
                  )}
                </div>
              </Card>
            </Reveal>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">Belum ada acara di kategori ini.</p>
      ) : null}
    </div>
  );
}
