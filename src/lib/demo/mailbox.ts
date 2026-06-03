import { randomUUID } from "crypto";

// Kotak masuk email untuk MODE DEMO (in-memory, ephemeral). Saat SMTP tidak dikonfigurasi
// (dev/demo), email yang "terkirim" ditangkap ke sini supaya pengunjung bisa MELIHAT template
// & alur nyata (OTP daftar, selamat datang, tagihan) langsung di browser — tanpa email betulan.
//
// KENAPA in-memory: demo satu-instance (ADR-008: Redis belum perlu). Hilang saat restart = wajar
// untuk demo. Di PRODUKSI kotak ini tidak pernah aktif: SMTP nyata terpasang, jadi capture di-skip
// dan tidak ada email pengguna yang mengendap di memori (privasi).

export type DemoEmail = {
  id: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  at: number; // epoch ms
};

// Batas ring-buffer: cukup untuk sesi coba-coba, tidak bikin memori membengkak.
const CAPACITY = 50;
const store: DemoEmail[] = [];

// Aktif hanya di build demo (NEXT_PUBLIC_DEMO_MODE=1, di-inline saat build). Di produksi
// nilainya undefined -> kotak, halaman, dan endpoint demo semuanya nonaktif (404).
export function demoMailboxEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "1";
}

export function captureDemoEmail(e: { to: string; subject: string; html: string; text?: string }): DemoEmail {
  const item: DemoEmail = { id: randomUUID(), at: Date.now(), ...e };
  store.unshift(item); // terbaru di atas
  if (store.length > CAPACITY) store.length = CAPACITY;
  return item;
}

export function listDemoEmails(): DemoEmail[] {
  return store.slice();
}

export function getDemoEmail(id: string): DemoEmail | undefined {
  return store.find((e) => e.id === id);
}

export function clearDemoEmails(): void {
  store.length = 0;
}

// Samarkan sebagian alamat penerima. Kotak demo bersifat BERSAMA (semua pengunjung melihat
// isi yang sama), jadi tampilkan huruf pertama saja + domain: "b***@contoh.id".
export function maskEmail(addr: string): string {
  const at = addr.indexOf("@");
  if (at <= 0) return addr;
  const local = addr.slice(0, at);
  const domain = addr.slice(at);
  return `${local.slice(0, 1)}${"*".repeat(Math.max(1, local.length - 1))}${domain}`;
}
