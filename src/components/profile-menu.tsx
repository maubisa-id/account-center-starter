"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Avatar } from "./avatar";
import { authClient } from "@/lib/auth-client";
import {
  IconDatabase,
  IconUser,
  IconShield,
  IconReceipt,
  IconHelp,
  IconMail,
  type IconType,
} from "./icons";
import { BRAND } from "@/lib/brand";

type MenuUser = { name: string; email: string; uuid?: string; avatarUrl?: string | null } | null;

const LINKS: { href: string; label: string; icon: IconType; external?: boolean }[] = [
  { href: "/profil", label: "Kelola profil", icon: IconUser },
  { href: "/keamanan", label: "Keamanan & privasi", icon: IconShield },
  { href: "/pembayaran", label: "Riwayat pembayaran", icon: IconReceipt },
  ...(BRAND.helpUrl
    ? [{ href: BRAND.helpUrl, label: "Pusat bantuan", icon: IconHelp, external: true }]
    : []),
  { href: `mailto:${BRAND.supportEmail}`, label: "Hubungi kami", icon: IconMail, external: true },
];

export function ProfileMenu({ user }: { user: MenuUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const uid = user?.uuid ? user.uuid.replace(/-/g, "").slice(0, 12).toUpperCase() : null;
  const close = () => setOpen(false);

  async function logout() {
    close();
    await authClient.signOut();
    window.location.href = "/masuk";
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu akun"
        className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-black/[0.06] transition-transform hover:scale-105"
      >
        <Avatar name={user?.name} src={user?.avatarUrl} size={36} />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-fade absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-lift"
        >
          <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-brand-50 to-white px-6 pb-6 pt-7 text-center">
            <Avatar
              name={user?.name}
              src={user?.avatarUrl}
              size={64}
              className="shadow-soft ring-4 ring-white"
            />
            <div className="space-y-0.5">
              <div className="text-base font-bold text-ink">{user?.name ?? "Tamu"}</div>
              <div className="text-sm text-zinc-500">{user?.email ?? "-"}</div>
              {uid ? (
                <div className="text-xs text-zinc-400">
                  ID Pengguna: <span className="font-mono tracking-wide text-zinc-500">{uid}</span>
                </div>
              ) : null}
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-xs text-zinc-500">
              <IconDatabase className="h-4 w-4 text-brand-500" />
              Akun kamu berada di pusat data Indonesia.
            </div>
            <button
              type="button"
              onClick={logout}
              className="mt-1 inline-flex items-center justify-center rounded-full bg-rose-accent px-7 py-2.5 text-sm font-semibold text-white shadow-soft transition-[transform,filter] duration-300 hover:brightness-95 active:scale-[0.98]"
            >
              Keluar
            </button>
          </div>

          <div className="px-3 py-3">
            <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Bantuan & akun
            </div>
            <nav className="space-y-0.5">
              {LINKS.map(({ href, label, icon: Icon, external }) =>
                external ? (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink transition-colors hover:bg-zinc-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    {label}
                  </a>
                ) : (
                  <Link
                    key={href}
                    href={href}
                    onClick={close}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink transition-colors hover:bg-zinc-50"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    {label}
                  </Link>
                ),
              )}
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
