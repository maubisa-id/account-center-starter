import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import {
  verifySignature,
  resolveStatus,
  fetchTransactionStatus,
  createSubscription,
  cancelSubscription,
  getSubscription,
} from "@/lib/midtrans";
import { sendEmail } from "@/lib/email";
import { receiptEmail, paymentFailedEmail } from "@/lib/email-templates";
import { idr, tanggal, namaProduk, metodeBayar } from "@/lib/format";
import { parseGuestFields, createGuestUserAndInvoice } from "@/lib/guest-order";
import { createRenewalInvoice } from "@/lib/recurring";
import { suppressWelcomeOnce } from "@/lib/email-suppress";
import { upsertSavedCard } from "@/lib/payment-methods";
import { lookupBin } from "@/lib/midtrans/bin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Nilai sementara pada subscriptions.provider_ref untuk MENGKLAIM pendaftaran recurring
// secara atomik. Kartu mengirim DUA notifikasi lunas (capture lalu settlement) dengan
// eventId berbeda -> keduanya lolos idempotensi; sentinel ini memastikan HANYA satu yang
// memanggil Subscription API (mencegah langganan & tagihan dobel). Bukan subscription_id
// Midtrans yang valid, jadi tak akan cocok saat pencocokan renewal.
const RECURRING_PENDING = "pending-setup";

type ReceiptData = { to: string; orderId: string; itemName: string; amount: string; method: string; date: string; invoiceUrl: string };
type FailedData = { to: string; name: string | null; orderId: string; itemName: string; retryUrl: string; reason?: string };
// Data untuk membuat langganan Midtrans-managed (recurring) SETELAH charge pertama lunas.
// Dikumpulkan di dalam transaksi, dieksekusi (panggilan API eksternal) setelah commit.
type RecurringSetup = { subscriptionId: number; savedToken: string; amount: number; email: string | null; productCode: string; startTime: Date };

type Notif = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
  subscription_id?: string;
  // Kartu dgn save_token_id: Midtrans meng-echo token tersimpan di notifikasi. Dipakai
  // guest checkout langganan untuk mendaftarkan recurring (guest tak menulis DB saat charge).
  saved_token_id?: string;
  saved_token_id_expired_at?: string;
  // Kartu: nomor tersamar (mis. "48111111-1114") untuk metadata metode tersimpan (brand/last4).
  masked_card?: string;
  custom_field1?: string;
  custom_field2?: string;
  custom_field3?: string;
};

// Notifikasi LIFECYCLE subscription (Recurring Notification URL): Midtrans mengabari perubahan
// status langganan (active/inactive) dengan payload ber-`subscription_id` TANPA order_id /
// signature_key / status_code. Ini BEDA dari notifikasi CHARGE berulang (ber-order_id +
// signature) yang ditangani jalur utama POST. Tanpa penanganan khusus, payload ini jatuh ke
// cek signature dan ditolak 403 -> dashboard Midtrans menandai Recurring Notification URL
// "error". Payload TAK ber-signature, jadi JANGAN percaya isinya: verifikasi status resmi ke
// Get Subscription API (server key) dulu, dan hanya untuk langganan yang benar-benar milik kita
// (cegah probing subscription_id acak).
async function handleSubscriptionNotification(subscriptionId: string): Promise<NextResponse> {
  const sub = await prisma.subscription.findFirst({ where: { providerRef: subscriptionId } });
  // Bukan langganan kita (atau provider_ref sudah dilepas) -> akui saja, jangan bocorkan apa pun.
  if (!sub) return NextResponse.json({ ok: true, ignored: "unknown-subscription" });

  const remote = await getSubscription(subscriptionId);
  // Midtrans tak menjawab (jaringan/5xx): akui 200 tanpa mengubah apa pun. Sumber kebenaran
  // perpanjangan tetap notifikasi CHARGE ber-signature; retry Midtrans bisa datang lagi.
  if (!remote) return NextResponse.json({ ok: true, unverified: true });

  // Status Midtrans hanya "active"/"inactive". inactive = berhenti menagih (retry dunning habis,
  // max_interval tercapai, atau di-disable). JANGAN cabut akses yang sudah dibayar: cukup setel
  // cancelAtPeriodEnd supaya UI benar & sistem tak menanti charge yang takkan datang. Akses tetap
  // sampai currentPeriodEnd (invoice renewal yang gagal memang tak pernah "paid"). Idempoten.
  if (remote.status === "inactive" && sub.status === "active" && !sub.cancelAtPeriodEnd) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true, updatedAt: new Date() },
    });
  }
  return NextResponse.json({ ok: true, subscription: sub.id, status: remote.status });
}

