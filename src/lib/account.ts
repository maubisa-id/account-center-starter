import { cache } from "react";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Dipakai seed & fallback. Bukan lagi sumber utama identitas (sekarang dari sesi).
export const DEMO_EMAIL = "budi@example.com";

// Default workspace starter (belum jadi kolom DB) — ditampilkan di profil.
export const WORKSPACE_DEFAULTS = {
  negara: "Indonesia",
  bahasa: "Bahasa Indonesia",
  zonaWaktu: "(GMT+07:00) Waktu Indonesia Barat · Asia/Jakarta",
} as const;

// Email pengguna dari sesi Better Auth (null jika belum login). Di-cache per request.
export const getSessionEmail = cache(async (): Promise<string | null> => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    return session?.user?.email ?? null;
  } catch {
    return null;
  }
});

const fetchAccountByEmail = cache(async (email: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        // Batas aman (generous) supaya baca-akun ini tak pernah unbounded, tanpa memotong
        // riwayat pengguna nyata (halaman Pembayaran menampilkan seluruh daftar). Pengguna
        // dengan >200 invoice sangat langka & butuh paginasi tersendiri bila kelak muncul.
        subscriptions: { orderBy: { id: "desc" }, take: 100 },
        entitlements: { orderBy: { id: "desc" }, take: 200 },
        invoices: { orderBy: { id: "desc" }, take: 200 },
      },
    });
    return { user, error: null as string | null };
  } catch (e) {
    return { user: null, error: String(e) };
  }
});

// Akun untuk user yang sedang login. Halaman memanggil ini tanpa argumen; identitas
// diambil dari sesi. Rute (app) sudah digerbang, jadi email semestinya ada.
export const getAccount = cache(async () => {
  const email = await getSessionEmail();
  if (!email) return { user: null, error: null as string | null };
  return fetchAccountByEmail(email);
});

export type Account = Awaited<ReturnType<typeof fetchAccountByEmail>>;
export type AccountUser = NonNullable<Account["user"]>;
export type Subscription = AccountUser["subscriptions"][number];
export type Invoice = AccountUser["invoices"][number];
export type Entitlement = AccountUser["entitlements"][number];
