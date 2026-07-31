import Link from "next/link";
import { IconCheck, IconMail, IconArrow } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { idr } from "@/lib/format";
import { ResendAccessEmail } from "@/components/pay/resend-access-email";

export const metadata = { title: "Pembayaran diterima · Maubisa" };

export const dynamic = "force-dynamic";

// Domain utama Maubisa untuk tombol "pulang". Bisa ditimpa lewat env bila domain berbeda.
const MAIN_SITE = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://maubisa.id";

// Samarkan email untuk reassurance ("b•••@email.com"): cukup untuk pembeli mengenali
// alamatnya sendiri tanpa memampang PII penuh di layar.
function maskEmail(e?: string | null): string | null {
  if (!e) return null;
  const [user, domain] = e.split("@");
  if (!domain || !user) return null;
  const head = user.slice(0, 1);
  return `${head}${"\u2022".repeat(Math.max(1, Math.min(user.length - 1, 5)))}@${domain}`;
}

// Halaman PUBLIK (di luar grup (app) yang digerbang sesi) = tujuan sukses checkout TAMU.
// Pola "deferred registration": akun dibuat diam-diam oleh webhook saat lunas, jadi CTA utama
// adalah PULANG / nilai yang dibeli, bukan "Masuk" (tamu belum punya kata sandi). "Masuk"
// hanya link kecil sekunder. Nomor pesanan ditampilkan bila dibawa lewat query (?order=).
export default async function TerimaKasih({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; order_id?: string }>;
}) {
  const sp = await searchParams;
  const orderId = (sp.order ?? sp.order_id ?? "").trim() || null;

  // Pesanan tamu: user + invoice dibuat webhook saat lunas. Ambil (best-effort) untuk
  // menampilkan email tersamar + nominal. Bila belum ada (webhook telat), pakai copy umum.
  const invoice = orderId
    ? await prisma.invoice.findUnique({
        where: { orderId },
        select: { grossAmount: true, status: true, user: { select: { email: true } } },
      })
    : null;
  const paid = invoice?.status === "paid";
  const maskedEmail = paid ? maskEmail(invoice?.user?.email ?? null) : null;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <div className="animate-rise w-full max-w-md">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-lime-50 text-lime-600 ring-1 ring-lime-600/20">
          <IconCheck className="h-8 w-8" />
        </span>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-ink">Pembayaran diterima</h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-500">
          Terima kasih. Aksesmu aktif otomatis begitu pembayaran dikonfirmasi, biasanya beberapa saat.
        </p>

        {orderId ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-xs text-zinc-500 shadow-soft ring-1 ring-black/[0.06]">
            No. pesanan <span className="font-semibold text-ink">{orderId}</span>
            {paid ? <span className="text-zinc-400">· {idr(invoice!.grossAmount)}</span> : null}
          </div>
        ) : null}

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-brand-50/60 p-4 text-left ring-1 ring-brand-600/10">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 ring-1 ring-black/[0.05]">
            <IconMail className="h-4 w-4" />
          </span>
          <p className="text-sm leading-relaxed text-ink/80">
            Kami mengirim <strong>invoice</strong> dan <strong>tautan untuk membuat kata sandi</strong>{" "}
            ke {maskedEmail ? <strong>{maskedEmail}</strong> : "emailmu"}. Buat akun kapan saja untuk
            mengelola langganan dan akses, atau lanjut tanpa akun.
          </p>
        </div>

        <div className="mt-7">
          <a
            href={MAIN_SITE}
            className="group inline-flex items-center gap-3 rounded-full bg-brand-500 py-2.5 pl-5 pr-2 text-sm font-semibold text-white shadow-brand transition-[transform,background-color] duration-300 hover:-translate-y-[1px] hover:bg-brand-600"
          >
            <span>Kembali ke Maubisa</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <IconArrow className="h-4 w-4" />
            </span>
          </a>
        </div>

        <p className="mt-5 text-sm text-zinc-500">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-semibold text-brand-600 hover:underline">
            Masuk ke Pusat Akun
          </Link>
        </p>

        <ResendAccessEmail orderId={orderId} />
      </div>
    </main>
  );
}
