"use client";

import { useState } from "react";
import { deleteAccount } from "@/app/(app)/actions";
import { authClient } from "@/lib/auth-client";
import { Modal } from "./modal";
import { IconDownload, IconTrash } from "@/components/icons";

export function ExportDataButton() {
  return (
    <a
      href="/api/account/export"
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-2.5 text-sm font-semibold text-ink shadow-soft transition-colors hover:bg-zinc-50"
    >
      <IconDownload className="h-4 w-4" />
      Minta unduhan data
    </a>
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
