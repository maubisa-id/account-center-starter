// Admin = allowlist email lewat env ADMIN_EMAILS (koma-pisah). TIDAK ada self-signup admin
// dan TIDAK ada kolom role di DB — admin cuma user biasa yang emailnya kamu (owner) daftarkan.
// Menambah/menghapus admin = ubah env, bukan migrasi. Cukup untuk 1-2 operator.
// ponytail: allowlist env, ganti ke tabel roles kalau admin sudah banyak & butuh kelola sendiri.
const ADMINS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMINS.includes(email.toLowerCase());
}
