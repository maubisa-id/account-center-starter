"use client";

import { Check } from "lucide-react";
import { scorePassword } from "@/lib/password";

// Meter kekuatan kata sandi: bilah 4-segmen + daftar syarat. Dipakai di daftar,
// atur ulang, dan ubah kata sandi supaya umpan baliknya SATU gaya di seluruh app.
const BAR = ["bg-black/10", "bg-rose-accent", "bg-amber-400", "bg-lime-accent", "bg-emerald-500"];
const TEXT = ["text-zinc-400", "text-rose-600", "text-amber-600", "text-lime-700", "text-emerald-600"];

export function PasswordStrength({ value, terms = [] }: { value: string; terms?: string[] }) {
  // Selalu tampil (checklist statis) supaya pengguna tahu ketentuannya SEBELUM mengetik.
  // Saat kosong: bar netral (abu-abu) + label netral, bukan merah "Terlalu lemah".
  const s = scorePassword(value, terms);
  const empty = value.length === 0;
  return (
    <div className="mt-2.5 space-y-2">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((seg) => (
          <span
            key={seg}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${!empty && seg <= s.score ? BAR[s.score] : "bg-black/10"}`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${empty ? "text-zinc-400" : TEXT[s.score]}`} aria-live="polite">
        {empty ? "Kekuatan kata sandi" : `Kekuatan: ${s.label}`}
      </p>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {s.checks.map((c) => (
          <li
            key={c.id}
            className={`flex items-center gap-1.5 text-[11px] leading-tight transition-colors ${
              c.ok ? "text-zinc-600" : "text-zinc-400"
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                c.ok ? "bg-lime-accent/20 text-lime-700" : "bg-black/[0.06]"
              }`}
            >
              {c.ok ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
            </span>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
