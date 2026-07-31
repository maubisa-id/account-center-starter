// Registry layanan Acme untuk "Buka layanan" (app launcher) di Account Center.
// Arsitektur hub-and-spoke (ADR-001/002): tiap produk = subdomain sendiri, dan SSO
// memakai cookie di domain ".example.com". Karena itu tombol "Buka" cukup link biasa:
// begitu sesi (Better Auth) aktif, membuka subdomain sudah otomatis login.

import { isEntitlementActive } from "@/lib/entitlement";
import { SERVICE_LINE, lineOrderIndex } from "@/lib/service-lines";

export type ServiceKey = "app" | "kelas" | "thesis" | "book";

const SERVICE_KEYS: ServiceKey[] = ["app", "kelas", "thesis", "book"];

// Base URL tiap layanan. Bisa dioverride via env (mis. staging/preview) tanpa ubah kode.
function baseUrl(key: ServiceKey): string {
  switch (key) {
    case "app":
      return process.env.NEXT_PUBLIC_APP_URL ?? "https://app.example.com";
    case "kelas":
      return process.env.NEXT_PUBLIC_KELAS_URL ?? "https://kelas.example.com";
    case "thesis":
      return process.env.NEXT_PUBLIC_THESIS_URL ?? "https://thesis.example.com";
    case "book":
      return process.env.NEXT_PUBLIC_BOOK_URL ?? "https://example.com/buku";
  }
}

// URL dasar sebuah layanan (dipakai katalog untuk CTA daftar/konsultasi).
export function serviceUrl(key: ServiceKey): string {
  return baseUrl(key);
}

// Apakah dashboard produk sudah LIVE? Menggerbang tombol "Buka" supaya tak ada tautan mati
// sebelum subdomain dibangun (default: thesis live; app/kelas/book "segera hadir"). Set
// NEXT_PUBLIC_{APP,KELAS,THESIS}_ENABLED="true" saat masing-masing live. Pola sama dengan
// PUBLIC_ACCOUNT_ENABLED di web utama.
function isEnabled(key: ServiceKey): boolean {
  const flag = (name: string, fallback: boolean) => {
    const v = process.env[name];
    return v == null || v === "" ? fallback : v === "true";
  };
  switch (key) {
    case "thesis":
      return flag("NEXT_PUBLIC_THESIS_ENABLED", true);
    case "app":
      return flag("NEXT_PUBLIC_APP_ENABLED", false);
    case "kelas":
      return flag("NEXT_PUBLIC_KELAS_ENABLED", false);
    case "book":
      return flag("NEXT_PUBLIC_BOOK_ENABLED", false);
  }
}

// Metadata layanan: NAMA lini dari sumber tunggal (service-lines); blurb khusus konteks
// launcher/akses (lebih kaya dari tagline ringkas). name WAJIB sama dengan katalog & web utama.
const SERVICE_META: Record<ServiceKey, { name: string; blurb: string }> = {
  thesis: {
    name: SERVICE_LINE.thesis.name,
    blurb: "Bimbingan skripsi & tugas akhir 1-on-1 bersama mentor.",
  },
  app: {
    name: SERVICE_LINE.app.name,
    blurb: "Video belajar, Reading Notes, komunitas, dan pengembangan diri.",
  },
  kelas: {
    name: SERVICE_LINE.kelas.name,
    blurb: "Kelas & sertifikasi profesional (Microsoft, Google, Adobe).",
  },
  book: {
    name: SERVICE_LINE.book.name,
    blurb: "Buku dan bundel pilihan Acme.",
  },
};

export type LaunchTarget = {
  key: ServiceKey;
  name: string;
  blurb: string;
  url: string;
  enabled: boolean; // dashboard produk sudah live?
  community?: { label: string; url: string };
};

type EntitlementLike = {
  scope: string;
  status: string;
  expiresAt?: Date | string | null;
  itemType?: string | null;
  itemRef?: string | null;
  productCode?: string | null;
};

function asServiceKey(scope: string): ServiceKey | null {
  return (SERVICE_KEYS as string[]).includes(scope) ? (scope as ServiceKey) : null;
}

function communityUrl(): string {
  return process.env.NEXT_PUBLIC_COMMUNITY_URL ?? "https://app.example.com/komunitas";
}

// Punya akses komunitas (Discord) jika berlangganan Pro atau Community (termasuk Pro).
function hasCommunityAccess(entitlements: EntitlementLike[]): boolean {
  return entitlements.some(
    (e) =>
      isEntitlementActive(e) &&
      (e.productCode === "pro-plan" ||
        e.productCode === "community" ||
        (e.scope === "app" && e.itemType === "subscription")),
  );
}

// Layanan unik (level scope) yang bisa dibuka, dari daftar entitlement yang aktif.
// Kartu "app" mendapat aksi sekunder "Gabung Discord" bila punya akses komunitas.
export function activeServices(entitlements: EntitlementLike[]): LaunchTarget[] {
  const keys: ServiceKey[] = [];
  for (const e of entitlements) {
    if (!isEntitlementActive(e)) continue;
    const k = asServiceKey(e.scope);
    if (k && !keys.includes(k)) keys.push(k);
  }
  // Urutan kanonik (perjalanan Acme), bukan urutan kemunculan entitlement — konsisten antar-halaman.
  keys.sort((a, b) => lineOrderIndex(a) - lineOrderIndex(b));
  const community = hasCommunityAccess(entitlements);
  return keys.map((k) => ({
    key: k,
    name: SERVICE_META[k].name,
    blurb: SERVICE_META[k].blurb,
    url: baseUrl(k),
    enabled: isEnabled(k),
    community: k === "app" && community ? { label: "Gabung Discord", url: communityUrl() } : undefined,
  }));
}

// Tujuan "Buka" spesifik untuk satu entitlement. Hanya untuk item spesifik (mis. acara
// -> rekamannya). Entitlement layanan generik dibiarkan null karena sudah dicakup kartu
// "Buka layanan" di atas (menghindari tombol Buka yang dobel).
export function launchFor(ent: EntitlementLike): LaunchTarget | null {
  if (!isEntitlementActive(ent)) return null;
  const key = asServiceKey(ent.scope);
  if (!key) return null;

  if (ent.itemType === "event" && ent.itemRef) {
    // Event Center hidup di app.example.com (Pro). Hanya tawarkan "Buka" bila app sudah live,
    // supaya tak ada tautan mati sebelum dashboard dibangun.
    if (!isEnabled("app")) return null;
    return {
      key,
      name: "Event Center",
      blurb: "Buka detail acara dan rekamannya.",
      url: `${baseUrl("app")}/acara/${encodeURIComponent(ent.itemRef)}`,
      enabled: true,
    };
  }
  return null;
}
