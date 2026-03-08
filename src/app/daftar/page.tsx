import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Daftar · Maubisa",
  description: "Buat akun Maubisa baru.",
};

export default function DaftarPage() {
  return <RegisterForm />;
}
