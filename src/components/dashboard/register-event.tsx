"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerFreeEvent } from "@/app/(app)/actions";
import { useToast } from "@/components/toast";
import { Modal } from "./modal";
import { IconCheck } from "@/components/icons";

type Identity = { name: string; email: string; phone: string | null };

export function RegisterEventButton({
  eventId,
  eventTitle,
  registered,
  identity,
}: {
  eventId: string;
  eventTitle: string;
  registered: boolean;
  identity: Identity;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(registered);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    setMsg(null);
    const res = await registerFreeEvent(eventId, {
      institution: String(fd.get("institution") ?? ""),
      note: String(fd.get("note") ?? ""),
      eventTitle,
    });
    setLoading(false);
    if (res.error) {
      setMsg(res.error);
      return;
    }
    setOpen(false);
    setDone(true);
    toast.show(res.already ? "Pendaftaranmu diperbarui." : "Berhasil daftar. Sampai jumpa di acara.");
    router.refresh();
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-50 px-4 py-2 text-sm font-semibold text-lime-700 ring-1 ring-inset ring-lime-600/20">
        <IconCheck className="h-4 w-4" /> Terdaftar
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-brand transition-colors hover:bg-brand-600"
      >
        Daftar gratis
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Daftar acara" desc={eventTitle}>
        <form onSubmit={submit} className="space-y-5">
          {/* Data diri DITARIK dari akun (core) — user tinggal konfirmasi, tak isi ulang. */}
          <div className="rounded-2xl bg-zinc-50/80 p-4 ring-1 ring-black/[0.04]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                Data diri (dari akunmu)
              </span>
              <span className="text-[10px] font-medium text-zinc-500">otomatis</span>
            </div>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Nama</dt>
                <dd className="font-medium text-ink">{identity.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Email</dt>
                <dd className="truncate font-medium text-ink">{identity.email}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Nomor HP</dt>
                <dd className="font-medium text-ink">{identity.phone ?? "-"}</dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
              Ingin ubah? Perbarui di{" "}
              <a href="/profil" className="font-medium text-brand-600 hover:underline">
                Profil
              </a>
              .
            </p>
          </div>

          {/* Preferensi belajar TIDAK di sini — itu milik akun (lintas-produk), diatur di Profil.
              Form acara hanya menanyakan hal spesifik acara ini. */}

          {/* Field spesifik acara (opsional, contoh — bisa disesuaikan per acara dari CMS). */}
          <label className="block">
            <span className="text-sm font-medium text-zinc-500">Asal instansi / kampus</span>
            <input
              name="institution"
              placeholder="mis. Universitas Indonesia"
              className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white p-3.5 text-sm text-ink placeholder:text-zinc-400 focus:border-brand-400 focus:bg-brand-50/40 focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-500">Catatan / pertanyaan (opsional)</span>
            <textarea
              name="note"
              rows={3}
              placeholder="Ada yang ingin kamu tanyakan ke pembicara?"
              className="mt-1.5 w-full resize-none rounded-2xl border border-black/10 bg-white p-3.5 text-sm text-ink placeholder:text-zinc-400 focus:border-brand-400 focus:bg-brand-50/40 focus:outline-none"
            />
          </label>

          <p className="rounded-xl bg-brand-50/60 px-3 py-2 text-[11px] leading-relaxed text-brand-700/80">
            Ingin konten app &amp; kelas lebih sesuai minatmu? Atur{" "}
            <a href="/profil/edit" className="font-semibold underline">preferensi belajar</a> di Profil.
          </p>

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
              type="submit"
              disabled={loading}
              className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-brand transition-colors hover:bg-brand-600 disabled:opacity-60"
            >
              {loading ? "Mendaftarkan..." : "Konfirmasi daftar"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
