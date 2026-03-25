"use client";

import { useState } from "react";
import { deleteAccount } from "@/app/(app)/actions";
import { authClient } from "@/lib/auth-client";
import { Modal } from "./modal";
import { IconDownload, IconTrash } from "@/components/icons";

const EXPORT_FORMATS = [
  { format: "pdf", label: "PDF (dokumen rapi)", hint: "Enak dibaca & dicetak", newTab: true },
  { format: "csv", label: "CSV (untuk spreadsheet)", hint: "Buka di Excel / Google Sheets", newTab: false },
  { format: "json", label: "JSON (data lengkap)", hint: "Untuk keperluan teknis", newTab: false },
] as const;

export function ExportDataButton() {
  // Dropdown pilih format. <details> native: aksesibel & tanpa state manual (ponytail-lean).
  return (
    <details className="group relative w-full sm:w-auto">
      <summary className="inline-flex w-full cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-soft transition-colors hover:bg-zinc-50 sm:w-auto [&::-webkit-details-marker]:hidden">
        <IconDownload className="h-4 w-4" />
        Minta unduhan data
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-zinc-400 transition-transform group-open:rotate-180" aria-hidden="true">
          <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </summary>
      <div className="absolute right-0 z-20 mt-2 w-full min-w-[240px] overflow-hidden rounded-2xl border border-black/[0.08] bg-white p-1.5 shadow-lift sm:w-72">
        {EXPORT_FORMATS.map((f) => (
          <a
            key={f.format}
            href={`/api/account/export?format=${f.format}`}
            {...(f.newTab ? { target: "_blank", rel: "noopener noreferrer" } : { download: true })}
            className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-brand-50"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10">
              <IconDownload className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{f.label}</span>
              <span className="block text-xs text-zinc-500">{f.hint}</span>
            </span>
          </a>
        ))}
      </div>
    </details>
  );
}

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");

  async function onConfirm() {
    if (confirm.trim().toUpperCase() !== "HAPUS") {
      setMsg('Ketik "HAPUS" untuk konfirmasi.');
      return;
    }
    setLoading(true);
    setMsg(null);
    const res = await deleteAccount();
    if (res.error) {
      setMsg(res.error);
      setLoading(false);
      return;
    }
    await authClient.signOut();
    window.location.href = "/masuk";
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-rose-accent px-5 py-2.5 text-sm font-semibold text-white shadow-soft transition-[transform,filter] duration-300 hover:brightness-95 active:scale-[0.98]"
      >
        <IconTrash className="h-4 w-4" />
        Hapus akun
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Hapus akun permanen"
        desc="Langganan aktif dibatalkan dan akses dicabut. Tindakan ini tidak bisa dibatalkan."
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-zinc-500">
              Ketik <span className="font-bold text-rose-600">HAPUS</span> untuk konfirmasi
            </span>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="HAPUS"
              className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white p-3.5 text-sm text-ink placeholder:text-zinc-400 focus:border-rose-300 focus:outline-none"
            />
          </label>
          {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-zinc-500 transition-colors hover:text-ink"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="rounded-full bg-rose-accent px-6 py-2.5 text-sm font-semibold text-white shadow-soft transition-[transform,filter] duration-300 hover:brightness-95 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Menghapus..." : "Hapus akun saya"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
