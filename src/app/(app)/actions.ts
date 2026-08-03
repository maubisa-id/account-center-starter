"use server";

import { createHash, randomInt, randomUUID } from "crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getSessionEmail } from "@/lib/account";
import { logAudit } from "@/lib/audit";
import { isValidEmail } from "@/lib/is-email";
import { secureEqual } from "@/lib/secure-compare";
import { sendEmail } from "@/lib/email";
import { otpEmail } from "@/lib/email-templates";
import { createDirectusRegistration } from "@/lib/events";
import { disableSubscription, enableSubscription } from "@/lib/midtrans";

export async function updateProfile(formData: FormData): Promise<{ ok?: boolean; error?: string }> {
  const email = await getSessionEmail();
  if (!email) return { error: "Kamu belum masuk." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Nama tidak boleh kosong." };

  const str = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v || null;
  };
  const displayName = str("displayName");
  const phone = str("phone");
  const headline = str("headline");
  const avatarUrl = str("avatarUrl");
  const gender = str("gender");
  const city = str("city");
  const country = str("country") ?? "Indonesia";
  const language = str("language") ?? "id";
  const timezone = str("timezone") ?? "Asia/Jakarta";
  const birthRaw = str("birthDate");
  let birthDate: Date | null = null;
  if (birthRaw) {
    const d = new Date(birthRaw);
    if (Number.isNaN(d.getTime())) return { error: "Tanggal lahir tidak valid." };
    if (d.getTime() > Date.now()) return { error: "Tanggal lahir tidak boleh di masa depan." };
    birthDate = d;
  }
  // Terima URL http(s) ATAU path relatif hasil unggah (mis. /uploads/avatars/..).
  // Cegah skema berbahaya (javascript:/data:).
  if (avatarUrl && !/^https?:\/\//i.test(avatarUrl) && !avatarUrl.startsWith("/")) {
    return { error: "URL foto tidak valid." };
  }

  try {
    await prisma.user.update({
      where: { email },
      data: {
        name,
        displayName,
        avatarUrl,
        phone,
        headline,
        gender,
        city,
        country,
        language,
        timezone,
        birthDate,
        updatedAt: new Date(),
      },
    });
    try {
      await auth.api.updateUser({ headers: await headers(), body: { name } });
    } catch {
      /* sinkronisasi nama Better Auth opsional */
    }
    revalidatePath("/profil");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function cancelSubscription(): Promise<{ ok?: boolean; error?: string }> {
  const email = await getSessionEmail();
  if (!email) return { error: "Kamu belum masuk." };
  try {
    const user = await prisma.user.findFirst({
      where: { email },
      include: { subscriptions: { where: { status: "active" }, orderBy: { id: "desc" }, take: 1 } },
    });
    const sub = user?.subscriptions[0];
    if (!sub) return { error: "Tidak ada langganan aktif." };
    // Langganan Midtrans-managed: hentikan tagihan berikutnya (disable = bisa di-resume).
    // Akses tetap sampai currentPeriodEnd; webhook tak akan memperpanjang lagi.
    if (sub.providerRef) await disableSubscription(sub.providerRef);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true, updatedAt: new Date() },
    });
    revalidatePath("/langganan");
    return { ok: true };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function resumeSubscription(): Promise<{ ok?: boolean; error?: string }> {
  const email = await getSessionEmail();
  if (!email) return { error: "Kamu belum masuk." };
  try {
    const user = await prisma.user.findFirst({
      where: { email },
      include: { subscriptions: { where: { status: "active" }, orderBy: { id: "desc" }, take: 1 } },
    });
    const sub = user?.subscriptions[0];
    if (!sub) return { error: "Tidak ada langganan aktif." };
    // Aktifkan lagi tagihan otomatis (enable = kebalikan disable).
    if (sub.providerRef) await enableSubscription(sub.providerRef);
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: false, updatedAt: new Date() },
    });
    revalidatePath("/langganan");
    return { ok: true };
  } catch (e) {
    return { error: String(e) };
  }
}

