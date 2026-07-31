"use client";

import { useMemo, useState } from "react";
import { type CatalogItem } from "@/lib/catalog";
import { type ResolvedCatalogItem } from "@/lib/products";
import { SERVICE_LINE_ORDER, lineName } from "@/lib/service-lines";
import { Card, Badge, Reveal, ButtonLink } from "@/components/ui";
import { BuyButton } from "@/components/buy-button";
import {
  IconSparkle,
  IconBadge,
  IconUser,
  IconGlobe,
  type IconType,
} from "@/components/icons";

// Item katalog yang siap dirender di klien (data murni + URL CTA eksternal yang sudah
// diresolusi di server untuk daftar/konsultasi supaya tak perlu baca env di browser).
export type BrowserItem = ResolvedCatalogItem & { ctaUrl: string | null };

const SCOPE_ICON: Record<CatalogItem["scope"], IconType> = {
  app: IconSparkle,
  kelas: IconBadge,
  thesis: IconUser,
  book: IconGlobe,
};

// Kategori filter = LINI layanan (scope), nama & urutannya dari sumber tunggal service-lines,
// jadi SAMA dengan launcher & /akses. Produk (Pro, dst.) muncul sebagai kartu di dalam lininya.
const CATEGORIES: { id: "all" | CatalogItem["scope"]; label: string }[] = [
  { id: "all", label: "Semua" },
  ...SERVICE_LINE_ORDER.map((scope) => ({ id: scope, label: lineName(scope) })),
];

// "Cocok untuk…" — menerjemahkan brand Acme ke TUJUAN user (persona Rina/Damar/Bu Sari
// menilai layanan dari outcome, bukan nama produk). Presentasional, dipetakan per item.
const BEST_FOR: Record<string, string> = {
  "pro-plan": "Pengembangan diri & komunitas",
  "events": "Webinar bersama praktisi",
  "free-events": "Belajar gratis",
  kelas: "Sertifikasi & karier",
  thesis: "Bimbingan skripsi/tesis",
  book: "Referensi belajar",
};

function ComingSoonPill() {
  return (
    <span className="inline-flex cursor-not-allowed items-center rounded-full bg-zinc-100 px-3.5 py-2 text-sm font-semibold text-zinc-500 ring-1 ring-inset ring-zinc-500/15">
      Segera hadir
    </span>
  );
}

function MutedPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-50 px-3.5 py-2 text-sm font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/15">
      {children}
    </span>
  );
}

function Cta({ item, active, hasPlus }: { item: BrowserItem; active: boolean; hasPlus: boolean }) {
  // Acara (mis. Events) dijual per-webinar, bukan paket langganan. Kartu katalog jadi
  // penunjuk ke /acara agar user memilih sesi spesifik, bukan tombol "Beli"/"Kelola paket".
  if (item.itemType === "event") {
    return (
      <ButtonLink href="/acara" variant="ghost" icon={false}>
        Lihat acara
      </ButtonLink>
    );
  }
  if (active) {
    return (
      <ButtonLink href="/langganan" variant="ghost" icon={false}>
        Kelola paket
      </ButtonLink>
    );
  }
  if (item.status === "coming_soon" || !item.purchasableFromDb) return <ComingSoonPill />;

  switch (item.cta) {
    case "subscribe":
      return <BuyButton itemKey={item.key} label="Berlangganan" />;
    case "buy":
      return <BuyButton itemKey={item.key} label="Beli" />;
    case "register":
      return item.ctaUrl ? (
        <ButtonLink href={item.ctaUrl} external variant="ghost">
          Daftar
        </ButtonLink>
      ) : (
        <ComingSoonPill />
      );
    case "consult":
      return item.ctaUrl ? (
        <ButtonLink href={item.ctaUrl} external variant="ghost">
          Mulai konsultasi
        </ButtonLink>
      ) : (
        <ComingSoonPill />
      );
    case "included":
      return <MutedPill>{hasPlus ? "Aktif via Pro" : "Termasuk Pro"}</MutedPill>;
    default:
      return null;
  }
}

export function CatalogBrowser({
  items,
  activeCodes,
  hasPlus,
}: {
  items: BrowserItem[];
  activeCodes: string[];
  hasPlus: boolean;
}) {
  const [cat, setCat] = useState<"all" | CatalogItem["scope"]>("all");
  const activeSet = useMemo(() => new Set(activeCodes), [activeCodes]);

  // Sembunyikan tab kategori yang tak punya item sama sekali (mis. book bila off).
  const visibleCats = useMemo(
    () => CATEGORIES.filter((c) => c.id === "all" || items.some((i) => i.scope === c.id)),
    [items],
  );
  const shown = cat === "all" ? items : items.filter((i) => i.scope === cat);

  return (
    <div className="space-y-6">
      {/* Tab kategori (seperti filter di web utama) */}
      <div className="flex flex-wrap gap-2">
        {visibleCats.map((c) => {
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((item, i) => {
          const Icon = SCOPE_ICON[item.scope];
          // Acara tak pernah "aktif" (dibeli per-sesi), jadi tak menampilkan badge/ring aktif.
          const active =
            item.itemType !== "event" && !!item.productCode && activeSet.has(item.productCode);
          return (
            <Reveal key={item.key} delay={i * 50}>
              <Card
                className={`group flex h-full flex-col p-6 transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:shadow-lift ${
                  active ? "ring-brand-500/30" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-black/[0.04]">
                    <Icon className="h-5 w-5" />
                  </span>
                  {active ? (
                    <Badge value="active" />
                  ) : item.status === "coming_soon" ? (
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-500 ring-1 ring-inset ring-zinc-500/15">
                      Segera
                    </span>
                  ) : item.badge ? (
                    <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/15">
                      {item.badge}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600/80">
                  {lineName(item.scope)}
                </div>
                <div className="mt-1 text-base font-bold text-ink">{item.name}</div>
                {BEST_FOR[item.key] ? (
                  <div className="mt-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-700">
                      Cocok untuk: {BEST_FOR[item.key]}
                    </span>
                  </div>
                ) : null}
                <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-500">{item.blurb}</p>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-lg font-bold text-ink">{item.price}</span>
                  {item.cadence ? <span className="text-xs text-zinc-500">{item.cadence}</span> : null}
                </div>

                <div className="mt-5">
                  <Cta item={item} active={active} hasPlus={hasPlus} />
                </div>
              </Card>
            </Reveal>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">
          Belum ada layanan di kategori ini.
        </p>
      ) : null}
    </div>
  );
}
