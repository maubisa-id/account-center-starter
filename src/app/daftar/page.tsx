import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Daftar - Account Center Starter",
  description: "Buat akun ini baru.",
};

export default function DaftarPage() {
  return <RegisterForm />;
}
