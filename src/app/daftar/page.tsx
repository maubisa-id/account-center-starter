import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Daftar · Acme",
  description: "Buat akun Acme baru.",
};

export default function DaftarPage() {
  return <RegisterForm />;
}
