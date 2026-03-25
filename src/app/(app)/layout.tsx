import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getAccount, getSessionEmail } from "@/lib/account";
import { getAlerts } from "@/lib/alerts";
import { AppShell } from "@/components/shell";
import { ToastProvider } from "@/components/toast";

export const dynamic = "force-dynamic";

export default async function AppGroupLayout({ children }: { children: ReactNode }) {
  const email = await getSessionEmail();
  if (!email) redirect("/masuk");

  const { user } = await getAccount();
  const session = await auth.api.getSession({ headers: await headers() });
  const twoFactorEnabled = Boolean(
    (session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled,
  );
  const alerts = user ? getAlerts(user, Boolean(user.emailVerifiedAt), twoFactorEnabled) : [];

  return (
    <ToastProvider>
      <AppShell
        user={
          user
            ? { name: user.name, email: user.email, uuid: user.uuid, avatarUrl: user.avatarUrl }
            : null
        }
        alerts={alerts}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
