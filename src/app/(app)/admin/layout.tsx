import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSessionEmail } from "@/lib/account";
import { isAdminEmail } from "@/lib/admin";
import { adminMfaRequired } from "@/lib/admin-mfa";

export const dynamic = "force-dynamic";

// Layout admin: gerbang MFA untuk operator. Kontrol keamanan (PCI Req8, SOC2 CC6.6, ISO A.8.5):
// akses administratif butuh 2FA. Kebijakan dipusatkan di lib/admin-mfa (fail-closed di produksi,
// demo-safe). Bila wajib & admin belum 2FA -> dialihkan ke /keamanan. Selain itu -> nudge banner.
// Gate admin per-halaman (notFound untuk non-admin) tetap ada; ini lapis tambahan khusus MFA.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const email = await getSessionEmail();
  const admin = isAdminEmail(email);

  let twoFactorEnabled = false;
  if (admin) {
    const session = await auth.api.getSession({ headers: await headers() });
    twoFactorEnabled = Boolean((session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled);
  }

  if (admin && !twoFactorEnabled && adminMfaRequired()) {
    redirect("/keamanan?mfa=required");
  }

  return (
    <>
      {admin && !twoFactorEnabled ? (
        <div className="mb-6 flex flex-col gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-500/20 sm:flex-row sm:items-center sm:justify-between">
          <span>
            <strong>Keamanan operator:</strong> akun admin sebaiknya mengaktifkan verifikasi dua langkah (2FA)
            untuk melindungi akses ke data pengguna dan pembayaran.
          </span>
          <Link
            href="/keamanan"
            className="shrink-0 rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Aktifkan 2FA
          </Link>
        </div>
      ) : null}
      {children}
    </>
  );
}
