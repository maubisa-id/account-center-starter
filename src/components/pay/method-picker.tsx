"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PAY_METHODS } from "@/lib/midtrans/methods";
import type { PayMethodId } from "@/lib/midtrans/types";
import { BrandLogo } from "./brand-logo";

// Metode yang ditandai "Terpopuler" — jalur tercepat & paling umum di Indonesia.
const POPULAR: PayMethodId[] = ["qris"];

// Urutan grup tampil sesuai kemunculan pertama di PAY_METHODS.
function grouped() {
  const groups: { name: string; items: typeof PAY_METHODS }[] = [];
  for (const m of PAY_METHODS) {
    const name = m.group ?? "Lainnya";
    let g = groups.find((x) => x.name === name);
    if (!g) {
      g = { name, items: [] };
      groups.push(g);
    }
    g.items.push(m);
  }
  return groups;
}

const VA_GROUP = "Virtual Account";

// Pemilih metode Core API. Distill (momen bayar = beban kognitif tinggi): QRIS terpopuler
// dipilih default, dan 6 bank Virtual Account DIKELOMPOKKAN di balik satu baris "Transfer
// Bank" (tidak menampilkan 10 opsi sekaligus). Pengguna yang butuh bank tinggal membukanya.
export function MethodPicker({
  selected,
  onSelect,
  disabled,
}: {
  selected: PayMethodId | null;
  onSelect: (id: PayMethodId) => void;
  disabled?: boolean;
}) {
  const groups = useMemo(() => grouped(), []);

  // Default cepat: pilih QRIS bila belum ada pilihan (jalur terpopuler → 1 langkah lebih ringkas).
  useEffect(() => {
    if (!selected) onSelect("qris");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vaGroup = groups.find((g) => g.name === VA_GROUP);
  const vaAlreadyChosen = !!vaGroup?.items.some((m) => m.id === selected);
  const [vaOpen, setVaOpen] = useState(vaAlreadyChosen);

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const collapsible = group.name === VA_GROUP && group.items.length > 2;

        // Baris ringkas "Transfer Bank" saat VA masih terkolaps.
        if (collapsible && !vaOpen) {
          return (
            <button
              key={group.name}
              type="button"
              onClick={() => setVaOpen(true)}
              disabled={disabled}
              aria-expanded={false}
              className="flex w-full items-center gap-3 rounded-2xl border border-black/[0.08] bg-white p-3.5 text-left transition-colors hover:border-brand-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              <span className="flex items-center gap-1.5">
                {group.items.slice(0, 3).map((m) => (
                  <BrandLogo key={m.id} id={m.id} className="h-7 w-11" />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">Transfer Bank (Virtual Account)</span>
                <span className="mt-0.5 block text-xs text-zinc-500">BCA, BNI, BRI, Permata, CIMB, Mandiri · bisa dari bank apa pun</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
            </button>
          );
        }

        return (
          <div key={group.name}>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                {group.name}
              </div>
              {collapsible ? (
                <button
                  type="button"
                  onClick={() => setVaOpen(false)}
                  className="text-[11px] font-semibold text-brand-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                >
                  Sembunyikan
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {group.items.map((m) => {
                const active = selected === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(m.id)}
                    aria-pressed={active}
                    className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 disabled:opacity-60 ${
                      active
                        ? "border-brand-500 bg-brand-50/60 shadow-soft"
                        : "border-black/[0.08] bg-white hover:border-brand-300"
                    }`}
                  >
                    <BrandLogo id={m.id} />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-ink">{m.short ?? m.label}</span>
                        {m.tag ? (
                          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                            {m.tag}
                          </span>
                        ) : null}
                        {POPULAR.includes(m.id) ? (
                          <span className="rounded-full bg-lime-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-lime-700">
                            Terpopuler
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-zinc-500">{m.desc}</span>
                    </span>
                    <span
                      className={`h-4 w-4 shrink-0 rounded-full border-[5px] transition-colors ${
                        active ? "border-brand-500" : "border-zinc-200"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
