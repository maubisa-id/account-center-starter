import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Masuk · Maubisa",
  description: "Masuk ke akun Maubisa kamu.",
};

export default function MasukPage() {
  return <LoginForm />;
}
