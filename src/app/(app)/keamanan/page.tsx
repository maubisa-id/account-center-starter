import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { SectionTitle } from "@/components/ui";
import { SecurityCards } from "@/components/dashboard/security-cards";
import { DbError, NoSeed } from "@/components/states";

export const dynamic = "force-dynamic";

export default async function Keamanan() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  const session = await auth.api.getSession({ headers: await headers() });
  const twoFactorEnabled = Boolean(
    (session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled,
  );

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Keamanan"
        title="Keamanan akun"
        desc="Lindungi akunmu dengan kata sandi yang kuat dan verifikasi tambahan."
      />
      <SecurityCards twoFactorEnabled={twoFactorEnabled} />
    </div>
  );
}
