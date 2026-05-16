import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createPaymentLink, isConfigured, isValidMethod, finishRedirectUrl } from "@/lib/midtrans";
import type { PayMethodId } from "@/lib/midtrans/types";
import { newOrderId } from "@/lib/order-id";
import { isValidEmail } from "@/lib/is-email";

// Alur pembuatan Payment Link (Motion C, bimbingan skripsi — ADR-001 §2.4 / ADR-002).
// SATU implementasi dipakai dua pemanggil: /api/pay/link (server-to-server, gerbang
// PROVISION_SECRET) dan halaman /admin (gerbang sesi admin). Harga OTORITATIF dari DB
// products bila productCode dikenal; jika tidak, pakai amount yang dikirim. Catat user
// pending + invoice pending (by order_id) supaya webhook mencocokkan & mengaktifkan akun.

export type PaymentLinkInput = {
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

export type PaymentLinkOrder =
  | { ok: true; orderId: string; paymentUrl: string }
  | { ok: false; error: string; status: number };

export async function createPaymentLinkOrder(body: PaymentLinkInput): Promise<PaymentLinkOrder> {
  if (!isConfigured()) return { ok: false, error: "Midtrans belum dikonfigurasi.", status: 503 };

  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim() || email.split("@")[0];
  const phone = body.phone ? String(body.phone).trim() : null;
  if (!isValidEmail(email)) return { ok: false, error: "email tidak valid", status: 400 };

  // Resolusi item: DB products (otoritatif) atau data yang dikirim.
  const productCode = body.productCode ? String(body.productCode) : null;
  const product = productCode
    ? await prisma.product.findUnique({ where: { code: productCode } })
    : null;

  const itemName = product?.name ?? (body.itemName ? String(body.itemName) : null);
  const scope = product?.scope ?? (body.scope ? String(body.scope) : "thesis");
  const itemType = product?.type ?? (body.itemType ? String(body.itemType) : "service");
  const amount = product ? Number(product.price) : Number(body.amount ?? 0);

  if (!itemName) return { ok: false, error: "itemName wajib.", status: 400 };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "amount tidak valid.", status: 400 };

  let enabledMethods: PayMethodId[] | undefined;
  if (Array.isArray(body.enabledMethods) && body.enabledMethods.length > 0) {
    const valid = body.enabledMethods.filter((m): m is PayMethodId => isValidMethod(m));
    if (valid.length > 0) enabledMethods = valid;
  }

  const now = new Date();
  const orderId = newOrderId(productCode ?? "link");

  // Catat calon user (pending): akun Better Auth dibuat webhook saat lunas (set-password).
  const user = await prisma.user.upsert({
    where: { email },
    update: { updatedAt: now, ...(phone ? { phone } : {}) },
    create: { uuid: randomUUID(), name, email, phone, status: "active", createdAt: now, updatedAt: now },
    select: { id: true },
  });

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
    return { ok: true, orderId, paymentUrl: link.paymentUrl };
  } catch (e) {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "failed" } });
    console.error("[pay/link] gagal:", e instanceof Error ? e.message : "unknown");
    return { ok: false, error: "Gagal membuat payment link.", status: 502 };
  }
}