// Webhook Midtrans. Satu-satunya jalur yang boleh mengaktifkan akses (ADR-002).
// Wajib: verifikasi signature + idempotent (aman diproses berkali-kali).
export async function POST(req: Request) {
  let n: Notif;
  try {
    n = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const orderId = String(n.order_id ?? "");
  const statusCode = String(n.status_code ?? "");
  const grossAmount = String(n.gross_amount ?? "");
  const signatureKey = String(n.signature_key ?? "");
  const transactionStatus = String(n.transaction_status ?? "");
  const fraudStatus = n.fraud_status ? String(n.fraud_status) : null;

  // Cabang lifecycle subscription (recurring status) — ditangani SEBELUM cek signature karena
  // payload ini sengaja tak ber-order_id/signature. Verifikasi keaslian via Get Subscription API.
  if (!orderId && n.subscription_id) {
    return handleSubscriptionNotification(String(n.subscription_id));
  }

  if (!orderId || !verifySignature({ orderId, statusCode, grossAmount, signatureKey })) {
    return NextResponse.json({ error: "signature tidak valid" }, { status: 403 });
  }

  // Defense-in-depth (rekomendasi docs Midtrans): untuk kasus rawan — fraud_status=challenge
  // atau capture — verifikasi ulang status langsung ke Get Status API, jangan hanya percaya
  // payload. Kalau server Midtrans menjawab, pakai status resmi itu; kalau tidak (mis. jaringan),
  // fallback ke payload yang sudah lolos signature. Idempoten by eventId di bawah tetap berlaku.
  let effTransactionStatus = transactionStatus;
  let effFraudStatus = fraudStatus;
  if (fraudStatus === "challenge" || transactionStatus === "capture") {
    const verified = await fetchTransactionStatus(orderId);
    if (verified) {
      effTransactionStatus = verified.transactionStatus;
      effFraudStatus = verified.fraudStatus;
    }
  }

  const status = resolveStatus(effTransactionStatus, effFraudStatus);
  // Idempotensi per-event. Sertakan fraud_status supaya notifikasi capture yang berbeda hanya
  // pada fraud_status (accept vs challenge) tak saling menimpa sebagai "event yang sama".
  const eventId = `${orderId}:${transactionStatus}:${statusCode}:${fraudStatus ?? "-"}`;

  // BIN lookup bank penerbit DI LUAR transaksi (I/O jaringan) supaya transaksi DB tetap pendek.
  // Hanya saat ada kartu tersimpan (saved_token_id) + masked_card berisi 8 digit awal.
  let savedCardBankCode: string | null = null;
  if (n.saved_token_id && n.masked_card) {
    const info = await lookupBin(n.masked_card.replace(/\D/g, "").slice(0, 8));
    savedCardBankCode = info?.bankCode ?? null;
  }

  // Holder (object property, bukan let lokal) supaya assignment di dalam closure
  // transaksi tidak dianggap "never" oleh control-flow TypeScript.
  const out: { receipt: ReceiptData | null; setPasswordEmail: string | null; failed: FailedData | null; recurring: RecurringSetup | null; cancelRecurringRef: string | null } = {
    receipt: null,
    setPasswordEmail: null,
    failed: null,
    recurring: null,
    cancelRecurringRef: null,
  };

  try {
    await prisma.$transaction(async (tx) => {
      // Guard idempotency: event yang sama tidak diproses dua kali.
      const existing = await tx.paymentEvent.findUnique({ where: { eventId } });
      if (existing?.processed) return;
      if (!existing) {
        await tx.paymentEvent.create({
          data: { eventId, orderId, status: transactionStatus, fraudStatus, payload: JSON.stringify(n) },
        });
      }

      let invoice = await tx.invoice.findUnique({ where: { orderId } });
      if (!invoice) {
        const subRef = n.subscription_id ? String(n.subscription_id) : null;
        // RECURRING (subscription Midtrans-managed): tagihan ulang otomatis datang dengan
        // subscription_id dan order_id BARU. Buat invoice renewal dari langganan lokal,
        // lalu blok "paid" di bawah memperpanjang periode + entitlement seperti biasa.
        if (subRef && status === "paid") {
          const made = await createRenewalInvoice(tx, {
            providerRef: subRef,
            orderId,
            grossAmount: Number(grossAmount) || 0,
            paymentType: n.payment_type ?? null,
            midtransTxnId: n.transaction_id ?? null,
            rawPayload: JSON.stringify(n),
          });
          if (made) invoice = await tx.invoice.findUnique({ where: { orderId } });
        }

        // GUEST CHECKOUT (ADR-002 §1/§2): order tanpa invoice = "beli langsung" yang
        // belum menulis DB. Akun + invoice HANYA dibuat kalau pembayaran SUKSES,
        // dari identitas di custom_field. Selain paid (pending/gagal/tak dikenal) ->
        // tidak membuat apa pun (tidak ada user hantu), cukup tandai selesai.
        if (!invoice) {
          const guest = status === "paid" ? parseGuestFields(n) : null;
          if (guest) {
            const res = await createGuestUserAndInvoice(tx, {
              orderId,
              fields: guest,
              paymentType: n.payment_type ?? null,
              midtransTxnId: n.transaction_id ?? null,
              // Token kartu (bila ada) -> disimpan ke subscription baru supaya blok "paid" di
              // bawah mendaftarkan recurring lewat jalur atomic-claim yang sama dgn alur login.
              savedTokenId: n.saved_token_id ?? null,
              savedTokenExpiredAt: n.saved_token_id_expired_at ?? null,
              // Nominal terbayar (terikat signature) -> divalidasi vs harga otoritatif SEBELUM
              // membuat akun/invoice (anti invoice-lunas hantu saat harga drift, audit P2).
              paidAmount: Number(grossAmount),
            });
            if (res) {
              invoice = await tx.invoice.findUnique({ where: { orderId } });
              if (res.isNewAccount) out.setPasswordEmail = res.email;
            }
          }
        }
        if (!invoice) {
          await tx.paymentEvent.update({ where: { eventId }, data: { processed: true } });
          return;
        }
      }

      // (#4) Cross-check jumlah: notifikasi gross_amount HARUS sama dengan invoice tersimpan.
      // Signature sudah mengikat gross_amount, tapi ini menangkap order salah / drift konfig.
      // Bandingkan sebagai angka (notif "29000.00" vs Decimal 29000).
      const notifAmount = Number(grossAmount);
      const invoiceAmount = Number(invoice.grossAmount);
      if (Number.isFinite(notifAmount) && Math.abs(notifAmount - invoiceAmount) > 0.01) {
        console.error(
          `[webhook] amount mismatch order=${orderId} notif=${notifAmount} invoice=${invoiceAmount} — abaikan aktivasi`,
        );
        await tx.paymentEvent.update({ where: { eventId }, data: { processed: true } });
        return;
      }

      // (#2) PAID itu STICKY-FORWARD. Midtrans TIDAK menjamin urutan notifikasi & me-retry,
      // jadi notifikasi mundur (pending/expire/cancel/deny) bisa tiba SETELAH lunas. Bila invoice
      // sudah paid, satu-satunya transisi sah adalah -> refunded; selain itu diabaikan TOTAL
      // (tanpa menulis invoice, mencabut entitlement, atau membongkar langganan). Tanpa guard
      // simetris ini, cancel/expire telat mencabut akses pelanggan yang SUDAH membayar.
      if (invoice.status === "paid" && status !== "paid" && status !== "refunded") {
        await tx.paymentEvent.update({ where: { eventId }, data: { processed: true } });
        return;
      }
      // (#2b) REFUNDED itu TERMINAL. Setelah dana dikembalikan, notifikasi lunas telat
      // (capture/settlement yang tiba setelah refund karena retry/urutan) TIDAK boleh
      // mengembalikan status ke paid & mengaktifkan lagi entitlement. Hanya event refund
      // lain yang boleh lewat (idempoten). Pembalikan sah = proses admin terpisah, bukan webhook.
      if (invoice.status === "refunded" && status !== "refunded") {
        await tx.paymentEvent.update({ where: { eventId }, data: { processed: true } });
        return;
      }
      const effStatus = status;

      await tx.invoice.update({
        where: { orderId },
        data: {
          status: effStatus,
          paymentType: n.payment_type ?? invoice.paymentType,
          midtransTxnId: n.transaction_id ?? invoice.midtransTxnId,
          paidAt: effStatus === "paid" ? invoice.paidAt ?? new Date() : invoice.paidAt,
          rawPayload: JSON.stringify(n),
          updatedAt: new Date(),
        },
      });

      if (status === "paid") {
        // Idempotensi per-INVOICE: kartu mengirim DUA notifikasi lunas (capture lalu settlement)
        // dgn eventId berbeda -> keduanya lolos idempotensi per-event. Entitlement dibuat sekali
        // per invoice, jadi keberadaannya = penanda "charge ini SUDAH dipenuhi". Dipakai agar
        // perpanjangan periode langganan TIDAK dobel (bug: bayar 1 bulan jadi 60 hari).
        const already = await tx.entitlement.findFirst({ where: { invoiceId: invoice.id } });

        // Simpan metode kartu tersimpan (bila ada saved_token_id): kartu yang dipakai + dicentang
        // "Simpan kartu" atau langganan recurring. Dedup per (userId, savedToken). Token AMAN dari
        // Midtrans, bukan nomor kartu. Dipakai halaman Metode pembayaran.
        if (n.saved_token_id && invoice.userId) {
          await upsertSavedCard(tx, invoice.userId, {
            savedToken: n.saved_token_id,
            maskedCard: n.masked_card ?? null,
            bankCode: savedCardBankCode,
            savedTokenExpiresAt: n.saved_token_id_expired_at ? new Date(n.saved_token_id_expired_at) : null,
            // Token dari transaksi 3DS LUNAS milik user -> tepercaya untuk one-click (A-1).
            verified: true,
          });
        }

        // Motion B: aktifkan/perpanjang subscription bila invoice ini terkait langganan.
        if (invoice.subscriptionId) {
          const sub = await tx.subscription.findUnique({ where: { id: invoice.subscriptionId } });
          if (sub) {
            // Perpanjang periode HANYA pada pemenuhan PERTAMA invoice ini (!already). Notifikasi
            // lunas kedua utk invoice yang SAMA (settlement setelah capture) tak menambah periode.
            // Aktivasi pertama (pending): 30 hari dari sekarang. Renewal (active): dari akhir periode.
            let nextEnd: Date;
            if (!already) {
              const wasActive = sub.status === "active";
              const base =
                wasActive && sub.currentPeriodEnd && sub.currentPeriodEnd > new Date()
                  ? sub.currentPeriodEnd
                  : new Date();
              nextEnd = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
              await tx.subscription.update({
                where: { id: sub.id },
                data: {
                  status: "active",
                  currentPeriodStart: sub.currentPeriodStart ?? new Date(),
                  currentPeriodEnd: nextEnd,
                  updatedAt: new Date(),
                },
              });
            } else {
              // Notifikasi lunas kedua utk invoice yang sama: periode sudah diperpanjang; pakai
              // nilai tersimpan untuk startTime recurring di bawah (tanpa menambah periode lagi).
              nextEnd = sub.currentPeriodEnd ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            }

            // BACK-FILL token kartu: alur GUEST hanya melihat saved_token_id lewat NOTIFIKASI
            // (bukan respons charge sinkron seperti alur login). Bila notifikasi lunas INI yang
            // membawa token sementara langganan belum menyimpannya, simpan sekarang supaya klaim
            // recurring di bawah tetap menyala — robust terhadap notifikasi mana (capture/
            // settlement) yang kebetulan membawa token.
            if (
              !sub.savedToken &&
              n.saved_token_id &&
              !sub.providerRef &&
              (n.payment_type ?? invoice.paymentType) === "credit_card"
            ) {
              await tx.subscription.update({
                where: { id: sub.id },
                data: {
                  savedToken: n.saved_token_id,
                  savedTokenExpiresAt: n.saved_token_id_expired_at
                    ? new Date(n.saved_token_id_expired_at)
                    : null,
                  updatedAt: new Date(),
                },
              });
              sub.savedToken = n.saved_token_id; // agar syarat klaim recurring di bawah terpenuhi
            }

            // RECURRING: charge PERTAMA langganan yang dibayar kartu & tokennya tersimpan,
            // tapi belum punya subscription Midtrans (providerRef null) -> jadwalkan
            // pembuatan Subscription API SETELAH commit (panggilan eksternal, jangan di
            // dalam transaksi DB). Tagihan berikutnya ditangani Midtrans mulai nextEnd.
            //
            // KLAIM ATOMIK: kartu mengirim dua notifikasi lunas (capture lalu settlement)
            // dgn eventId berbeda -> keduanya lolos idempotensi. updateMany bersyarat
            // provider_ref masih NULL memastikan hanya SATU event yang menang & memanggil
            // Subscription API (mencegah langganan/tagihan dobel). Sentinel diganti id
            // Midtrans asli setelah commit; bila gagal, dilepas kembali ke null.
            if (sub.savedToken && !sub.providerRef && (n.payment_type ?? invoice.paymentType) === "credit_card") {
              const claim = await tx.subscription.updateMany({
                where: { id: sub.id, providerRef: null },
                data: { providerRef: RECURRING_PENDING, updatedAt: new Date() },
              });
              if (claim.count === 1) {
                const buyer = await tx.user.findUnique({ where: { id: sub.userId }, select: { email: true } });
                out.recurring = {
                  subscriptionId: sub.id,
                  savedToken: sub.savedToken,
                  amount: Number(sub.amount),
                  email: buyer?.email ?? null,
                  productCode: sub.productCode,
                  startTime: nextEnd,
                };
              }
            }
          }
        }

        // Fulfillment (pembayaran.md / ADR-002): produk berlisensi (mis. lisensi ujian,
        // materi kelas) TIDAK langsung aktif — set "pending"; worker eksternal
        // (kelas_maubisa) yang mengaktifkan setelah lisensi siap. Produk lain langsung aktif.
        const product = invoice.productCode
          ? await tx.product.findUnique({ where: { code: invoice.productCode } })
          : null;
        const entStatus = product?.fulfillment === "license" ? "pending" : "active";

        // (already dihitung di atas — penanda idempotensi per-invoice, dipakai ulang di sini)
        if (!already) {
          await tx.entitlement.create({
            data: {
              userId: invoice.userId,
              productCode: invoice.productCode,
              itemType: invoice.itemType,
              itemRef: invoice.itemRef,
              scope: invoice.scope,
              status: entStatus,
              source: "checkout",
              invoiceId: invoice.id,
              subscriptionId: invoice.subscriptionId,
              startsAt: new Date(),
              expiresAt: invoice.periodEnd ?? null,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        } else if (already.status !== "active" && entStatus === "active") {
          await tx.entitlement.update({
            where: { id: already.id },
            data: { status: "active", updatedAt: new Date() },
          });
        }

        // Siapkan data struk (email transaksional) — dikirim setelah transaksi commit.
        const buyer = await tx.user.findUnique({ where: { id: invoice.userId } });
        if (buyer?.email) {
          out.receipt = {
            to: buyer.email,
            orderId: invoice.orderId,
            itemName: invoice.itemName ?? namaProduk(invoice.productCode),
            amount: idr(invoice.grossAmount),
            method: metodeBayar(n.payment_type ?? invoice.paymentType),
            date: tanggal(new Date()),
            invoiceUrl: `${process.env.BETTER_AUTH_URL ?? ""}/invoice/${invoice.orderId}`,
          };
          // PAYMENT LINK (Motion C, konsultasi): core user dibuat admin saat
          // generate link, TAPI akun Better Auth belum ada. Kalau memang belum ada,
          // kirim tautan atur kata sandi (sekali pakai) setelah lunas — sama seperti guest.
          if (invoice.motion === "payment_link" && !out.setPasswordEmail) {
            const authAcc = await tx.authUser.findUnique({ where: { email: buyer.email }, select: { id: true } });
            if (!authAcc) out.setPasswordEmail = buyer.email;
          }
        }
      } else if (
        status === "refunded" ||
        status === "cancelled" ||
        status === "expired" ||
        status === "failed"
      ) {
        // Uang/akses dicabut/gagal: entitlement terkait invoice ini di-expired-kan (pembayaran.md
        // "Refund dan pembatalan"). Aman idempotent: update ke expired berkali-kali no-op.
        await tx.entitlement.updateMany({
          where: { invoiceId: invoice.id, status: { not: "expired" } },
          data: { status: "expired", updatedAt: new Date() },
        });
        // Langganan terkait: batalkan HANYA bila (a) ini REFUND atas invoice yang sudah paid
        // (dana dikembalikan -> langganan berhenti), ATAU (b) langganan masih 'pending' (invoice
        // gagal ini adalah activator-nya). JANGAN matikan langganan AKTIF hanya karena checkout
        // KEDUA yang gagal/kedaluwarsa (bug P1-1: pelanggan yang masih ditagih jadi berhenti).
        if (invoice.subscriptionId) {
          const sub = await tx.subscription.findUnique({
            where: { id: invoice.subscriptionId },
            select: { providerRef: true, status: true },
          });
          const shouldCancel = status === "refunded" || sub?.status === "pending";
          if (shouldCancel && sub) {
            await tx.subscription.updateMany({
              where: { id: invoice.subscriptionId, status: { not: "cancelled" } },
              data: { status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() },
            });
            // Batalkan di Midtrans (Midtrans-managed) SETELAH commit. Abaikan sentinel.
            if (sub.providerRef && sub.providerRef !== RECURRING_PENDING) {
              out.cancelRecurringRef = sub.providerRef;
            }
          }
        }
        // Email "pembayaran belum berhasil" (retry) untuk gagal/expire/cancel — BUKAN refund
        // (refund = uang kembali, alur terpisah). Disiapkan; dikirim setelah commit.
        if (status !== "refunded") {
          const buyer = await tx.user.findUnique({
            where: { id: invoice.userId },
            select: { email: true, name: true },
          });
          if (buyer?.email) {
            out.failed = {
              to: buyer.email,
              name: buyer.name,
              orderId: invoice.orderId,
              itemName: invoice.itemName ?? namaProduk(invoice.productCode),
              retryUrl: `${process.env.BETTER_AUTH_URL ?? ""}/langganan/ubah`,
              reason:
                status === "expired"
                  ? "Batas waktu pembayaran terlewati"
                  : status === "cancelled"
                    ? "Transaksi dibatalkan"
                    : undefined,
            };
          }
        }
      }

      await tx.paymentEvent.update({ where: { eventId }, data: { processed: true } });
    });
  } catch (e) {
    // 500 supaya Midtrans mengirim ulang (webhook harus tahan retry). Detail di-log server-side
    // saja; JANGAN echo ke response (redaksi, skill runtime-patterns "Security And Data Handling").
    console.error("[webhook] gagal proses order=%s:", orderId, e instanceof Error ? e.message : "unknown");
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  // Struk pembayaran dikirim di luar transaksi (email lambat, jangan tahan DB lock).
  // Idempotent: blok paid hanya jalan sekali per event (dijaga paymentEvent).
  // BEST-EFFORT: kegagalan kirim email TIDAK boleh menggagalkan webhook. Kalau dibiarkan
  // melempar, Midtrans retry -> pada retry `processed` sudah true -> blok paid dilewati ->
  // out.receipt null -> struk TAK PERNAH terkirim. Jadi telan errornya (akses sudah aktif).
  if (out.receipt) {
    try {
      const { subject, html, from, replyTo } = receiptEmail(out.receipt);
      await sendEmail({ to: out.receipt.to, subject, html, from, replyTo });
    } catch (e) {
      console.error(
        "[webhook] gagal kirim struk order=%s:",
        orderId,
        e instanceof Error ? e.message : "unknown",
      );
    }
  }

  // Email "pembayaran belum berhasil" (gagal/expire/cancel). Best-effort.
  if (out.failed) {
    try {
      const { subject, html, from, replyTo } = paymentFailedEmail({
        name: out.failed.name ?? undefined,
        orderId: out.failed.orderId,
        itemName: out.failed.itemName,
        retryUrl: out.failed.retryUrl,
        reason: out.failed.reason,
      });
      await sendEmail({ to: out.failed.to, subject, html, from, replyTo });
    } catch {
      /* email opsional; Midtrans tidak perlu retry untuk ini */
    }
  }

  // GUEST baru (ADR-002 §1/§6): akun dibuat otomatis, TANPA password acak. Buat akun
  // Better Auth (password buang, tidak disimpan/dikirim), lalu kirim tautan sekali
  // pakai untuk atur kata sandi sendiri. Pola sama dengan /api/provision.
  if (out.setPasswordEmail) {
    const email = out.setPasswordEmail;
    try {
      const u = await prisma.user.findFirst({ where: { email }, select: { name: true } });
      // Pembeli -> jangan kirim welcomeEmail biasa (mereka dapat struk + set-password).
      suppressWelcomeOnce(email);
      const throwaway = randomBytes(24).toString("base64url");
      await auth.api.signUpEmail({
        body: { email, name: u?.name ?? email.split("@")[0], password: throwaway },
      });
    } catch {
      // Akun auth mungkin sudah ada (pembeli lama). Lanjut kirim tautan reset saja.
    }
    try {
      await auth.api.requestPasswordReset({
        body: { email, redirectTo: `${process.env.BETTER_AUTH_URL ?? ""}/reset-password` },
      });
    } catch {
      // Jangan gagalkan webhook hanya karena email; Midtrans tidak perlu retry untuk ini.
    }
  }

  // RECURRING (subscription): setelah charge pertama kartu LUNAS, daftarkan langganan ke
  // Subscription API Midtrans supaya tagihan berikutnya otomatis (Midtrans-managed).
  // Dilakukan di luar transaksi (panggilan API eksternal). Klaim atomik di atas
  // (provider_ref = sentinel) memastikan ini hanya jalan sekali per langganan.
  if (out.recurring) {
    const r = out.recurring;
    try {
      const wib = (d: Date) =>
        d.toLocaleString("sv-SE", { timeZone: "Asia/Jakarta" }).replace(",", "") + " +0700";
      const sub = await createSubscription({
        // Nama WAJIB unik dalam akun merchant. DETERMINISTIK dari subscriptionId (PK lokal
        // unik) supaya idempotent: kalau charge kartu mengirim capture+settlement dan sentinel
        // sempat dilepas (mis. respons hilang padahal Midtrans sudah membuat), percobaan kedua
        // memakai nama SAMA -> Midtrans menolak duplikat, jadi TIDAK ada langganan/tagihan dobel.
        name: `${r.productCode}-${r.subscriptionId}`.toUpperCase(),
        amount: r.amount,
        paymentType: "credit_card",
        token: r.savedToken,
        schedule: { intervalUnit: "month", interval: 1, startTime: wib(r.startTime) },
        customerEmail: r.email,
        metadata: { merchant_subscription_id: String(r.subscriptionId) },
        retry: { intervalUnit: "day", interval: 1, maxInterval: 3 },
      });
      if (sub.id) {
        // Ganti sentinel dgn id Subscription API asli (dipakai mencocokkan renewal).
        await prisma.subscription.update({
          where: { id: r.subscriptionId },
          data: { providerRef: sub.id, updatedAt: new Date() },
        });
      } else {
        // Tak dapat id -> lepas klaim supaya bisa dicoba lagi (notif settlement / manual).
        await prisma.subscription.updateMany({
          where: { id: r.subscriptionId, providerRef: RECURRING_PENDING },
          data: { providerRef: null },
        });
      }
    } catch (e) {
      // Lepas klaim sentinel supaya notifikasi berikutnya (settlement) bisa mencoba lagi.
      // Jangan gagalkan webhook: akses bulan pertama sudah aktif.
      await prisma.subscription
        .updateMany({ where: { id: r.subscriptionId, providerRef: RECURRING_PENDING }, data: { providerRef: null } })
        .catch(() => {});
      console.error(
        `[webhook] gagal daftar recurring sub=${r.subscriptionId}:`,
        e instanceof Error ? e.message : "unknown",
      );
    }
  }

  // Batalkan langganan di sisi Midtrans (untuk gagal/expire/cancel invoice langganan).
  // Best-effort; mencegah tagihan berikutnya menghidupkan langganan yang sudah dibatalkan.
  if (out.cancelRecurringRef) {
    try {
      await cancelSubscription(out.cancelRecurringRef);
    } catch (e) {
      console.error(
        `[webhook] gagal batalkan recurring di Midtrans ref=${out.cancelRecurringRef}:`,
        e instanceof Error ? e.message : "unknown",
      );
    }
  }

  return NextResponse.json({ ok: true });
}
