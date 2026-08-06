"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePreferences } from "@/app/(app)/actions";
import { INTEREST_OPTIONS, GOAL_OPTIONS } from "@/lib/format";
import { useToast } from "@/components/toast";
import { Modal, SubmitRow } from "@/components/dashboard/modal";
import { IconSparkle } from "@/components/icons";

// Atur Preferensi (minat + tujuan belajar) lewat MODAL — opsi cepat tanpa membuka
// halaman Edit profil penuh. Menyimpan ke user_preferences via savePreferences (kirim
// SEMUA slug true/false supaya yang dinonaktifkan ikut dimatikan).

function ChipToggle({
  label,
  active,
  tone,
  onClick,
}: {
  label: string;
  active: boolean;
  tone: "brand" | "lime";
  onClick: () => void;
}) {
  const on =
    tone === "brand"
      ? "bg-brand-50 text-brand-700 ring-brand-600/25"
      : "bg-lime-50 text-lime-700 ring-lime-600/25";
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
        active ? on : "bg-white text-zinc-500 ring-black/10 hover:text-ink hover:ring-black/20"
      }`}
    >
      {label}
    </button>
  );
}

export function PreferencesModal({ interests, goals }: { interests: string[]; goals: string[] }) {
  const [open, setOpen] = useState(false);
  const [selInterests, setSelInterests] = useState<string[]>(interests);
  const [selGoals, setSelGoals] = useState<string[]>(goals);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function openModal() {
    // Selalu mulai dari kondisi tersimpan (buang perubahan yang tak jadi disimpan sebelumnya).
    setSelInterests(interests);
    setSelGoals(goals);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const prefs: Record<string, boolean> = {};
    for (const o of INTEREST_OPTIONS) prefs[`interest:${o.value}`] = selInterests.includes(o.value);
    for (const o of GOAL_OPTIONS) prefs[`goal:${o.value}`] = selGoals.includes(o.value);
    const res = await savePreferences(prefs);
    setLoading(false);
    if (res.error) {
      toast.show(res.error, "error");
      return;
    }
    toast.show("Preferensi disimpan.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-soft ring-1 ring-black/[0.08] transition-colors hover:bg-zinc-50"
      >
        <IconSparkle className="h-4 w-4 text-brand-500" />
        Atur preferensi
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Atur preferensi"
        desc="Pilih minat & tujuan belajarmu. Dipakai app & kelas untuk menyesuaikan konten."
      >
        <form onSubmit={save} className="space-y-6">
          <div>
            <span className="text-sm font-medium text-zinc-500">Topik yang kamu minati</span>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((o) => (
                <ChipToggle
                  key={o.value}
                  label={o.label}
                  tone="brand"
                  active={selInterests.includes(o.value)}
                  onClick={() => toggle(selInterests, setSelInterests, o.value)}
                />
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-zinc-500">Tujuan belajarmu</span>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((o) => (
                <ChipToggle
                  key={o.value}
                  label={o.label}
                  tone="lime"
                  active={selGoals.includes(o.value)}
                  onClick={() => toggle(selGoals, setSelGoals, o.value)}
                />
              ))}
            </div>
          </div>
          <SubmitRow loading={loading} onCancel={() => setOpen(false)} submitLabel="Simpan preferensi" />
        </form>
      </Modal>
    </>
  );
}
