"use client";

import { useEffect, useState, useTransition } from "react";
import { saveNotifPref } from "@/app/(app)/actions";
import { useToast } from "@/components/toast";

export function PrefToggle({
  label,
  desc,
  defaultOn = false,
  prefKey,
  locked = false,
  comingSoon = false,
}: {
  label: string;
  desc?: string;
  defaultOn?: boolean;
  prefKey?: string;
  locked?: boolean;
  comingSoon?: boolean;
}) {
  const [on, setOn] = useState(comingSoon ? false : defaultOn);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false); // feedback "Tersimpan" sesaat
  const toast = useToast();

  function toggle() {
    if (locked || comingSoon) return;
    const next = !on;
    setOn(next);
    if (prefKey) {
      start(async () => {
        const res = await saveNotifPref(prefKey, next);
        if (res.error) {
          setOn(!next); // rollback bila gagal simpan
          toast.show("Gagal menyimpan preferensi. Coba lagi.", "error");
        } else {
          setSaved(true);
        }
      });
    }
  }

  // Tampilkan "Tersimpan" sesaat setelah simpan sukses lalu auto-hilang, supaya user tahu
  // perubahan tersimpan tanpa menekan tombol simpan (autosave yang jujur). Timer di effect
  // (bukan Date.now() saat render) agar tetap pure.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(t);
  }, [saved]);
  const showSaved = saved && !pending;

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          {label}
          {locked ? (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
              Wajib
            </span>
          ) : comingSoon ? (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">
              Segera
            </span>
          ) : null}
        </div>
        {desc ? <div className="mt-0.5 text-xs leading-relaxed text-zinc-500">{desc}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <span aria-live="polite" className="min-w-[52px] text-right text-[11px] font-medium text-zinc-400">
          {pending ? "Menyimpan…" : showSaved ? <span className="text-lime-600">Tersimpan</span> : null}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={label}
          disabled={locked || pending || comingSoon}
          onClick={toggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${
            on ? "bg-brand-500" : "bg-zinc-300"
          } ${locked || comingSoon ? "cursor-not-allowed opacity-70" : ""}`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300 ${
              on ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
