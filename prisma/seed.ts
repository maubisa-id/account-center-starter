import { PrismaClient } from "@prisma/client";
import { auth } from "../src/lib/auth";

const prisma = new PrismaClient();

const DEMO_EMAIL = "budi@example.com";
const DEMO_PASSWORD = "password123";

async function main() {
  // Bersihkan user demo dulu supaya seed bisa dijalankan berulang (idempoten).
  // Hapus anak-anaknya lebih dulu (invoices onDelete: Restrict memblok hapus user).
  await prisma.authUser.deleteMany({ where: { email: DEMO_EMAIL } });
  const existing = await prisma.user.findFirst({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await prisma.eventRegistration.deleteMany({ where: { userId: existing.id } });
    await prisma.entitlement.deleteMany({ where: { userId: existing.id } });
    await prisma.invoice.deleteMany({ where: { userId: existing.id } });
    await prisma.subscription.deleteMany({ where: { userId: existing.id } });
    await prisma.userPreference.deleteMany({ where: { userId: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const now = new Date();
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      uuid: crypto.randomUUID(),
      name: "Budi Santoso",
      email: DEMO_EMAIL,
      phone: "081234567890",
      status: "active",
      emailVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.product.upsert({
    where: { code: "mbg-plus" },
    update: {},
    create: {
      code: "mbg-plus",
      name: "MBG+ (Langganan)",
      scope: "app",
      type: "subscription",
      billingInterval: "monthly",
      price: 75000,
      currency: "IDR",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.product.upsert({
    where: { code: "mbg-forge" },
    update: {},
    create: {
      code: "mbg-forge",
      name: "MBG Forge (Webinar)",
      scope: "app",
      type: "event",
      billingInterval: "once",
      price: 29000,
      currency: "IDR",
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  const sub = await prisma.subscription.create({
    data: {
      userId: user.id,
      productCode: "mbg-plus",
      status: "active",
      provider: "midtrans",
      interval: "monthly",
      amount: 75000,
      currency: "IDR",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      createdAt: now,
      updatedAt: now,
    },
  });

  const inv1 = await prisma.invoice.create({
    data: {
      userId: user.id,
      orderId: "MB-" + Date.now(),
      productCode: "mbg-plus",
      itemType: "subscription",
      itemRef: "mbg-plus",
      itemName: "MBG+ (Langganan) - 1 bulan",
      unitPrice: 75000,
      quantity: 1,
      subscriptionId: sub.id,
      scope: "app",
      grossAmount: 75000,
      currency: "IDR",
      status: "paid",
      motion: "snap",
      paymentType: "qris",
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.entitlement.create({
    data: {
      userId: user.id,
      productCode: "mbg-plus",
      itemType: "subscription",
      itemRef: "mbg-plus",
      scope: "app",
      status: "active",
      source: "subscription",
      invoiceId: inv1.id,
      subscriptionId: sub.id,
      startsAt: now,
      expiresAt: periodEnd,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Contoh webinar berbayar (sekali bayar) supaya ada variasi.
  const inv2 = await prisma.invoice.create({
    data: {
      userId: user.id,
      orderId: "MB-" + (Date.now() + 1),
      itemType: "event",
      itemRef: "mbg-forge-2026-07",
      itemName: "MBG Forge: Personal Branding",
      unitPrice: 29000,
      quantity: 1,
      scope: "app",
      grossAmount: 29000,
      currency: "IDR",
      status: "paid",
      motion: "snap",
      paymentType: "gopay",
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });

  await prisma.entitlement.create({
    data: {
      userId: user.id,
      itemType: "event",
      itemRef: "mbg-forge-2026-07",
      scope: "app",
      status: "active",
      source: "checkout",
      invoiceId: inv2.id,
      startsAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });

  console.log(`Seeded user ${user.email} (id ${user.id}) + 1 langganan, 2 invoice, 2 entitlement.`);

  // Akun demo Better Auth (email+password) supaya bisa langsung login.
  // databaseHook akan menautkan ke core user budi (upsert by email -> set auth_user_id).
  try {
    await auth.api.signUpEmail({
      body: { name: "Budi Santoso", email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    console.log(`Akun demo siap: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } catch (e) {
    console.log("Lewati pembuatan akun demo:", String(e).slice(0, 100));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
