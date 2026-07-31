import Link from "next/link";
import { getAccount } from "@/lib/account";
import { getUserPreferences } from "@/lib/preferences";
import { tanggalInput } from "@/lib/format";
import { SectionTitle } from "@/components/ui";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { DbError, NoSeed } from "@/components/states";
import { IconChevron } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function EditProfil() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  const { interests, goals } = await getUserPreferences(user.uuid);

  return (
    <div className="space-y-8">
      <Link
        href="/profil"
        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 transition-colors hover:text-ink"
      >
        <IconChevron className="h-3.5 w-3.5 rotate-180" />
        Kembali ke Profil
      </Link>

      <SectionTitle
        eyebrow="Profil"
        title="Edit profil"
        desc="Perbarui data diri, preferensi bahasa/wilayah, dan personalisasi belajarmu."
      />

      <ProfileForm
        profile={{
          name: user.name,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          phone: user.phone,
          headline: user.headline,
          gender: user.gender,
          birthDate: tanggalInput(user.birthDate),
          city: user.city,
          country: user.country,
          language: user.language,
          timezone: user.timezone,
        }}
        interests={interests}
        goals={goals}
      />
    </div>
  );
}
