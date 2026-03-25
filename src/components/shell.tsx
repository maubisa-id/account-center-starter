"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import type { Alert } from "@/lib/alerts";
import { LOGO_URL } from "@/lib/brand";
import { ProfileMenu } from "./profile-menu";
import { Avatar } from "./avatar";
import { NotificationMenu } from "./notification-menu";
import { PageTransition } from "./page-transition";
import {
  IconGrid,
  IconUser,
  IconShield,
  IconSparkle,
  IconAccess,
  IconReceipt,
  IconBell,
  IconCard,
  IconCalendar,
  IconDatabase,
  IconBadge,
  IconSearch,
  IconChevron,
  IconMenu,
  IconClose,
  IconLogout,
  type IconType,
} from "./icons";

type NavItem = { href: string; label: string; icon: IconType };
type NavGroup = { section: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    section: "Akun",
    items: [
      { href: "/", label: "Ringkasan", icon: IconGrid },
      { href: "/profil", label: "Profil", icon: IconUser },
      { href: "/keamanan", label: "Keamanan", icon: IconShield },
      { href: "/notifikasi", label: "Notifikasi", icon: IconBell },
      { href: "/privasi", label: "Privasi & data", icon: IconDatabase },
    ],
  },
  {
    section: "Tagihan & Akses",
    items: [
      { href: "/langganan/ubah", label: "Katalog layanan", icon: IconBadge },
      { href: "/langganan", label: "Langganan", icon: IconSparkle },
      { href: "/metode-pembayaran", label: "Metode pembayaran", icon: IconCard },
      { href: "/pembayaran", label: "Pembayaran", icon: IconReceipt },
      { href: "/acara", label: "Acara", icon: IconCalendar },
      { href: "/akses", label: "Akses", icon: IconAccess },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (pathname === href) return true;
  if (!pathname.startsWith(href + "/")) return false;
  // Aktif untuk sub-path, KECUALI bila ada item nav lain yang lebih spesifik cocok
  // (mis. /langganan tidak ikut aktif saat berada di /langganan/ubah yang punya item sendiri).
  const moreSpecific = ALL_ITEMS.some(
    (i) =>
      i.href !== href &&
      i.href.startsWith(href + "/") &&
      (pathname === i.href || pathname.startsWith(i.href + "/")),
  );
  return !moreSpecific;
}

// Label untuk sub-halaman bertingkat yang bukan item nav utama.
const SUBPAGE_LABEL: Record<string, string> = {
  "/langganan/ubah": "Katalog layanan",
};

type Crumb = { label: string; href?: string };

// Bangun jejak breadcrumb: Pusat Akun › Bagian › Sub-halaman.
function crumbsFor(pathname: string): Crumb[] {
  const home: Crumb = { label: "Pusat Akun", href: "/" };
  if (pathname === "/") return [home, { label: "Ringkasan" }];
  const section = ALL_ITEMS.find((i) => i.href !== "/" && isActive(pathname, i.href));
  const crumbs: Crumb[] = [home];
  if (section) {
    const sub = SUBPAGE_LABEL[pathname];
    crumbs.push({ label: section.label, href: sub ? section.href : undefined });
    if (sub) crumbs.push({ label: sub });
  }
  return crumbs;
}

function BrandMark() {
  return (
    <Link href="/" className="group flex flex-col items-start gap-1.5">
      {/* Logo brand dari CDN (lolos 403 transform CF). Latar sidebar gelap -> putihkan
          logo berwarna via CSS `brightness-0 invert` (tak butuh aset putih terpisah). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={LOGO_URL}
        alt="Maubisa"
        width={130}
        height={35}
        className="h-8 w-auto max-w-full self-start object-contain object-left brightness-0 invert"
      />
      <span className="pl-0.5 text-[11px] font-medium tracking-wide text-white/65">Pusat Akun</span>
    </Link>
  );
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 space-y-7 px-4">
      {NAV.map((group) => (
        <div key={group.section} className="space-y-1.5">
          <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
            {group.section}
          </div>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-[background-color,color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  active
                    ? "bg-white/[0.14] text-white ring-1 ring-inset ring-white/15"
                    : "text-white/85 hover:bg-white/[0.08] hover:text-white"
                }`}
              >
                <Icon
                  className={`h-5 w-5 transition-colors duration-300 ${
                    active ? "text-white" : "text-white/75 group-hover:text-white"
                  }`}
                />
                {item.label}
                {active ? (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky" />
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function UserFooter({ user }: { user: { name: string; email: string; avatarUrl?: string | null } | null }) {
  async function doLogout() {
    await authClient.signOut();
    window.location.href = "/masuk";
  }
  return (
    <div className="mt-auto px-4 pb-5 pt-4">
      <div className="flex items-center gap-3 rounded-2xl bg-white/[0.05] p-3 ring-1 ring-inset ring-white/10">
        <Avatar name={user?.name} src={user?.avatarUrl} size={36} className="shrink-0" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold text-white">{user?.name ?? "Tamu"}</div>
          <div className="truncate text-[11px] text-white/65">{user?.email ?? "-"}</div>
        </div>
        <button
          type="button"
          onClick={doLogout}
          aria-label="Keluar"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-white/65 transition-colors duration-300 hover:bg-white/10 hover:text-white"
        >
          <IconLogout className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}

// Pencarian cepat: filter menu & navigasi (dulu hanya dekoratif).
function TopSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const query = q.trim().toLowerCase();
  // Query kosong -> tampilkan semua halaman (rekognisi > mengingat).
  const results = query ? ALL_ITEMS.filter((i) => i.label.toLowerCase().includes(query)) : ALL_ITEMS;

  // Pintasan keyboard: "/" fokus ke pencarian, "Esc" lepas fokus (efisiensi power-user).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "Escape" && el === inputRef.current) {
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(href: string) {
    setQ("");
    setOpen(false);
    router.push(href);
  }
  return (
    <div className="relative hidden md:block">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // No-op bila query kosong (jangan navigasi ke hasil pertama tanpa maksud).
          if (q.trim() && results[0]) go(results[0].href);
        }}
      >
        <div className="flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm ring-1 ring-black/[0.06] focus-within:ring-brand-300">
          <IconSearch className="h-4 w-4 text-zinc-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Cari halaman..."
            aria-label="Cari halaman"
            className="w-36 bg-transparent text-zinc-600 placeholder:text-zinc-400 focus:outline-none"
          />
          <kbd className="hidden rounded-md border border-black/[0.08] bg-zinc-50 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 lg:inline">
            /
          </kbd>
        </div>
      </form>
      {open ? (
        <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-lift">
          {results.length > 0 ? (
            results.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={r.href}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(r.href)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none"
                >
                  <Icon className="h-4 w-4 text-brand-500" />
                  {r.label}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-6 text-center text-xs text-zinc-400">
              Tidak ada halaman cocok untuk &quot;{q.trim()}&quot;.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function SidebarBody({
  pathname,
  user,
  onNavigate,
}: {
  pathname: string;
  user: { name: string; email: string; avatarUrl?: string | null } | null;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="px-6 pb-6 pt-6">
        <BrandMark />
      </div>
      <NavList pathname={pathname} onNavigate={onNavigate} />
      <UserFooter user={user} />
    </>
  );
}

export function AppShell({
  user,
  alerts = [],
  children,
}: {
  user: { name: string; email: string; uuid?: string; avatarUrl?: string | null } | null;
  alerts?: Alert[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const crumbs = crumbsFor(pathname);

  return (
    <div className="min-h-[100dvh] lg:grid lg:grid-cols-[18rem_1fr]">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-[100dvh] flex-col bg-gradient-to-b from-brand-500 to-brand-700 lg:flex">
        <SidebarBody pathname={pathname} user={user} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-ink/40 backdrop-blur-sm transition-opacity duration-500 ${
            open ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`absolute inset-y-0 left-0 flex w-[17rem] flex-col bg-gradient-to-b from-brand-500 to-brand-700 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-6 flex h-9 w-9 items-center justify-center rounded-xl text-white/60 hover:bg-white/10 hover:text-white"
          >
            <IconClose className="h-5 w-5" />
          </button>
          <SidebarBody pathname={pathname} user={user} onNavigate={() => setOpen(false)} />
        </div>
      </div>

      {/* Content column */}
      <div className="flex min-w-0 flex-col">
        {/* Floating glass topbar */}
        <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-2xl border border-white/60 bg-white/70 px-3 py-2.5 shadow-soft ring-1 ring-black/[0.04] backdrop-blur-xl sm:px-4">
            <button
              type="button"
              aria-label="Buka menu"
              onClick={() => setOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-600 ring-1 ring-black/[0.06] transition-colors hover:bg-zinc-50 lg:hidden"
            >
              <IconMenu className="h-5 w-5" />
            </button>

            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex items-center gap-1.5 text-sm">
                {crumbs.map((c, i) => {
                  const last = i === crumbs.length - 1;
                  return (
                    <li key={i} className={`${last ? "flex" : "hidden sm:flex"} min-w-0 items-center gap-1.5`}>
                      {i > 0 ? (
                        <IconChevron className={`h-3.5 w-3.5 shrink-0 text-zinc-300 ${last ? "hidden sm:block" : ""}`} />
                      ) : null}
                      {c.href && !last ? (
                        <Link
                          href={c.href}
                          className="shrink-0 font-medium text-zinc-400 transition-colors hover:text-ink"
                        >
                          {c.label}
                        </Link>
                      ) : (
                        <span
                          aria-current={last ? "page" : undefined}
                          className={last ? "truncate font-bold text-ink" : "shrink-0 font-medium text-zinc-400"}
                        >
                          {c.label}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <TopSearch />
              <NotificationMenu alerts={alerts} />
              <ProfileMenu user={user} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6">
          <PageTransition>{children}</PageTransition>
        </main>

        <footer className="mx-auto w-full max-w-6xl px-6 pb-8">
          <div className="flex flex-col items-center gap-2 border-t border-black/[0.05] pt-6 sm:flex-row sm:justify-between">
            <p className="text-xs text-zinc-400">
              {`© ${new Date().getFullYear()} Maubisa · PT Litera Edu Solusi`}
            </p>
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <a href="https://bantuan.maubisa.id/" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">
                Bantuan
              </a>
              <a href="https://maubisa.id/pusat-kepercayaan/hukum/kebijakan-privasi" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">
                Privasi
              </a>
              <a href="https://maubisa.id/pusat-kepercayaan/hukum/syarat-ketentuan" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">
                Ketentuan
              </a>
              <a href="https://maubisa.id/pusat-kepercayaan/hukum/kebijakan-penggunaan" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">
                Penggunaan
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
