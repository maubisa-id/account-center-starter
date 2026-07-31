import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/recovery-forms";

export const metadata: Metadata = { title: "Lupa kata sandi · Maubisa" };

export default function LupaPasswordPage() {
  return <ForgotPasswordForm />;
}
