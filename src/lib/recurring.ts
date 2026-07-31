import type { Prisma, PrismaClient } from "@prisma/client";

// Dukungan langganan Midtrans-managed (recurring Pro). Saat Midtrans menagih ulang
// otomatis, notifikasi datang dengan `subscription_id` dan order_id BARU yang belum
// punya invoice lokal. Modul ini membuat invoice perpanjangan (renewal) dari data
// langganan + invoice terakhirnya, lalu alur webhook yang ada (blok "paid")
// memperpanjang periode + entitlement seperti biasa. Idempoten by order_id (UNIQUE).

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// Buat invoice renewal untuk sebuah charge langganan (dipanggil dari webhook saat
// order_id tak dikenal TAPI ada subscription_id yang cocok dengan Subscription lokal).
// Mengembalikan orderId invoice yang dibuat, atau null bila langganan tak ditemukan.
export async function createRenewalInvoice(
  tx: Tx,
  args: {
    providerRef: string; // subscription_id Midtrans (= Subscription.providerRef lokal)
    orderId: string;
    grossAmount: number;
    paymentType?: string | null;
    midtransTxnId?: string | null;
    rawPayload: string;
  },
): Promise<boolean> {
  const sub = await tx.subscription.findFirst({ where: { providerRef: args.providerRef } });
  if (!sub) return false;
  // Jangan hidupkan langganan yang sudah dibatalkan lokal: kalau ada charge nyasar dari
  // Midtrans untuk langganan cancelled (mis. pembatalan belum sempat propagate), abaikan
  // supaya tidak "resurrect" akses. (Webhook juga memanggil cancelSubscription ke Midtrans.)
  if (sub.status === "cancelled") return false;

  // Deteksi drift harga: nominal charge HARUS sama dengan harga langganan tersimpan.
  // Signature sudah menjamin keaslian nominal; ini menangkap konfigurasi Subscription API
  // yang menyimpang dari sub.amount. Tetap lanjut (nominal asli dari Midtrans), tapi log.
  const expected = Number(sub.amount);
  if (Number.isFinite(expected) && Math.abs(expected - args.grossAmount) > 0.01) {
    console.error(
      `[recurring] amount mismatch sub=${sub.id} expected=${expected} charged=${args.grossAmount}`,
    );
  }

  // Salin metadata item dari invoice langganan terakhir supaya renewal konsisten.
  const last = await tx.invoice.findFirst({
    where: { subscriptionId: sub.id },
    orderBy: { id: "desc" },
  });

  const now = new Date();
  // Periode 30 hari untuk renewal ini. WAJIB diisi: entitlement.expiresAt diturunkan dari
  // periodEnd, dan expiresAt null berarti akses PERMANEN (lihat lib/entitlement.ts). Tanpa
  // ini, tiap perpanjangan malah memberi akses selamanya.
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const data: Prisma.InvoiceUncheckedCreateInput = {
    userId: sub.userId,
    orderId: args.orderId,
    productCode: sub.productCode,
    itemType: "subscription",
    itemRef: last?.itemRef ?? sub.productCode,
    itemName: last?.itemName ?? sub.productCode,
    unitPrice: args.grossAmount,
    quantity: 1,
    subscriptionId: sub.id,
    scope: last?.scope ?? "app",
    grossAmount: args.grossAmount,
    currency: "IDR",
    status: "pending", // dinaikkan ke paid oleh blok webhook yang memanggil ini
    motion: "coreapi-recurring",
    paymentType: args.paymentType ?? undefined,
    midtransTxnId: args.midtransTxnId ?? undefined,
    rawPayload: args.rawPayload,
    periodStart: now,
    periodEnd,
    createdAt: now,
    updatedAt: now,
  };
  await tx.invoice.create({ data });
  return true;
}
