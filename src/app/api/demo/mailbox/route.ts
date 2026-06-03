import { NextResponse } from "next/server";
import {
  demoMailboxEnabled,
  listDemoEmails,
  clearDemoEmails,
  captureDemoEmail,
  maskEmail,
} from "@/lib/demo/mailbox";
import {
  otpEmail,
  welcomeEmail,
  orderPendingEmail,
  receiptEmail,
  subscriptionActiveEmail,
  eventRegisteredEmail,
} from "@/lib/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Endpoint kotak masuk demo. SEMUA method mati (404) kalau bukan mode demo, jadi tidak ada
// permukaan tambahan di produksi.
function offIfNotDemo() {
  return demoMailboxEnabled() ? null : NextResponse.json({ error: "Tidak ditemukan." }, { status: 404 });
}

// Daftar email (metadata saja; penerima disamarkan). HTML penuh diambil per-item di /[id].
export async function GET() {
  const off = offIfNotDemo();
  if (off) return off;
  const emails = listDemoEmails().map((e) => ({
    id: e.id,
    to: maskEmail(e.to),
    subject: e.subject,
    at: e.at,
  }));
  return NextResponse.json({ emails });
}

// Kosongkan kotak.
export async function DELETE() {
  const off = offIfNotDemo();
  if (off) return off;
  clearDemoEmails();
  return NextResponse.json({ ok: true });
}

// Isi beberapa email contoh (memakai template asli) supaya pengunjung bisa langsung melihat
// ragam desain tanpa harus menjalankan tiap alur.
export async function POST() {
  const off = offIfNotDemo();
  if (off) return off;

  const base = (process.env.BETTER_AUTH_URL || "https://demo-akun.maubisa.id").replace(/\/+$/, "");
  const login = `${base}/masuk`;
  const to = "kamu@contoh.id";
  const cap = (out: { subject: string; html: string }) =>
    captureDemoEmail({ to, subject: out.subject, html: out.html });

  cap(welcomeEmail({ name: "Teman Maubisa", loginUrl: login }));
  cap(otpEmail("482913", "email-verification"));
  cap(
    orderPendingEmail({
      name: "Teman Maubisa",
      orderId: "MB-mbg-plus-a1b2c3",
      itemName: "MBG+ (langganan bulanan)",
      amount: "Rp75.000",
      payUrl: login,
      dueDate: "besok, 23.59 WIB",
    }),
  );
  cap(
    receiptEmail({
      name: "Teman Maubisa",
      orderId: "MB-mbg-plus-a1b2c3",
      itemName: "MBG+ (langganan bulanan)",
      amount: "Rp75.000",
      method: "QRIS",
      date: "hari ini",
      invoiceUrl: login,
    }),
  );
  cap(
    subscriptionActiveEmail({
      name: "Teman Maubisa",
      planName: "MBG+",
      periodEnd: "30 hari lagi",
      manageUrl: login,
    }),
  );
  cap(
    eventRegisteredEmail({
      name: "Teman Maubisa",
      title: "Webinar: Skripsi Anti-Revisi",
      date: "Sabtu, 12 Okt",
      time: "19.00 WIB",
      format: "Online (Zoom)",
    }),
  );

  return NextResponse.json({ ok: true });
}
