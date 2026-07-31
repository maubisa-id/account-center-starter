import { getAccount } from "@/lib/account";
import { getUserPreferences } from "@/lib/preferences";
import {
  tanggalPanjang,
  labelGender,
  labelBahasa,
  labelZonaWaktu,
  labelInterest,
  labelGoal,
} from "@/lib/format";
import { Panel, Badge, InfoRow, Reveal, SectionTitle, ButtonLink } from "@/components/ui";
import { Avatar } from "@/components/avatar";
import { EmailVerify } from "@/components/dashboard/email-verify";
import { DbError, NoSeed } from "@/components/states";
import { IconMail, IconSparkle } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Profil() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  const displayName = user.displayName || user.name.split(/\s+/)[0];
  const { interests, goals } = await getUserPreferences(user.uuid);

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Profil"
        title="Informasi pribadi"
        desc="Kelola identitas dan preferensi akun Maubisa kamu."
      />

      <Reveal>
        <Panel innerClassName="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <Avatar name={user.name} src={user.avatarUrl} size={80} rounded="rounded-3xl" />
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-ink">{user.name}</h2>
                  <Badge value={user.status} />
                </div>
                {user.headline ? (
                  <p className="mt-1 text-sm font-medium text-ink/70">{user.headline}</p>
                ) : null}
                <p className="mt-0.5 text-sm text-zinc-500">{user.email}</p>
              </div>
            </div>
            <ButtonLink href="/profil/edit" icon={false}>Edit profil</ButtonLink>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={80}>
        <Panel innerClassName="p-6 sm:p-8">
          <h3 className="text-sm font-bold text-ink">Detail akun</h3>
          <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="Nama lengkap">{user.name}</InfoRow>
            <InfoRow label="Nama tampilan">{displayName}</InfoRow>
            <InfoRow label="Status akun">
              <Badge value={user.status} />
            </InfoRow>
            <InfoRow label="Jenis kelamin">{labelGender(user.gender)}</InfoRow>
            <InfoRow label="Tanggal lahir">
              {user.birthDate ? tanggalPanjang(user.birthDate) : "-"}
            </InfoRow>
            <InfoRow label="Nomor HP">{user.phone ?? "-"}</InfoRow>
            <InfoRow label="Kota">{user.city ?? "-"}</InfoRow>
            <InfoRow label="Negara/Wilayah">{user.country}</InfoRow>
            <InfoRow label="Bahasa">{labelBahasa(user.language)}</InfoRow>
            <InfoRow label="Zona waktu">{labelZonaWaktu(user.timezone)}</InfoRow>
            <InfoRow label="Bergabung sejak">{tanggalPanjang(user.createdAt)}</InfoRow>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={120}>
        <Panel innerClassName="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
                <IconSparkle className="h-4 w-4 text-brand-500" />
                Preferensi & personalisasi
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                Minat & tujuan belajarmu. Dipakai app &amp; kelas Maubisa untuk menyesuaikan konten.
              </p>
            </div>
            <ButtonLink href="/profil/edit" variant="ghost" icon={false}>
              Atur preferensi
            </ButtonLink>
          </div>

          {interests.length === 0 && goals.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-zinc-50/70 px-4 py-3 text-sm text-zinc-500 ring-1 ring-black/[0.04]">
              Belum ada preferensi. Pilih minat & tujuan belajarmu supaya rekomendasi lebih pas.
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Minat topik
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {interests.length ? (
                    interests.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-600/15"
                      >
                        {labelInterest(s)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400">Belum dipilih</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Tujuan belajar
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {goals.length ? (
                    goals.map((s) => (
                      <span
                        key={s}
                        className="rounded-full bg-lime-50 px-3 py-1 text-xs font-semibold text-lime-700 ring-1 ring-inset ring-lime-600/15"
                      >
                        {labelGoal(s)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400">Belum dipilih</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </Panel>
      </Reveal>

      <Reveal delay={180}>
        <Panel innerClassName="p-6 sm:p-8">
          <div>
            <h3 className="text-sm font-bold text-ink">Alamat email</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Email untuk masuk dan memulihkan akun jika kamu lupa kata sandi.
            </p>
          </div>
          <div className="mt-5 space-y-3">
            <div className="flex items-center gap-4 rounded-2xl bg-zinc-50/70 p-4 ring-1 ring-black/[0.04]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-600 ring-1 ring-black/[0.05]">
                <IconMail className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink">{user.email}</span>
                  <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 ring-1 ring-inset ring-brand-600/20">
                    Utama
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-zinc-400">
                  <EmailVerify email={user.email} verified={Boolean(user.emailVerifiedAt)} />
                </div>
              </div>
            </div>
          </div>
        </Panel>
      </Reveal>
    </div>
  );
}
