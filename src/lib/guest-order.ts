import type { Prisma, PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { resolveCheckout, isCheckoutError } from "@/lib/checkout";

// Dukungan GUEST CHECKOUT (ADR-002 §1/§2): identitas pembeli dibawa lewat
// Midtrans custom_field1..3 (di-echo di notifikasi webhook), BUKAN ditulis ke DB
// sebelum bayar. Akun (core user) + invoice + entitlement baru dibuat DI WEBHOOK
// saat pembayaran sukses. Modul ini menyediakan parsing + pembuatan user/invoice.

// Layout custom_field (lihat /api/pay/charge/guest):
//   custom_field1 = email
//   custom_field2 = itemRef (id acara Directus, atau kode item katalog)
//   custom_field3 = "name::phone" (name wajib, phone opsional)
export interface GuestFields {
  email: string;
  itemRef: string;
  name: string;
  phone: string | null;
}

export function packGuestField3(name: string, phone: string | null): string {
  return `${name.replace(/::/g, ":")}::${(phone ?? "").replace(/::/g, ":")}`;
}

export function parseGuestFields(n: {
  custom_field1?: string;
  custom_field2?: string;
  custom_field3?: string;
}): GuestFields | null {
  const email = (n.custom_field1 ?? "").trim().toLowerCase();
  const itemRef = (n.custom_field2 ?? "").trim();
  const cf3 = n.custom_field3 ?? "";
  if (!email || !itemRef) return null;
  const sep = cf3.indexOf("::");
  const name = (sep >= 0 ? cf3.slice(0, sep) : cf3).trim();
  const phone = sep >= 0 ? cf3.slice(sep + 2).trim() : "";
  return { email, itemRef, name: name || email.split("@")[0], phone: phone || null };
}

// Resolusi item guest kini memakai resolver bersama (lib/checkout) supaya aturan
// produk/harga tidak pernah beda dengan /api/pay/charge. Lihat resolveCheckout.

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

export interface GuestFulfillResult {
  userId: number;
  email: string;
  invoiceId: number;
  isNewAccount: boolean; // true kalau core user baru dibuat (perlu email atur kata sandi)
}

// Dipanggil dari webhook HANYA saat status paid dan invoice untuk orderId belum ada.
// Buat/temukan core user by email (UNIQUE), lalu buat invoice PAID. Entitlement +
// email struk diproses oleh alur webhook yang sudah ada setelah ini.
export async function createGuestUserAndInvoice(
  tx: Tx,
  args: {
    orderId: string;
    fields: GuestFields;
    paymentType?: string | null;
    midtransTxnId?: string | null;
    // Token kartu tersimpan dari notifikasi Midtrans (hanya untuk langganan dibayar kartu).
    // Dipakai untuk menyiapkan recurring Midtrans-managed di blok "paid" webhook.
    savedTokenId?: string | null;
    savedTokenExpiredAt?: string | null;
    // Nominal yang BENAR-BENAR dibayar (dari notifikasi Midtrans, terikat signature).
    // Divalidasi terhadap harga otoritatif SEBELUM membuat akun/invoice supaya harga yang
    // drift tak meninggalkan invoice-lunas hantu tanpa entitlement (temuan audit P2).
    paidAmount?: number | null;
  },
): Promise<GuestFulfillResult | null> {
  // Resolver bersama: itemRef bisa kode produk ATAU kode acara. Coba produk dulu; kalau
  // bukan produk katalog, perlakukan sebagai acara berbayar (MBG Forge). Sama persis dgn
  // yang dipakai /api/pay/charge & /api/pay/charge/guest — harga otoritatif dari server.
  let resolved = await resolveCheckout({ product: args.fields.itemRef });
  if (isCheckoutError(resolved)) {
    resolved = await resolveCheckout({ event: args.fields.itemRef });
  }
  if (isCheckoutError(resolved)) return null;
  const { item, itemRef, itemName, price, isSub } = resolved;

  // (#4 audit) Cross-check jumlah SEBELUM membuat apa pun. Kalau nominal yang dibayar tak
  // sama dengan harga otoritatif yang di-resolve ulang (mis. harga katalog berubah antara
  // charge dan webhook), JANGAN buat user/invoice hantu — biarkan ops rekonsiliasi manual.
  if (
    args.paidAmount != null &&
    Number.isFinite(args.paidAmount) &&
    Math.abs(price - args.paidAmount) > 0.01
  ) {
    console.error(
      `[guest-order] amount mismatch order=${args.orderId} paid=${args.paidAmount} resolved=${price} — batalkan pembuatan akun/invoice`,
    );
    return null;
  }

  const now = new Date();

  // Akun dibuat SAAT SUKSES (ADR-002): kalau email belum ada -> buat, tandai baru.
  const existing = await tx.user.findFirst({ where: { email: args.fields.email }, select: { id: true } });
  const isNewAccount = !existing;
  const user = await tx.user.upsert({
    where: { email: args.fields.email },
    update: { updatedAt: now, ...(args.fields.phone ? { phone: args.fields.phone } : {}) },
    create: {
      uuid: randomUUID(),
      name: args.fields.name,
      email: args.fields.email,
      phone: args.fields.phone,
      status: "active",
      createdAt: now,
      updatedAt: now,
    },
    select: { id: true },
  });

  const periodStart = isSub ? now : null;
  const periodEnd = isSub ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;

  // LANGGANAN (mis. MBG+) via GUEST: buat baris subscription "pending" lalu tautkan ke invoice
  // — paritas dengan alur login (/api/pay/charge). Efeknya: (1) langganan tampil & bisa
  // dibatalkan di dashboard walau pembeli mulai tanpa akun; (2) blok "paid" webhook meng-
  // aktifkan periode + MENDAFTARKAN recurring bila dibayar kartu (savedToken ada) lewat
  // jalur atomic-claim yang sama. QRIS/VA tak bisa tokenisasi -> langganan aktif 30 hari &
  // diperpanjang manual (batasan yang sama dengan alur login, konsisten lintas entry point).
  let subscriptionId: number | null = null;
  if (isSub) {
    const productCode = item.productCode ?? item.key;
    // GUARD anti-duplikat: kalau user sudah punya langganan AKTIF/PENDING untuk produk yang
    // sama, PAKAI ULANG (tautkan invoice ke sana) alih-alih membuat baris baru. Mencegah dua
    // pendaftaran recurring => dua tagihan bulanan untuk produk yang sama (mis. beli MBG+ dua
    // kali). Blok "paid" webhook lalu memperpanjang periode langganan yang sudah ada.
    const existingSub = await tx.subscription.findFirst({
      where: { userId: user.id, productCode, status: { in: ["active", "pending"] } },
      select: { id: true },
      orderBy: { id: "desc" },
    });
    if (existingSub) {
      subscriptionId = existingSub.id;
      // Bila token kartu baru tersedia & langganan lama belum punya (mis. upgrade dari QRIS ke
      // kartu), simpan supaya recurring bisa diaktifkan oleh blok "paid".
      if (args.savedTokenId) {
        await tx.subscription.updateMany({
          where: { id: existingSub.id, savedToken: null },
          data: {
            savedToken: args.savedTokenId,
            savedTokenExpiresAt: args.savedTokenExpiredAt ? new Date(args.savedTokenExpiredAt) : null,
            updatedAt: now,
          },
        });
      }
    } else {
      const sub = await tx.subscription.create({
        data: {
          userId: user.id,
          productCode,
          status: "pending",
          provider: "midtrans",
          interval: "monthly",
          amount: price,
          currency: "IDR",
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          savedToken: args.savedTokenId ?? null,
          savedTokenExpiresAt: args.savedTokenExpiredAt ? new Date(args.savedTokenExpiredAt) : null,
          createdAt: now,
          updatedAt: now,
        },
        select: { id: true },
      });
      subscriptionId = sub.id;
    }
  }

  const data: Prisma.InvoiceUncheckedCreateInput = {
    userId: user.id,
    orderId: args.orderId,
    productCode: item.productCode ?? item.key,
    itemType: item.itemType ?? "product",
    itemRef,
    itemName,
    unitPrice: price,
    quantity: 1,
    subscriptionId,
    scope: item.scope,
    grossAmount: price,
    currency: "IDR",
    status: "paid",
    motion: "coreapi-guest",
    paymentType: args.paymentType ?? undefined,
    midtransTxnId: args.midtransTxnId ?? undefined,
    periodStart,
    periodEnd,
    paidAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const invoice = await tx.invoice.create({ data, select: { id: true } });

  return { userId: user.id, email: args.fields.email, invoiceId: invoice.id, isNewAccount };
}