// Simpan preferensi notifikasi (UU PDP: kontrol pengguna atas email non-esensial).
export async function saveNotifPref(key: string, value: boolean): Promise<{ ok?: boolean; error?: string }> {
  const email = await getSessionEmail();
  if (!email) return { error: "Kamu belum masuk." };
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return { error: "Akun tidak ditemukan." };
    await prisma.userPreference.upsert({
      where: { userId_key: { userId: user.id, key } },
      update: { value },
      create: { userId: user.id, key, value },
    });
    return { ok: true };
  } catch (e) {
    return { error: String(e) };
  }
}

// Simpan PREFERENSI MINAT (personalisasi lintas-produk). Disimpan di level USER (core),
// bukan di satu pendaftaran acara, supaya app.maubisa.id & kelas.maubisa.id bisa membacanya
// lewat core_user_id untuk menyesuaikan konten. Key contoh: "interest:ai", "goal:karir".
// prefs = peta { key: boolean }. Hanya key yang dikirim yang di-set (tak menghapus lain).
export async function savePreferences(prefs: Record<string, boolean>): Promise<{ ok?: boolean; error?: string }> {
  const email = await getSessionEmail();
  if (!email) return { error: "Kamu belum masuk." };
  const entries = Object.entries(prefs).filter(([k]) => k.trim());
  if (entries.length === 0) return { ok: true };
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return { error: "Akun tidak ditemukan." };
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.userPreference.upsert({
          where: { userId_key: { userId: user.id, key } },
          update: { value },
          create: { userId: user.id, key, value },
        }),
      ),
    );
    return { ok: true };
  } catch (e) {
    return { error: String(e) };
  }
}

// Hapus akun (hak UU PDP): cabut akses, batalkan langganan, soft-delete core user,
// dan hapus kredensial Better Auth supaya tidak bisa login lagi.
export async function deleteAccount(): Promise<{ ok?: boolean; error?: string }> {
  const email = await getSessionEmail();
  if (!email) return { error: "Kamu belum masuk." };
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return { error: "Akun tidak ditemukan." };
    // Hentikan tagihan recurring di Midtrans SEBELUM menutup akun. Tanpa ini, langganan
    // Midtrans-managed tetap menagih kartu meski akun sudah dihapus (best-effort: kegagalan
    // jaringan tak boleh memblokir hak hapus akun UU PDP; "pending-setup" = sentinel, dilewati).
    const activeSubs = await prisma.subscription.findMany({
      where: { userId: user.id, providerRef: { not: null } },
      select: { providerRef: true },
    });
    for (const s of activeSubs) {
      if (s.providerRef && s.providerRef !== "pending-setup") {
        try {
          await disableSubscription(s.providerRef);
        } catch {
          /* best-effort — jangan gagalkan penghapusan akun */
        }
      }
    }
    await prisma.$transaction([
      prisma.entitlement.updateMany({
        where: { userId: user.id, status: { not: "expired" } },
        data: { status: "expired", updatedAt: new Date() },
      }),
      prisma.subscription.updateMany({
        where: { userId: user.id, status: { not: "cancelled" } },
        data: { status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { status: "deleted", deletedAt: new Date(), updatedAt: new Date() },
      }),
    ]);
    if (user.authUserId) {
      await prisma.authSession.deleteMany({ where: { userId: user.authUserId } });
      await prisma.authAccount.deleteMany({ where: { userId: user.authUserId } });
      await prisma.authTwoFactor.deleteMany({ where: { userId: user.authUserId } });
      await prisma.authUser.delete({ where: { id: user.authUserId } }).catch(() => {});
    }
    // Audit (UU PDP Pasal 20): catat penghapusan akun. actorEmail eksplisit karena sesi
    // sudah dihapus di atas; baris users masih ada (soft-delete) sehingga actor teresolusi.
    await logAudit({
      action: "account_deletion",
      target: `user:${user.uuid}`,
      metadata: { email: user.email, mode: "self-service", soft: true },
      actorEmail: user.email,
    });
    return { ok: true };
  } catch (e) {
    return { error: String(e) };
  }
}

