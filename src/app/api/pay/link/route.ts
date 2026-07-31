import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createPaymentLink, isConfigured, isValidMethod, finishRedirectUrl } from "@/lib/midtrans";
import type { PayMethodId } from "@/lib/midtrans/types";
import { rateLimit } from "@/lib/rate-limit";
import { secureEqual } from "@/lib/secure-compare";
import { newOrderId } from "@/lib/order-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PAYMENT LINK (Motion C — bimbingan skripsi, ADR-001 §2.4 / ADR-002).
// Dipanggil server-to-server oleh admin/web-utama SETELAH konsultasi WhatsApp:
// catat calon user (pending) + invoice pending, lalu generate Payment Link VIA API
// (bukan manual di dashboard) supaya order_id + identitas tercatat dan webhook
// mengaktifkan akun otomatis. Harga bersifat kustom (per konsultasi) -> tepercaya
// karena endpoint digerbang shared secret. Kalau productCode ada di DB products,
// scope/nama/harga diambil dari sana (otoritatif); jika tidak, pakai yang dikirim.

type Body = {
  email?: string;
  name?: string;
  phone?: string;
  productCode?: string;
  itemName?: string;
  scope?: string;
  amount?: number | string;
  itemType?: string;
  enabledMethods?: string[];
  expiryHours?: number;
};

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, "pay-link", { max: 20, windowMs: 60_000 });
  if (limited) return limited;

  const secret = process.env.PROVISION_SECRET;
  const provided = req.headers.get("x-provision-secret") ?? "";
  if (!secret || !secureEqual(provided, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isConfigured()) {
    return NextResponse.json({ error: "Midtrans belum dikonfigurasi." }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim() || email.split("@")[0];
  const phone = body.phone ? String(body.phone).trim() : null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "email tidak valid" }, { status: 400 });
  }

  // Resolusi item: DB products (otoritatif) atau data yang dikirim admin.
  const productCode = body.productCode ? String(body.productCode) : null;
  const product = productCode
    ? await prisma.product.findUnique({ where: { code: productCode } })
    : null;

  const itemName = product?.name ?? (body.itemName ? String(body.itemName) : null);
  const scope = product?.scope ?? (body.scope ? String(body.scope) : "thesis");
  const itemType = product?.type ?? (body.itemType ? String(body.itemType) : "service");
  const amount = product ? Number(product.price) : Number(body.amount ?? 0);

  if (!itemName) return NextResponse.json({ error: "itemName wajib." }, { status: 400 });
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount tidak valid." }, { status: 400 });
  }

  // Validasi metode (opsional) untuk membatasi pilihan di halaman Midtrans.
  let enabledMethods: PayMethodId[] | undefined;
  if (Array.isArray(body.enabledMethods) && body.enabledMethods.length > 0) {
    const valid = body.enabledMethods.filter((m): m is PayMethodId => isValidMethod(m));
    if (valid.length > 0) enabledMethods = valid;
  }

  const now = new Date();
  // Order id tak-tertebak (samakan dgn newOrderId di jalur lain) — cegah enumerasi status.
  const orderId = newOrderId(productCode ?? "link");

  // Catat calon user (pending): akun Better Auth dibuat webhook saat lunas (set-password).
  const user = await prisma.user.upsert({
    where: { email },
    update: { updatedAt: now, ...(phone ? { phone } : {}) },
    create: {
      uuid: randomUUID(),
      name,
      email,
      phone,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    select: { id: true },
  });

  // Invoice pending: webhook mencocokkan by order_id lalu mengaktifkan akses.
  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      orderId,
      productCode: product?.code ?? productCode,
      itemType,
      itemRef: product?.code ?? productCode ?? itemName,
      itemName,
      unitPrice: amount,
      quantity: 1,
      scope,
      grossAmount: amount,
      currency: "IDR",
      status: "pending",
      motion: "payment_link",
      createdAt: now,
      updatedAt: now,
    },
  });

  try {
    const link = await createPaymentLink({
      orderId,
      grossAmount: amount,
      itemId: product?.code ?? productCode ?? "thesis",
      itemName,
      customer: { name, email, phone },
      enabledMethods,
      expiryHours: body.expiryHours,
      usageLimit: 1,
      finishUrl: finishRedirectUrl(orderId),
    });

    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { chargePayload: JSON.stringify({ kind: "payment_link", paymentUrl: link.paymentUrl }) },
    });

    // payment_url dikirim admin ke pelanggan lewat WhatsApp (Motion C).
    return NextResponse.json({ ok: true, orderId, paymentUrl: link.paymentUrl });
  } catch (e) {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "failed" } });
    console.error("[pay/link] gagal:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Gagal membuat payment link." }, { status: 502 });
  }
}
