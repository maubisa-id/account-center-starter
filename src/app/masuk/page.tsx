import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Masuk - Account Center Starter",
  description: "Masuk ke akun ini kamu.",
};

export default function MasukPage() {
  return <LoginForm />;
}
