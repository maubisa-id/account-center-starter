import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { demoMailboxEnabled } from "@/lib/demo/mailbox";
import { DemoInbox } from "@/components/demo/inbox";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kotak Email Demo · Maubisa",
  description: "Lihat email yang dikirim aplikasi (OTP, selamat datang, tagihan) secara langsung.",
  robots: { index: false, follow: false },
};

// Halaman kotak masuk demo. Hanya ada saat mode demo; di produksi -> 404.
export default function KotakDemoPage() {
  if (!demoMailboxEnabled()) notFound();
  return <DemoInbox />;
}
