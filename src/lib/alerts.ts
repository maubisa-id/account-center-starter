import type { AccountUser } from "@/lib/account";
import { namaProduk } from "@/lib/format";
import { isEntitlementActive } from "@/lib/entitlement";

export type Alert = {
  id: string;
  tone: "warning" | "info" | "danger";
  title: string;
  desc: string;
  href: string;
  cta: string;
};

// Notifikasi/peringatan NYATA diturunkan dari data akun (bukan angka palsu).
// Dipakai untuk titik lonceng + daftar "Perlu perhatian" di /notifikasi.
export function getAlerts(user: AccountUser, emailVerified: boolean, twoFactorEnabled: boolean): Alert[] {
  const alerts: Alert[] = [];
  const now = Date.now();

  // 1) Tagihan tertunda / gagal.
  const pending = user.invoices.find((i) => i.status === "pending");
  if (pending) {
    alerts.push({
      id: `invoice-${pending.id}`,
      tone: "warning",
      title: "Pembayaran menunggu",
      desc: `Tagihan ${pending.itemName ?? namaProduk(pending.productCode)} belum lunas.`,
      href: "/pembayaran",
      cta: "Selesaikan",
    });
  }

  // 2) Langganan akan berakhir < 7 hari atau dijadwalkan berhenti.
  const sub = user.subscriptions.find((s) => s.status === "active");
  if (sub?.currentPeriodEnd) {
    const days = Math.ceil((new Date(sub.currentPeriodEnd).getTime() - now) / (24 * 60 * 60 * 1000));
    if (sub.cancelAtPeriodEnd) {
      alerts.push({
        id: `sub-cancel-${sub.id}`,
        tone: "warning",
        title: "Langganan dijadwalkan berhenti",
        desc: `Pro akan nonaktif pada akhir periode (${days} hari lagi).`,
        href: "/langganan",
        cta: "Lanjutkan",
      });
    } else if (days <= 7) {
      alerts.push({
        id: `sub-exp-${sub.id}`,
        tone: "warning",
        title: "Perpanjangan sebentar lagi",
        desc: `Langganan Pro diperpanjang dalam ${Math.max(days, 0)} hari.`,
        href: "/langganan",
        cta: "Kelola",
      });
    }
  }

  // 3) Entitlement menunggu fulfillment (mis. lisensi kelas).
  const pendingEnt = user.entitlements.find((e) => e.status === "pending");
  if (pendingEnt) {
    alerts.push({
      id: `ent-${pendingEnt.id}`,
      tone: "info",
      title: "Akses sedang disiapkan",
      desc: "Pesananmu sudah dibayar; akses aktif setelah lisensi siap.",
      href: "/akses",
      cta: "Lihat",
    });
  }

  // 3b) Entitlement baru saja kedaluwarsa (lewat expires_at) — saran perpanjang.
  const justExpired = user.entitlements.find(
    (e) => e.status === "active" && !isEntitlementActive(e, new Date(now)),
  );
  if (justExpired) {
    alerts.push({
      id: `ent-exp-${justExpired.id}`,
      tone: "warning",
      title: "Akses kedaluwarsa",
      desc: "Masa berlaku salah satu aksesmu sudah lewat. Perpanjang untuk membukanya lagi.",
      href: "/langganan/ubah",
      cta: "Perpanjang",
    });
  }

  // 4) Email belum terverifikasi.
  if (!emailVerified) {
    alerts.push({
      id: "email-unverified",
      tone: "warning",
      title: "Verifikasi email kamu",
      desc: "Amankan akun & pemulihan kata sandi dengan memverifikasi email.",
      href: "/profil",
      cta: "Verifikasi",
    });
  }

  // 5) 2FA belum aktif (saran keamanan).
  if (!twoFactorEnabled) {
    alerts.push({
      id: "2fa-off",
      tone: "info",
      title: "Aktifkan verifikasi 2 langkah",
      desc: "Tambah lapisan keamanan ekstra untuk akunmu.",
      href: "/keamanan",
      cta: "Aktifkan",
    });
  }

  return alerts;
}
