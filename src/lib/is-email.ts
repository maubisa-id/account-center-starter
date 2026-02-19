// Validasi email LINEAR & aman-ReDoS. Menggantikan regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`
// yang memakai beberapa kuantifier `+` bersebelahan (backtracking polinomial pada input
// tak terkontrol — CodeQL js/polynomial-redos). Versi ini satu kali lewat, tanpa regex,
// jadi biayanya selalu O(n). Cukup untuk menggerbang checkout/link: memastikan bentuk
// "local@domain.tld" yang wajar (bukan validasi RFC 5322 penuh — verifikasi sebenarnya
// tetap lewat email OTP).
export function isValidEmail(input: string): boolean {
  const email = input.trim();
  if (email.length === 0 || email.length > 254) return false;

  // Tolak spasi & karakter kontrol (setara `[^\s...]` pada regex lama).
  for (let i = 0; i < email.length; i++) {
    if (email.charCodeAt(i) <= 32) return false;
  }

  const at = email.indexOf("@");
  if (at <= 0) return false; // wajib ada bagian lokal sebelum '@'
  if (at !== email.lastIndexOf("@")) return false; // tepat satu '@'

  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  // wajib ada titik di domain, dengan minimal 1 karakter sebelum & sesudahnya (TLD).
  if (dot <= 0 || dot === domain.length - 1) return false;

  return true;
}
