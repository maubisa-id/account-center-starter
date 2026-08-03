"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Navigasi antar-halaman admin. Ringkasan (dashboard) jadi landing utama admin.
const TABS = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/pengguna", label: "Pengguna" },
  { href: "/admin/payment-link", label: "Payment Link" },
  { href: "/admin/acara", label: "Pendaftar Acara" },
  { href: "/admin/audit", label: "Jejak Audit" },
];

export function AdminTabs() {
  const path = usePathname();
  return (
    <nav className="inline-flex gap-1 rounded-full bg-black/[0.04] p-1 text-sm ring-1 ring-inset ring-black/5 lg:hidden">
      {TABS.map((t) => {
        const active = path === t.href || (t.href !== "/admin" && path.startsWith(t.href + "/"));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-4 py-1.5 font-semibold transition-colors ${
              active
                ? "bg-white text-ink shadow-sm ring-1 ring-inset ring-black/5"
                : "text-zinc-500 hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
