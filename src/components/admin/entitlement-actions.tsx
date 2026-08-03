"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { SERVICE_LINE, SERVICE_LINE_ORDER } from "@/lib/service-lines";
import { grantEntitlement, revokeEntitlement } from "@/app/(app)/admin/pengguna/[uuid]/actions";

// Form beri akses manual (client). Memanggil server action grantEntitlement lalu refresh.
export function GrantAccessForm({ userUuid }: { userUuid: string }) {
  const router = useRouter();
  const toast = useToast();
  const [scope, setScope] = useState<string>(SERVICE_LINE_ORDER[0]);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      const res = await grantEntitlement({ userUuid, scope, note: note.trim() || undefined });
      if ("error" in res) {
        toast.show(res.error, "error");
      } else {
        toast.show(`Akses ${SERVICE_LINE[scope as keyof typeof SERVICE_LINE]?.name ?? scope} diberikan.`, "success");
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Lini layanan</span>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          className="rounded-xl bg-white px-3 py-2.5 text-sm text-ink ring-1 ring-black/[0.08] focus:outline-none focus:ring-brand-300"
        >
          {SERVICE_LINE_ORDER.map((s) => (
            <option key={s} value={s}>
              {SERVICE_LINE[s].name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-1 flex-col gap-1.5 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">Catatan (opsional)</span>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="mis. kompensasi kendala pembayaran"
          className="rounded-xl bg-white px-3 py-2.5 text-sm text-ink ring-1 ring-black/[0.08] placeholder:text-zinc-400 focus:outline-none focus:ring-brand-300"
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition-colors hover:bg-brand-600 disabled:opacity-60"
      >
        {pending ? "Memberi..." : "Beri akses"}
      </button>
    </div>
  );
}

// Tombol cabut akses (client) per baris entitlement.
export function RevokeButton({ userUuid, entitlementId }: { userUuid: string; entitlementId: number }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  function revoke() {
    if (!window.confirm("Cabut hak akses ini? Pengguna akan kehilangan akses.")) return;
    start(async () => {
      const res = await revokeEntitlement({ userUuid, entitlementId });
      if ("error" in res) {
        toast.show(res.error, "error");
      } else {
        toast.show("Hak akses dicabut.", "success");
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={revoke}
      disabled={pending}
      className="rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 ring-1 ring-inset ring-rose-500/20 transition-colors hover:bg-rose-50 disabled:opacity-60"
    >
      {pending ? "..." : "Cabut"}
    </button>
  );
}
