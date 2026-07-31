// Cegah email "selamat datang" ganda. Akun bisa lahir dari beberapa jalur (self sign-up,
// provision beli-langsung, webhook guest). Untuk pembeli, kita kirim welcomeAccessEmail (berisi
// info akses) — BUKAN welcomeEmail biasa. Jalur pembelian memanggil suppressWelcomeOnce(email)
// SEBELUM membuat akun; databaseHook memeriksa shouldSendWelcome() dan melewati welcomeEmail.
// Single-process (server Next.js), cukup untuk maksud ini.
const suppressed = new Set<string>();

export function suppressWelcomeOnce(email: string): void {
  suppressed.add(email.trim().toLowerCase());
}

// Konsumsi tanda: true bila welcomeEmail boleh dikirim (bukan jalur pembelian).
export function shouldSendWelcome(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (suppressed.has(e)) {
    suppressed.delete(e);
    return false;
  }
  return true;
}
