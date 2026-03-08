import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/recovery-forms";

export const metadata: Metadata = { title: "Atur ulang kata sandi · Maubisa" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const sp = await searchParams;
  return <ResetPasswordForm token={sp.token ?? null} />;
}
