"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, savePreferences } from "@/app/(app)/actions";
import { useToast } from "@/components/toast";
import {
  GENDER_OPTIONS,
  LANGUAGE_OPTIONS,
  TIMEZONE_OPTIONS,
  INTEREST_OPTIONS,
  GOAL_OPTIONS,
} from "@/lib/format";
import { Panel } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { Field, SelectField } from "./modal";

export type ProfileValues = {
  name: string;
  displayName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  headline: string | null;
  gender: string | null;
  birthDate: string; // YYYY-MM-DD
  city: string | null;
  country: string | null;
  language: string | null;
  timezone: string | null;
};

function SectionHead({ title, desc }: { title: string; desc?: string }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {desc ? <p className="mt-1 text-sm leading-relaxed text-zinc-500">{desc}</p> : null}
    </div>
  );
}

function Chip({
  name,
  value,
  label,
  defaultChecked,
}: {
  name: string;
  value: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="cursor-pointer select-none rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-sm text-ink transition-colors has-[:checked]:border-brand-400 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-400 has-[:focus-visible]:ring-offset-2">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className="peer sr-only" />
      {label}
    </label>
  );
}

export function ProfileForm({
  profile,
  interests,
  goals,
}: {
  profile: ProfileValues;
  interests: string[];
  goals: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const interestSet = new Set(interests);
  const goalSet = new Set(goals);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // izinkan pilih file sama lagi setelah error
    if (!file) return;
    // Validasi cepat di klien (server tetap memvalidasi ulang).
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setUploadErr("Format harus JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadErr("Ukuran maksimal 2 MB.");
      return;
    }
    setUploadErr(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Gagal mengunggah foto.");
      setAvatarUrl(data.url);
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "Gagal mengunggah foto.");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const fd = new FormData(e.currentTarget);

    // 1) Simpan field profil (tabel users).
    const res = await updateProfile(fd);
    if (res.error) {
      setLoading(false);
      setMsg(res.error);
      return;
    }

    // 2) Simpan preferensi (user_preferences). Kirim SEMUA slug (true/false) supaya yang
    //    di-uncheck ikut dimatikan, bukan hanya yang aktif.
    const checkedInterests = new Set(fd.getAll("interest").map(String));
    const checkedGoals = new Set(fd.getAll("goal").map(String));
    const prefs: Record<string, boolean> = {};
    for (const o of INTEREST_OPTIONS) prefs[`interest:${o.value}`] = checkedInterests.has(o.value);
    for (const o of GOAL_OPTIONS) prefs[`goal:${o.value}`] = checkedGoals.has(o.value);
    const pref = await savePreferences(prefs);
    setLoading(false);
    if (pref.error) {
      setMsg(pref.error);
      return;
    }

    toast.show("Profil berhasil diperbarui.");
    router.push("/profil");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Foto & identitas */}
      <Panel innerClassName="p-6 sm:p-8">
        <SectionHead title="Foto & identitas" desc="Informasi utama yang tampil di akunmu." />
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <Avatar name={profile.name} src={avatarUrl || null} size={96} rounded="rounded-3xl" />
            <span className="text-[11px] text-zinc-500">Pratinjau</span>
          </div>
          <div className="flex-1 space-y-4">
            {/* Upload foto (bukan URL). Hasil unggah dibawa ke server lewat input tersembunyi. */}
            <input type="hidden" name="avatarUrl" value={avatarUrl} />
            <div>
              <span className="text-sm font-medium text-zinc-500">Foto profil</span>
              <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                <label
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 ${
                    uploading ? "pointer-events-none opacity-60" : ""
                  }`}
                >
                  {uploading ? "Mengunggah…" : avatarUrl ? "Ganti foto" : "Unggah foto"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={onPickAvatar}
                    disabled={uploading}
                    className="sr-only"
                  />
                </label>
                {avatarUrl ? (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-zinc-500 transition-colors hover:text-rose-600"
                  >
                    Hapus
                  </button>
                ) : null}
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">JPG, PNG, atau WEBP. Maksimal 2 MB.</p>
              {uploadErr ? <p className="mt-1 text-xs text-rose-600">{uploadErr}</p> : null}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nama lengkap" name="name" defaultValue={profile.name} required autoComplete="name" />
              <Field
                label="Nama tampilan / panggilan"
                name="displayName"
                defaultValue={profile.displayName ?? ""}
                placeholder="mis. Budi"
              />
            </div>
            <Field
              label="Headline singkat"
              name="headline"
              defaultValue={profile.headline ?? ""}
              placeholder="mis. Mahasiswa Teknik · UI"
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Jenis kelamin" name="gender" defaultValue={profile.gender ?? "unspecified"} options={GENDER_OPTIONS} />
              <Field label="Tanggal lahir" name="birthDate" type="date" defaultValue={profile.birthDate} max={today} min="1900-01-01" />
            </div>
          </div>
        </div>
      </Panel>

      {/* Kontak */}
      <Panel innerClassName="p-6 sm:p-8">
        <SectionHead title="Kontak" desc="Alamat email diatur terpisah di halaman Profil (butuh verifikasi)." />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nomor HP" name="phone" type="tel" defaultValue={profile.phone ?? ""} placeholder="08xxxxxxxxxx" autoComplete="tel" />
          <Field label="Kota" name="city" defaultValue={profile.city ?? ""} placeholder="mis. Jakarta" />
        </div>
      </Panel>

      {/* Bahasa & wilayah */}
      <Panel innerClassName="p-6 sm:p-8">
        <SectionHead title="Bahasa & wilayah" desc="Menyesuaikan tampilan tanggal, bahasa, dan waktu." />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Negara/Wilayah" name="country" defaultValue={profile.country ?? "Indonesia"} />
          <SelectField label="Bahasa" name="language" defaultValue={profile.language ?? "id"} options={LANGUAGE_OPTIONS} />
          <SelectField label="Zona waktu" name="timezone" defaultValue={profile.timezone ?? "Asia/Jakarta"} options={TIMEZONE_OPTIONS} />
        </div>
      </Panel>

      {/* Preferensi & personalisasi */}
      <Panel innerClassName="p-6 sm:p-8">
        <SectionHead
          title="Preferensi & personalisasi"
          desc="Dipakai app & kelas untuk menyesuaikan rekomendasi kontenmu. Diatur sekali di sini, bukan per-acara."
        />
        <div className="mt-6 space-y-5">
          <div>
            <span className="text-sm font-medium text-zinc-500">Topik yang kamu minati</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((o) => (
                <Chip key={o.value} name="interest" value={o.value} label={o.label} defaultChecked={interestSet.has(o.value)} />
              ))}
            </div>
          </div>
          <div>
            <span className="text-sm font-medium text-zinc-500">Tujuan belajarmu</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((o) => (
                <Chip key={o.value} name="goal" value={o.value} label={o.label} defaultChecked={goalSet.has(o.value)} />
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {msg ? <p className="text-sm text-rose-600">{msg}</p> : null}

      <div className="flex flex-wrap items-center justify-end gap-3 pb-2">
        <button
          type="button"
          onClick={() => router.push("/profil")}
          className="rounded-full px-5 py-2.5 text-sm font-semibold text-zinc-500 transition-colors hover:text-ink"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white shadow-brand transition-[transform,background-color] duration-300 hover:-translate-y-[1px] hover:bg-brand-600 active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "Menyimpan..." : "Simpan perubahan"}
        </button>
      </div>
    </form>
  );
}
