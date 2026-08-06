import type { Metadata } from "next";
import { TwoFactorChallengeForm } from "@/components/auth/recovery-forms";

export const metadata: Metadata = { title: "Verifikasi 2FA - Account Center Starter" };

export default function TwoFactorPage() {
  return <TwoFactorChallengeForm />;
}
