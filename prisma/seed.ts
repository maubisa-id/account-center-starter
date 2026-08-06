import { PrismaClient } from "@prisma/client";
import { auth } from "../src/lib/auth";

const prisma = new PrismaClient();

const PASSWORD = "password123";
const ADMIN_EMAIL = "admin@example.com";

// Semua akun demo (budi = user utama yang dipakai test-webhook; admin lewat ADMIN_EMAILS).
// Data sengaja BERAGAM supaya /admin terlihat hidup: langganan aktif & batal, acara gratis &
// berbayar lintas lini (app/thesis/kelas), pembelian skripsi & kelas, dan tagihan tertunda.
const DEMO_EMAILS = [
  "budi@example.com",
  "siti@example.com",
  "andi@example.com",
  "dewi@example.com",
  "rizki@example.com",
  "maya@example.com",
  ADMIN_EMAIL,
];

const now = new Date();
const daysFromNow = (d: number) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);
let orderSeq = Date.now();
const nextOrderId = () => "MB-" + orderSeq++;

async function cleanup() {
  for (const email of DEMO_EMAILS) {
    await prisma.authUser.deleteMany({ where: { email } });
    const u = await prisma.user.findFirst({ where: { email } });
    if (!u) continue;
    await prisma.eventRegistration.deleteMany({ where: { userId: u.id } });
    await prisma.entitlement.deleteMany({ where: { userId: u.id } });
    await prisma.invoice.deleteMany({ where: { userId: u.id } });
    await prisma.subscription.deleteMany({ where: { userId: u.id } });
    await prisma.userPreference.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  }
}

async function seedProducts() {
  const products = [
    { code: "membership-pro", name: "Keanggotaan Pro", scope: "app", type: "subscription", billingInterval: "monthly", price: 75000 },
    { code: "webinar-sample", name: "Webinar Contoh", scope: "app", type: "event", billingInterval: "once", price: 29000 },
    { code: "consult-basic", name: "Konsultasi - Basic", scope: "thesis", type: "service", billingInterval: "once", price: 150000 },
    { code: "consult-plus", name: "Konsultasi - Plus", scope: "thesis", type: "service", billingInterval: "once", price: 850000 },
    { code: "course-sample", name: "Kelas Contoh", scope: "kelas", type: "course", billingInterval: "once", price: 349000 },
  ];
  for (const p of products) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: { ...p, currency: "IDR", active: true, createdAt: now, updatedAt: now },
    });
  }
}

async function createUser(opts: {
  name: string;
  email: string;
  phone?: string;
  createdAt?: Date;
  city?: string;
}) {
  const user = await prisma.user.create({
    data: {
      uuid: crypto.randomUUID(),
      name: opts.name,
      email: opts.email,
      phone: opts.phone ?? null,
      city: opts.city ?? null,
      status: "active",
      emailVerifiedAt: opts.createdAt ?? now,
      createdAt: opts.createdAt ?? now,
      updatedAt: now,
    },
  });
  // Akun Better Auth (email+password) supaya bisa login; hook menautkan ke core user (by email).
  try {
    await auth.api.signUpEmail({ body: { name: opts.name, email: opts.email, password: PASSWORD } });
  } catch (e) {
    console.log(`  (lewati auth ${opts.email}):`, String(e).slice(0, 80));
  }
  return user;
}

