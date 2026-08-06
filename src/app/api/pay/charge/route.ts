import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { charge, isConfigured, isValidMethod } from "@/lib/midtrans";
import { resolveCheckout, isCheckoutError } from "@/lib/checkout";
import { sendEmail } from "@/lib/email";
import { orderPendingEmail } from "@/lib/email-templates";
import { idr } from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";
import { newOrderId } from "@/lib/order-id";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Charge Core API untuk pengguna login. Harga diambil dari server (bukan klien).
// Akses BARU diaktifkan oleh webhook (server-to-server), bukan dari sini (ADR-002).
// Mengganti alur Snap lama: alih-alih token popup, mengembalikan PaymentInstruction
// (QR/VA/tagihan) yang dirender UI custom sesuai desain layanan ini.
export async function POST(req: Request) {
  const limited = rateLimit(req, "pay-charge", { max: 15, windowMs: 60_000 });
  if (limited) return limited;

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Pembayaran belum tersedia saat ini. Silakan coba lagi nanti." },
      { status: 503 },
    );
  }

  let payload: { key?: string; product?: string; event?: string; method?: string; cardToken?: string; saveCard?: boolean; savedMethodId?: number };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  if (!isValidMethod(payload.method)) {
    return NextResponse.json({ error: "Metode pembayaran tidak dikenali." }, { status: 400 });
  }
  const method = payload.method;
  const usingSavedCard = method === "card" && typeof payload.savedMethodId === "number";
  // Kartu baru: token 3DS sekali-pakai dari frontend (server tak pernah lihat PAN/CVV).
  // Kartu tersimpan: tak butuh token dari klien; server memakai saved_token milik pengguna.
  if (method === "card" && !payload.cardToken && !usingSavedCard) {
    return NextResponse.json({ error: "Token kartu tidak ada. Muat ulang lalu coba lagi." }, { status: 400 });
  }

  // Resolusi item + harga otoritatif (resolver bersama; sama dgn guest & webhook).
  const resolved = await resolveCheckout(payload);
  if (isCheckoutError(resolved)) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { itemRef, itemName, price, isSub, item } = resolved;

  // Identitas dari sesi Better Auth.
  const session = await auth.api.getSession({ headers: req.headers });
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Silakan masuk dulu." }, { status: 401 });
  }
  const user = await prisma.user.findFirst({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 401 });
  }

  const now = new Date();
  const periodStart = isSub ? now : null;
  const periodEnd = isSub ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) : null;
  const orderId = newOrderId(itemRef);

  // Kartu tersimpan: ambil token milik pengguna (verifikasi kepemilikan by userId). Token tetap
  // di server, tak pernah dikirim ke/ dari browser. Charge memakainya sebagai token_id (alur
  // ONE CLICK / saved-token CIT). CATATAN PRODUKSI: pembayaran kartu-tersimpan-tanpa-CVV ini
  // butuh fitur "One Click" AKTIF di dashboard Midtrans + persetujuan bank; kalau tak aktif,
  // pakai Two Click (minta CVV lalu getCardToken(saved_token+cvv)). Sandbox lebih permisif.
  // Ref: https://docs.midtrans.com/reference/card-feature-one-click
  let savedCardToken: string | undefined;
  if (usingSavedCard) {
    const pm = await prisma.paymentMethod.findFirst({
      where: { id: payload.savedMethodId, userId: user.id },
      select: { savedToken: true, verified: true },
    });
    if (!pm) {
      return NextResponse.json({ error: "Kartu tersimpan tidak ditemukan." }, { status: 404 });
    }
    // A-1 (anti card-grafting): kartu 'unverified' (registrasi mandiri, BELUM terbukti lewat
    // transaksi 3DS lunas milik user) TIDAK boleh dipakai bayar sekali-klik tanpa CVV. Bila token
    // kartu orang lain bocor lalu didaftarkan, ia tetap unverified -> ditolak di sini. Untuk
    // mengaktifkannya, user bayar sekali dgn kartu tsb (3DS) -> webhook menandai verified.
    if (!pm.verified) {
      return NextResponse.json(
        { error: "Kartu ini belum bisa dipakai bayar sekali-klik. Lakukan satu pembayaran dengan kartu ini dulu (verifikasi 3DS) untuk mengaktifkannya." },
        { status: 403 },
      );
    }
    savedCardToken = pm.savedToken;
  }

  // Motion B (langganan): buat baris subscription "pending". Diaktifkan oleh webhook (paid).
  let subscriptionId: number | null = null;
  // Tandai apakah subscription DIBUAT oleh request ini. Kalau kita PAKAI ULANG langganan
  // aktif/pending yang sudah ada, error di charge ini TAK BOLEH membatalkannya (bug P1-1:
  // checkout kedua yang gagal mematikan langganan pelanggan yang masih ditagih Midtrans).
  let createdNewSub = false;
  if (isSub) {
    const productCode = item.productCode ?? item.key;
    // GUARD anti-duplikat (sama dgn guest fulfillment): pakai ulang langganan AKTIF/PENDING
    // untuk produk yang sama alih-alih membuat baris baru — mencegah dua pendaftaran recurring
    // (dua tagihan bulanan). Webhook memperpanjang periode langganan yang sudah ada.
    const existingSub = await prisma.subscription.findFirst({
      where: { userId: user.id, productCode, status: { in: ["active", "pending"] } },
      select: { id: true },
      orderBy: { id: "desc" },
    });
    if (existingSub) {
      subscriptionId = existingSub.id;
    } else {
      const sub = await prisma.subscription.create({
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
          createdAt: now,
          updatedAt: now,
        },
      });
      subscriptionId = sub.id;
      createdNewSub = true;
    }
  }

  const invoice = await prisma.invoice.create({
    data: {
      userId: user.id,
      orderId,
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
      status: "pending",
      motion: "coreapi",
      periodStart,
      periodEnd,
      createdAt: now,
      updatedAt: now,
    },
  });

  try {
    // Simpan token kartu bila: (a) langganan dibayar kartu (recurring), ATAU
    // (b) pengguna mencentang "Simpan kartu ini" saat checkout satu-kali. Webhook yang
    // memetakan saved_token_id -> PaymentMethod setelah pembayaran lunas. Kartu tersimpan
    // yang dipakai ulang tak perlu disimpan lagi (sudah ada).
    const saveCardToken = method === "card" && !usingSavedCard && (isSub || payload.saveCard === true);
    const { instruction, savedTokenId, savedTokenExpiredAt, transactionId } = await charge({
      orderId,
      grossAmount: price,
      method,
      itemId: itemRef,
      itemName,
      customer: { name: user.name, email: user.email, phone: user.phone },
      // Kartu baru -> token dari frontend; kartu tersimpan -> saved_token milik pengguna.
      cardTokenId: savedCardToken ? savedCardToken : payload.cardToken,
      saveCardToken,
    });

    // Simpan instruksi (JSON) + metode pilihan + txn id di invoice supaya halaman
    // /bayar/[orderId] bisa menampilkan ulang cara bayar (mis. nomor VA / 3DS).
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paymentType: method,
        chargePayload: JSON.stringify(instruction),
        midtransTxnId: transactionId ?? undefined,
      },
    });

    // Token kartu tersimpan -> catat di subscription untuk pembuatan recurring di webhook
    // (setelah charge pertama LUNAS). Midtrans yang menjadwalkan tagihan berikutnya.
    // Kartu BARU: token dari respons charge (save_token_id). Kartu TERSIMPAN yang dipakai untuk
    // langganan: pakai token tersimpan itu langsung, supaya recurring tetap terdaftar.
    const subToken = savedTokenId ?? (usingSavedCard ? savedCardToken : null);
    if (subscriptionId && subToken) {
      await prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          savedToken: subToken,
          savedTokenExpiresAt: savedTokenExpiredAt ? new Date(savedTokenExpiredAt) : undefined,
        },
      });
    }

    // Email "menunggu pembayaran" (berguna untuk VA/retail). Best-effort; jangan gagalkan
    // checkout kalau email error. payUrl = halaman instruksi bayar (bisa dibuka ulang).
    try {
      const { subject, html, from, replyTo } = orderPendingEmail({
        name: user.name,
        orderId,
        itemName,
        amount: idr(price),
        payUrl: `${process.env.BETTER_AUTH_URL ?? ""}/bayar/${orderId}`,
      });
      await sendEmail({ to: user.email, subject, html, from, replyTo });
    } catch {
      /* email opsional */
    }

    return NextResponse.json({ orderId, instruction });
  } catch (e) {
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "failed" } });
    // Batalkan HANYA subscription yang request ini buat DAN masih pending. Jangan pernah
    // mematikan langganan aktif yang dipakai ulang (P1-1) — updateMany + guard status pending.
    if (createdNewSub && subscriptionId) {
      await prisma.subscription.updateMany({
        where: { id: subscriptionId, status: "pending" },
        data: { status: "cancelled", updatedAt: new Date() },
      });
    }
    // Detail di-log server-side; jangan echo internal ke klien (redaksi).
    console.error("[pay/charge] gagal:", e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "Gagal memulai pembayaran. Coba lagi." }, { status: 502 });
  }
}
