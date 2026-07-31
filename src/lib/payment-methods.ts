import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

// Deteksi merek jaringan dari nomor/masked card (BIN). Server-side, tak bergantung ke browser.
export function brandFromNumber(raw: string): string | null {
  const n = raw.replace(/\D/g, "");
  if (!n) return null;
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2(2[2-9]|[3-6]\d|7[01]\d|720))/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^35/.test(n)) return "jcb";
  if (/^(6011|65|64[4-9])/.test(n)) return "discover";
  if (/^62/.test(n)) return "unionpay";
  return null;
}

// Ambil 4 digit terakhir dari masked_card Midtrans (mis. "48111111-1114" -> "1114").
export function last4FromMasked(masked: string | null | undefined): string | null {
  if (!masked) return null;
  const digits = masked.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export type SavedCardInput = {
  savedToken: string;
  maskedCard?: string | null;
  brand?: string | null;
  bankCode?: string | null;
  expMonth?: number | null;
  expYear?: number | null;
  savedTokenExpiresAt?: Date | null;
};

// Simpan/segarkan metode pembayaran kartu untuk pengguna. Idempoten per (userId, savedToken).
// Jika pengguna belum punya metode utama, metode pertama otomatis jadi utama. Aman dipanggil
// dari webhook (client tx) maupun route (prisma global).
export async function upsertSavedCard(
  db: Tx,
  userId: number,
  input: SavedCardInput,
): Promise<{ id: number; isNew: boolean }> {
  const brand = input.brand ?? brandFromNumber(input.maskedCard ?? "") ?? null;
  const bankCode = input.bankCode ?? null;
  const last4 = last4FromMasked(input.maskedCard);

  const existing = await db.paymentMethod.findUnique({
    where: { userId_savedToken: { userId, savedToken: input.savedToken } },
    select: { id: true },
  });
  if (existing) {
    await db.paymentMethod.update({
      where: { id: existing.id },
      data: {
        brand: brand ?? undefined,
        bankCode: bankCode ?? undefined,
        last4: last4 ?? undefined,
        expMonth: input.expMonth ?? undefined,
        expYear: input.expYear ?? undefined,
        savedTokenExpiresAt: input.savedTokenExpiresAt ?? undefined,
        updatedAt: new Date(),
      },
    });
    return { id: existing.id, isNew: false };
  }

  const count = await db.paymentMethod.count({ where: { userId } });
  const created = await db.paymentMethod.create({
    data: {
      userId,
      provider: "midtrans",
      type: "card",
      brand,
      bankCode,
      last4,
      expMonth: input.expMonth ?? null,
      expYear: input.expYear ?? null,
      savedToken: input.savedToken,
      savedTokenExpiresAt: input.savedTokenExpiresAt ?? null,
      isPrimary: count === 0,
    },
    select: { id: true },
  });
  return { id: created.id, isNew: true };
}

// Jadikan satu metode sebagai utama (unset yang lain) secara atomik. Memverifikasi kepemilikan.
export async function setPrimaryMethod(userId: number, methodId: number): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const m = await tx.paymentMethod.findFirst({ where: { id: methodId, userId }, select: { id: true } });
    if (!m) return false;
    await tx.paymentMethod.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
    await tx.paymentMethod.update({ where: { id: methodId }, data: { isPrimary: true, updatedAt: new Date() } });
    return true;
  });
}

// Hapus metode milik pengguna. Jika yang dihapus adalah utama, promosikan metode terbaru lain
// menjadi utama supaya selalu ada default bila masih ada kartu tersisa.
export async function removeMethod(userId: number, methodId: number): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const m = await tx.paymentMethod.findFirst({
      where: { id: methodId, userId },
      select: { id: true, isPrimary: true },
    });
    if (!m) return false;
    await tx.paymentMethod.delete({ where: { id: methodId } });
    if (m.isPrimary) {
      const next = await tx.paymentMethod.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (next) await tx.paymentMethod.update({ where: { id: next.id }, data: { isPrimary: true } });
    }
    return true;
  });
}

export type PaymentMethodView = Prisma.PaymentMethodGetPayload<{
  select: {
    id: true;
    brand: true;
    bankCode: true;
    last4: true;
    expMonth: true;
    expYear: true;
    isPrimary: true;
    createdAt: true;
  };
}>;

export async function listMethods(userId: number): Promise<PaymentMethodView[]> {
  return prisma.paymentMethod.findMany({
    where: { userId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      brand: true,
      bankCode: true,
      last4: true,
      expMonth: true,
      expYear: true,
      isPrimary: true,
      createdAt: true,
    },
  });
}
