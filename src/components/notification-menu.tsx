"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { Alert } from "@/lib/alerts";
import { IconBell } from "./icons";

const TONE: Record<Alert["tone"], { dot: string; chip: string }> = {
  danger: { dot: "bg-rose-accent", chip: "bg-rose-50 text-rose-700" },
  warning: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
  info: { dot: "bg-brand-500", chip: "bg-brand-50 text-brand-700" },
};

export function NotificationMenu({ alerts }: { alerts: Alert[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = alerts.length;

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

  const close = () => setOpen(false);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={count > 0 ? `Notifikasi (${count} perlu perhatian)` : "Notifikasi"}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-500 ring-1 ring-black/[0.06] transition-colors hover:text-ink"
      >
        <IconBell className="h-[18px] w-[18px]" />
        {count > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-accent px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {count > 9 ? "9+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-fade absolute right-0 top-12 z-50 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-lift"
        >
          <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
            <div className="text-sm font-bold text-ink">Notifikasi</div>
            {count > 0 ? (
              <span className="rounded-full bg-rose-accent px-2 py-0.5 text-[10px] font-bold text-white">
                {count} baru
              </span>
            ) : null}
          </div>

          {count === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-50 text-lime-600">
                <IconBell className="h-5 w-5" />
              </span>
              <p className="text-sm font-medium text-ink">Semua beres</p>
              <p className="text-xs text-zinc-500">Tidak ada yang perlu ditindaklanjuti.</p>
            </div>
          ) : (
            <div className="max-h-[22rem] overflow-y-auto py-1.5">
              {alerts.map((a) => {
                const tone = TONE[a.tone];
                return (
                  <Link
                    key={a.id}
                    href={a.href}
                    onClick={close}
                    className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-zinc-50"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink">{a.title}</div>
                      <div className="mt-0.5 text-xs leading-relaxed text-zinc-500">{a.desc}</div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.chip}`}>
                      {a.cta}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          <Link
            href="/notifikasi"
            onClick={close}
            className="block border-t border-zinc-100 px-5 py-3 text-center text-xs font-semibold text-brand-600 transition-colors hover:bg-zinc-50 hover:text-brand-700"
          >
            Kelola notifikasi
          </Link>
        </div>
      ) : null}
    </div>
  );
}
