import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { welcomeAccessEmail } from "@/lib/email-templates";
import { suppressWelcomeOnce } from "@/lib/email-suppress";
import { rateLimit } from "@/lib/rate-limit";
import { secureEqual } from "@/lib/secure-compare";

export const dynamic = "force-dynamic";

// Endpoint yang DIPANGGIL OLEH WEB UTAMA (example.com / Directus) setelah pembeli
// mengisi data diri & menyelesaikan pembayaran. Account Center yang memiliki auth,
// jadi pembuatan akun + kredensial sekali pakai ada DI SINI. Trigger-nya (kapan
// dipanggil) ada di repo web utama. Lihat pembayaran.md / ADR-002.

type ProvisionBody = {
  email?: string;
  name?: string;
  phone?: string;
  productCode?: string;
  orderId?: string;
  amount?: number | string;
};

export async function POST(req: NextRequest) {
  // Defense-in-depth di atas shared secret: batasi laju per IP.
  const limited = rateLimit(req, "provision", { max: 20, windowMs: 60_000 });
  if (limited) return limited;

  // Hanya web utama yang boleh memanggil: verifikasi shared secret (waktu konstan).
  const secret = process.env.PROVISION_SECRET;
  const provided = req.headers.get("x-provision-secret") ?? "";
  if (!secret || !secureEqual(provided, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: ProvisionBody;
  try {
    body = (await req.json()) as ProvisionBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim() || email.split("@")[0];
  const phone = body.phone ? String(body.phone) : null;
  const productCode = body.productCode ? String(body.productCode) : null;
  const orderId = body.orderId ? String(body.orderId) : null;
  const amount = body.amount != null && body.amount !== "" ? Number(body.amount) : null;
  // Defense-in-depth: walau endpoint digerbang shared secret, batasi nominal supaya nilai
  // negatif/NaN/janggal tak pernah jadi invoice "paid" (mis. bug pemanggil).
  if (amount != null && (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000)) {
    return NextResponse.json({ error: "amount tidak valid" }, { status: 400 });
  }

  if (!email.includes("@")) {
    return NextResponse.json({ error: "email tidak valid" }, { status: 400 });
  }

  // 1) Akun: buat bila belum ada. SESUAI ADR-002 §6: JANGAN kirim kata sandi acak
  //    dalam teks polos. Buat akun dgn password acak yg tidak disimpan/dikembalikan,
  //    lalu kirim TAUTAN SEKALI PAKAI untuk atur kata sandi sendiri.
  const existingAuth = await prisma.authUser.findFirst({ where: { email } });
  const accountCreated = !existingAuth;

  if (!existingAuth) {
    // Jalur pembelian -> kirim welcomeAccessEmail (info akses), BUKAN welcomeEmail biasa.
    // Tandai agar databaseHook melewati welcomeEmail (hindari email ganda).
    suppressWelcomeOnce(email);
    const throwaway = randomBytes(24).toString("base64url");
    await auth.api.signUpEmail({ body: { email, name, password: throwaway } });
  }

  // Pastikan core user ada & data diri tersimpan (hook signUp sudah upsert by email;
  // untuk akun lama pun kita perbarui nama/nomor HP).
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, ...(phone ? { phone } : {}), updatedAt: new Date() },
    create: {
      uuid: randomUUID(),
      name,
      email,
      phone,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // 2) Catat pembelian (opsional): pembeli sudah bayar di web utama -> invoice lunas
  //    + entitlement aktif, supaya langsung muncul di akunnya.
  let entitlementGranted = false;
  if (productCode && orderId) {
    const product = await prisma.product.findUnique({ where: { code: productCode } });
    if (product) {
      const invoice = await prisma.invoice.upsert({
        where: { orderId },
        update: {},
        create: {
          userId: user.id,
          orderId,
          productCode: product.code,
          itemType: "product",
          itemName: product.name,
          scope: product.scope,
          grossAmount: amount ?? product.price,
          currency: product.currency,
          status: "paid",
          motion: "web-utama",
          paymentType: "web-utama",
          paidAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      const already = await prisma.entitlement.findFirst({ where: { invoiceId: invoice.id } });
      if (!already) {
        await prisma.entitlement.create({
          data: {
            userId: user.id,
            productCode: product.code,
            itemType: "product",
            scope: product.scope,
            status: "active",
            source: "web-utama",
            invoiceId: invoice.id,
            startsAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      entitlementGranted = true;
    }
  }

  // 3) Kirim kredensial sekali pakai lewat email (bukan teks polos):
  //    - akun baru  -> tautan "atur kata sandi" (set-password link).
  //    - akun lama  -> kode OTP masuk (sign-in).
  if (accountCreated) {
    await auth.api.requestPasswordReset({
      body: { email, redirectTo: `${process.env.BETTER_AUTH_URL ?? ""}/reset-password` },
    });
  } else {
    await auth.api.sendVerificationOTP({ body: { email, type: "sign-in" } });
  }

  // 4) Email "selamat datang + akses" untuk pembeli (info akses + halaman masuk). Best-effort.
  if (entitlementGranted) {
    try {
      const productName = productCode
        ? (await prisma.product.findUnique({ where: { code: productCode }, select: { name: true } }))?.name
        : undefined;
      const { subject, html, from, replyTo } = welcomeAccessEmail({
        name,
        email,
        loginUrl: `${process.env.BETTER_AUTH_URL ?? ""}/masuk`,
        productName: productName ?? undefined,
      });
      await sendEmail({ to: email, subject, html, from, replyTo });
    } catch {
      /* email opsional; jangan gagalkan provisioning */
    }
  }

  return NextResponse.json({
    ok: true,
    email,
    userId: user.uuid,
    accountCreated,
    entitlementGranted,
    // Kredensial dikirim via email (no-reply@example.com), tidak dikembalikan di sini.
    credential: accountCreated ? "set-password-email" : "sign-in-otp-email",
    loginUrl: `${process.env.BETTER_AUTH_URL ?? ""}/masuk`,
    note: accountCreated
      ? "Akun dibuat. Tautan atur kata sandi (sekali pakai) dikirim ke email pembeli."
      : "Akun sudah ada. Kode masuk sekali pakai (OTP) dikirim ke email pembeli.",
  });
}