// Motion D: daftar event GRATIS (MBG Space). Tanpa Midtrans/invoice.
// SUMBER PENDAFTARAN = collection Directus (sama dgn form website anonim) supaya satu
// tempat. Account Center menambah core_user_id + identitas (dari core, tak diisi ulang).
// HAK AKSES (entitlement) tetap di core supaya muncul di /akses. Kalau Directus belum
// dikonfigurasi (dev), pendaftaran disimpan ke tabel core event_registrations (fallback).
export async function registerFreeEvent(
  eventId: string,
  form?: { institution?: string; note?: string; eventTitle?: string },
  scope = "app",
): Promise<{ ok?: boolean; already?: boolean; error?: string }> {
  const email = await getSessionEmail();
  if (!email) return { error: "Kamu belum masuk." };
  if (!eventId) return { error: "Event tidak valid." };
  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return { error: "Akun tidak ditemukan." };

    const institution = form?.institution?.trim() || null;
    const note = form?.note?.trim() || null;
    const eventTitle = form?.eventTitle?.trim() || null;

    // 1) Catat pendaftaran ke Directus (sumber tunggal). core_user_id menautkan ke identitas.
    const toCms = await createDirectusRegistration({
      eventRef: eventId,
      eventTitle,
      name: user.name,
      email: user.email,
      phone: user.phone,
      institution,
      note,
      coreUserId: user.uuid,
      source: "account",
    });

    // 1b) Fallback (Directus belum diset): simpan ke tabel core supaya dev tetap jalan.
    if (!toCms) {
      await prisma.eventRegistration.upsert({
        where: { userId_eventRef: { userId: user.id, eventRef: eventId } },
        update: { institution, note, ...(eventTitle ? { eventTitle } : {}), updatedAt: new Date() },
        create: { userId: user.id, eventRef: eventId, eventTitle, institution, note, paid: false },
      });
    }

    // 2) Hak akses (entitlement) tetap di core (billing/access spine). Idempotent.
    const existing = await prisma.entitlement.findFirst({
      where: { userId: user.id, itemType: "event", itemRef: eventId },
    });
    if (existing) {
      if (existing.status !== "active") {
        await prisma.entitlement.update({
          where: { id: existing.id },
          data: { status: "active", updatedAt: new Date() },
        });
      }
      revalidatePath("/acara");
      revalidatePath("/akses");
      return { ok: true, already: true };
    }

    await prisma.entitlement.create({
      data: {
        userId: user.id,
        itemType: "event",
        itemRef: eventId,
        scope,
        status: "active",
        source: "free",
        startsAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    revalidatePath("/acara");
    revalidatePath("/akses");
    return { ok: true };
  } catch (e) {
    return { error: String(e) };
  }
}

// ── Ganti alamat email (dengan verifikasi OTP ke email BARU) ──────────────────
// Email = tulang punggung identitas (users.email UNIQUE + auth_users.email UNIQUE, ditautkan).
// Alur: minta OTP ke email baru -> verifikasi -> tukar email di KEDUA tabel + tandai verified.
// Pending disimpan di auth_verifications (generic key-value) supaya TANPA migrasi skema.
const EMAIL_CHANGE_TTL_MS = 10 * 60_000;
const emailChangeKey = (currentEmail: string) => `email-change:${currentEmail.toLowerCase()}`;
const hashOtp = (otp: string) => createHash("sha256").update(otp).digest("hex");

async function emailTaken(email: string): Promise<boolean> {
  const [core, authU] = await Promise.all([
    prisma.user.findFirst({ where: { email }, select: { id: true } }),
    prisma.authUser.findFirst({ where: { email }, select: { id: true } }),
  ]);
  return Boolean(core || authU);
}

// Langkah 1: kirim kode 6 digit ke email BARU (memakai template otpEmail 'change-email').
export async function requestEmailChange(newEmailRaw: string): Promise<{ ok?: boolean; error?: string }> {
  const currentEmail = await getSessionEmail();
  if (!currentEmail) return { error: "Kamu belum masuk." };

  const newEmail = newEmailRaw.trim().toLowerCase();
  if (!isValidEmail(newEmail)) return { error: "Format email tidak valid." };
  if (newEmail === currentEmail.toLowerCase()) return { error: "Email baru sama dengan email sekarang." };
  if (await emailTaken(newEmail)) return { error: "Email ini sudah dipakai akun lain." };

  const otp = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const value = `${newEmail}|${hashOtp(otp)}`;
  const key = emailChangeKey(currentEmail);
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_TTL_MS);

  try {
    // Ganti pending sebelumnya (bila ada) supaya hanya satu permintaan aktif.
    await prisma.authVerification.deleteMany({ where: { identifier: key } });
    await prisma.authVerification.create({ data: { id: randomUUID(), identifier: key, value, expiresAt } });

    const { subject, html, from, replyTo } = otpEmail(otp, "change-email");
    const res = await sendEmail({ to: newEmail, subject, html, from, replyTo });
    // Non-produksi tanpa SMTP: cetak kode supaya alur dev/demo tetap jalan (M-8: hanya non-prod).
    if (res.dev && process.env.NODE_ENV !== "production") {
      console.log(`\n[GANTI EMAIL] ${newEmail}\n  Kode: ${otp}  (berlaku 10 menit)\n`);
    }
    return { ok: true };
  } catch (e) {
    return { error: String(e) };
  }
}

// Langkah 2: verifikasi kode -> tukar email di users + auth_users (transaksi) + tandai verified.
export async function confirmEmailChange(otp: string): Promise<{ ok?: boolean; error?: string }> {
  const currentEmail = await getSessionEmail();
  if (!currentEmail) return { error: "Kamu belum masuk." };
  const code = otp.trim();
  if (!/^\d{6}$/.test(code)) return { error: "Masukkan 6 digit kode." };

  const key = emailChangeKey(currentEmail);
  try {
    const pending = await prisma.authVerification.findFirst({
      where: { identifier: key },
      orderBy: { id: "desc" },
    });
    if (!pending) return { error: "Tidak ada permintaan ganti email. Mulai lagi ya." };
    if (pending.expiresAt.getTime() < Date.now()) {
      await prisma.authVerification.deleteMany({ where: { identifier: key } });
      return { error: "Kode kedaluwarsa. Minta kode baru." };
    }
    const [newEmail, otpHash] = pending.value.split("|");
    if (!newEmail || !otpHash || !secureEqual(hashOtp(code), otpHash)) {
      return { error: "Kode salah atau kedaluwarsa." };
    }
    // Cek ulang ketersediaan (bisa saja keburu dipakai sejak langkah 1).
    if (await emailTaken(newEmail)) {
      await prisma.authVerification.deleteMany({ where: { identifier: key } });
      return { error: "Email ini sudah dipakai akun lain." };
    }

    const now = new Date();
    const user = await prisma.user.findFirst({ where: { email: currentEmail } });
    if (!user) return { error: "Akun tidak ditemukan." };

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { email: newEmail, emailVerifiedAt: now, updatedAt: now },
      }),
      ...(user.authUserId
        ? [prisma.authUser.update({ where: { id: user.authUserId }, data: { email: newEmail, emailVerified: true } })]
        : []),
      prisma.authVerification.deleteMany({ where: { identifier: key } }),
    ]);

    revalidatePath("/profil");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { error: String(e) };
  }
}
