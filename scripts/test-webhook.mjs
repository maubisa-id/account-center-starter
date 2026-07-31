// Uji lokal webhook Midtrans TANPA tunnel: buat invoice pending, kirim notifikasi
// bertanda tangan ke /api/webhook/midtrans, verifikasi jadi "paid" + entitlement aktif,
// lalu kirim ulang untuk membuktikan idempotency, dan cek signature salah ditolak.
//
// Jalankan (server harus hidup di TEST_BASE_URL, default http://localhost:3000):
//   npm run test:webhook
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const SERVER_KEY = process.env.MIDTRANS_SERVER_KEY ?? "";
const DEMO_EMAIL = "budi@example.com";

if (!SERVER_KEY) {
  console.error("MIDTRANS_SERVER_KEY belum diset di .env");
  process.exit(1);
}

const prisma = new PrismaClient();

function sign(orderId, statusCode, grossAmount) {
  return createHash("sha512")
    .update(orderId + statusCode + grossAmount + SERVER_KEY)
    .digest("hex");
}

async function postNotif(n) {
  const res = await fetch(`${BASE_URL}/api/webhook/midtrans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(n),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function main() {
  const user = await prisma.user.findFirst({ where: { email: DEMO_EMAIL } });
  if (!user) throw new Error("User demo belum ada. Jalankan: npm run seed");

  const now = new Date();
  const orderId = `TEST-${Date.now()}`;
  const grossAmount = "29000";

  // 1) Invoice pending (meniru hasil /api/pay/charge untuk satu acara).
  await prisma.invoice.create({
    data: {
      userId: user.id,
      orderId,
      productCode: "mbg-forge",
      itemType: "event",
      itemRef: `${orderId}-item`,
      itemName: "MBG Forge (uji lokal)",
      unitPrice: 29000,
      quantity: 1,
      scope: "app",
      grossAmount: 29000,
      currency: "IDR",
      status: "pending",
      motion: "snap",
      createdAt: now,
      updatedAt: now,
    },
  });
  console.log(`1) invoice pending dibuat: ${orderId}`);

  // 2) Notifikasi settlement bertanda tangan.
  const statusCode = "200";
  const notif = {
    order_id: orderId,
    status_code: statusCode,
    gross_amount: grossAmount,
    signature_key: sign(orderId, statusCode, grossAmount),
    transaction_status: "settlement",
    fraud_status: "accept",
    payment_type: "qris",
    transaction_id: `txn-${Date.now()}`,
  };
  const r1 = await postNotif(notif);
  console.log(`2) webhook #1 -> HTTP ${r1.status} ${JSON.stringify(r1.body)}`);

  // 3) Verifikasi invoice paid + entitlement aktif.
  const inv = await prisma.invoice.findUnique({ where: { orderId } });
  const ents1 = await prisma.entitlement.findMany({ where: { invoiceId: inv?.id } });
  console.log(`3) invoice.status=${inv?.status}  entitlement=${ents1.length} (status ${ents1[0]?.status ?? "-"})`);

  // 4) Kirim ulang notifikasi yang sama -> idempotent, entitlement tidak nambah.
  const r2 = await postNotif(notif);
  const ents2 = await prisma.entitlement.findMany({ where: { invoiceId: inv?.id } });
  console.log(`4) webhook #2 -> HTTP ${r2.status}  entitlement sekarang=${ents2.length}`);

  // 5) Signature salah -> harus 403.
  const bad = await postNotif({ ...notif, signature_key: "salah" });
  console.log(`5) signature salah -> HTTP ${bad.status} (harus 403)`);

  const ok =
    inv?.status === "paid" && ents1.length === 1 && ents2.length === 1 && bad.status === 403;
  console.log(ok ? "\nHASIL: LULUS \u2705" : "\nHASIL: GAGAL \u274c");

  // Bersihkan data uji agar DB demo tetap rapi.
  await prisma.entitlement.deleteMany({ where: { invoiceId: inv?.id } });
  await prisma.paymentEvent.deleteMany({ where: { orderId } });
  await prisma.invoice.deleteMany({ where: { orderId } });

  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
