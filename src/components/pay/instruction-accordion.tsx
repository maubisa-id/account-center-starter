"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { Guide } from "@/lib/midtrans/pay-instructions";

// Accordion petunjuk transfer per kanal (mBanking / iBanking / ATM), meniru pola
// halaman pembayaran e-commerce. Kanal pertama terbuka default.
export function InstructionAccordion({ guides }: { guides: Guide[] }) {
  const [open, setOpen] = useState(0);
  if (guides.length === 0) return null;

  return (
    <div className="mt-4 divide-y divide-black/[0.06] rounded-2xl border border-black/[0.06]">
      {guides.map((g, i) => {
        const isOpen = open === i;
        return (
          <div key={g.channel}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-sm font-semibold text-ink">{g.channel}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen ? (
              <ol className="space-y-2.5 px-4 pb-4 pt-0.5">
                {g.steps.map((s, idx) => (
                  <li key={idx} className="flex gap-3 text-sm leading-relaxed text-zinc-600">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-50 text-[11px] font-bold text-brand-600">
                      {idx + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
