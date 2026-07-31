import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Masuk · Acme",
  description: "Masuk ke akun Acme kamu.",
};

export default function MasukPage() {
  return <LoginForm />;
}