async function addSubscription(
  userId: number,
  opts: { productCode: string; amount: number; status?: string; cancelAtPeriodEnd?: boolean; scope?: string },
) {
  const status = opts.status ?? "active";
  const scope = opts.scope ?? "app";
  const sub = await prisma.subscription.create({
    data: {
      userId,
      productCode: opts.productCode,
      status,
      provider: "midtrans",
      interval: "monthly",
      amount: opts.amount,
      currency: "IDR",
      currentPeriodStart: now,
      currentPeriodEnd: daysFromNow(30),
      cancelAtPeriodEnd: opts.cancelAtPeriodEnd ?? false,
      cancelledAt: status === "cancelled" ? now : null,
      createdAt: now,
      updatedAt: now,
    },
  });
  const inv = await prisma.invoice.create({
    data: {
      userId,
      orderId: nextOrderId(),
      productCode: opts.productCode,
      itemType: "subscription",
      itemRef: opts.productCode,
      itemName: `${opts.productCode} - 1 bulan`,
      unitPrice: opts.amount,
      quantity: 1,
      subscriptionId: sub.id,
      scope,
      grossAmount: opts.amount,
      currency: "IDR",
      status: "paid",
      motion: "snap",
      paymentType: "qris",
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });
  if (status === "active") {
    await prisma.entitlement.create({
      data: {
        userId,
        productCode: opts.productCode,
        itemType: "subscription",
        itemRef: opts.productCode,
        scope,
        status: "active",
        source: "subscription",
        invoiceId: inv.id,
        subscriptionId: sub.id,
        startsAt: now,
        expiresAt: daysFromNow(30),
        createdAt: now,
        updatedAt: now,
      },
    });
  }
  return sub;
}

async function addPurchase(
  userId: number,
  opts: {
    itemType: string; // "event" | "service" | "course"
    itemRef: string;
    itemName: string;
    amount: number;
    scope: string;
    productCode?: string;
    status?: string; // paid | pending
    paymentType?: string;
    entitle?: boolean;
    daysAgo?: number;
  },
) {
  const status = opts.status ?? "paid";
  const at = opts.daysAgo ? daysFromNow(-opts.daysAgo) : now;
  const inv = await prisma.invoice.create({
    data: {
      userId,
      orderId: nextOrderId(),
      productCode: opts.productCode ?? null,
      itemType: opts.itemType,
      itemRef: opts.itemRef,
      itemName: opts.itemName,
      unitPrice: opts.amount,
      quantity: 1,
      scope: opts.scope,
      grossAmount: opts.amount,
      currency: "IDR",
      status,
      motion: opts.itemType === "service" ? "paymentlink" : "snap",
      paymentType: status === "paid" ? (opts.paymentType ?? "gopay") : null,
      paidAt: status === "paid" ? at : null,
      createdAt: at,
      updatedAt: at,
    },
  });
  if (status === "paid" && (opts.entitle ?? true)) {
    await prisma.entitlement.create({
      data: {
        userId,
        productCode: opts.productCode ?? null,
        itemType: opts.itemType,
        itemRef: opts.itemRef,
        scope: opts.scope,
        status: "active",
        source: "checkout",
        invoiceId: inv.id,
        startsAt: at,
        createdAt: at,
        updatedAt: at,
      },
    });
  }
  return inv;
}

async function addFreeEvent(
  userId: number,
  opts: { eventRef: string; eventTitle: string; scope: string; institution?: string; daysAgo?: number },
) {
  const at = opts.daysAgo ? daysFromNow(-opts.daysAgo) : now;
  await prisma.eventRegistration.create({
    data: {
      userId,
      eventRef: opts.eventRef,
      eventTitle: opts.eventTitle,
      scope: opts.scope,
      institution: opts.institution ?? null,
      paid: false,
      createdAt: at,
      updatedAt: at,
    },
  });
}

async function main() {
  await cleanup();
  await seedProducts();

  // 1) Budi - pelanggan aktif: langganan aktif, 1 webinar berbayar, 1 acara gratis.
  const budi = await createUser({ name: "Budi Santoso", email: "budi@example.com", phone: "081234567890", city: "Jakarta" });
  await addSubscription(budi.id, { productCode: "membership-pro", amount: 75000, scope: "app" });
  await addPurchase(budi.id, { itemType: "event", itemRef: "webinar-sample-2026-07", itemName: "Webinar Contoh: Personal Branding", amount: 29000, scope: "app", productCode: "webinar-sample", paymentType: "gopay", daysAgo: 10 });
  await addFreeEvent(budi.id, { eventRef: "3", eventTitle: "Synthesis of Thinking", scope: "app", institution: "Universitas Indonesia", daysAgo: 5 });

  // 2) Siti - jalur konsultasi: beli paket Plus + 1 acara gratis.
  const siti = await createUser({ name: "Siti Nurhaliza", email: "siti@example.com", phone: "081298765432", city: "Bandung", createdAt: daysFromNow(-40) });
  await addPurchase(siti.id, { itemType: "service", itemRef: "consult-plus", itemName: "Konsultasi - Plus", amount: 850000, scope: "thesis", productCode: "consult-plus", paymentType: "bank_transfer", daysAgo: 20 });
  await addFreeEvent(siti.id, { eventRef: "akademik-riset-2026", eventTitle: "Webinar Metodologi Riset", scope: "thesis", institution: "ITB", daysAgo: 8 });

  // 3) Andi - langganan aktif + dua webinar berbayar + acara gratis.
  const andi = await createUser({ name: "Andi Pratama", email: "andi@example.com", phone: "081211112222", city: "Surabaya", createdAt: daysFromNow(-25) });
  await addSubscription(andi.id, { productCode: "membership-pro", amount: 75000, scope: "app" });
  await addPurchase(andi.id, { itemType: "event", itemRef: "webinar-sample-2026-06", itemName: "Webinar Contoh: Public Speaking", amount: 29000, scope: "app", productCode: "webinar-sample", paymentType: "qris", daysAgo: 30 });
  await addPurchase(andi.id, { itemType: "event", itemRef: "webinar-sample-2026-07", itemName: "Webinar Contoh: Personal Branding", amount: 29000, scope: "app", productCode: "webinar-sample", paymentType: "credit_card", daysAgo: 9 });
  await addFreeEvent(andi.id, { eventRef: "4", eventTitle: "Readverse: Read Beyond Information", scope: "app", daysAgo: 3 });

  // 4) Dewi — langganan DIBATALKAN (di akhir periode) + 1 tagihan TERTUNDA (webinar).
  const dewi = await createUser({ name: "Dewi Lestari", email: "dewi@example.com", phone: "081233334444", city: "Yogyakarta", createdAt: daysFromNow(-60) });
  await addSubscription(dewi.id, { productCode: "membership-pro", amount: 75000, scope: "app", status: "active", cancelAtPeriodEnd: true });
  await addPurchase(dewi.id, { itemType: "event", itemRef: "webinar-sample-2026-08", itemName: "Webinar Contoh: Negosiasi", amount: 29000, scope: "app", productCode: "webinar-sample", status: "pending" });
  await addFreeEvent(dewi.id, { eventRef: "5", eventTitle: "Sesi Diskusi Komunitas", scope: "app", daysAgo: 2 });

  // 5) Rizki - jalur kelas: beli kelas contoh + acara gratis sertifikasi.
  const rizki = await createUser({ name: "Rizki Ramadhan", email: "rizki@example.com", phone: "081255556666", city: "Medan", createdAt: daysFromNow(-15) });
  await addPurchase(rizki.id, { itemType: "course", itemRef: "course-sample", itemName: "Kelas Contoh", amount: 349000, scope: "kelas", productCode: "course-sample", paymentType: "credit_card", daysAgo: 12 });
  await addPurchase(rizki.id, { itemType: "event", itemRef: "webinar-sample-2026-07", itemName: "Webinar Contoh: Personal Branding", amount: 29000, scope: "app", productCode: "webinar-sample", paymentType: "shopeepay", daysAgo: 9 });
  await addFreeEvent(rizki.id, { eventRef: "sertifikasi-karir-2026", eventTitle: "Webinar Persiapan Karier", scope: "kelas", institution: "Politeknik Negeri", daysAgo: 6 });

  // 6) Maya — pengguna baru, hanya daftar acara gratis (belum ada pembelian).
  const maya = await createUser({ name: "Maya Putri", email: "maya@example.com", phone: "081277778888", city: "Semarang", createdAt: daysFromNow(-3) });
  await addFreeEvent(maya.id, { eventRef: "6", eventTitle: "Sesi Latihan Komunikasi", scope: "app", institution: "Universitas Diponegoro", daysAgo: 1 });

  const counts = {
    users: await prisma.user.count(),
    subs: await prisma.subscription.count(),
    invoices: await prisma.invoice.count(),
    entitlements: await prisma.entitlement.count(),
    freeEvents: await prisma.eventRegistration.count(),
  };
  console.log("Seed selesai:", JSON.stringify(counts));

  // 7) Akun admin demo (allowlist ADMIN_EMAILS -> mendarat di /admin).
  try {
    await auth.api.signUpEmail({ body: { name: "Admin Demo", email: ADMIN_EMAIL, password: PASSWORD } });
    console.log(`Akun admin siap: ${ADMIN_EMAIL} / ${PASSWORD}`);
  } catch (e) {
    console.log("Lewati pembuatan akun admin:", String(e).slice(0, 100));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
