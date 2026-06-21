// Saran koreksi typo domain email (murni, tanpa dependensi). Dipakai di form daftar
// supaya pengguna tak salah ketik domain lalu tak pernah menerima OTP verifikasi.
// Reusable di web utama / app / kelas.

const POPULAR = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.id",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "outlook.co.id",
  "live.com",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
];

// Typo yang sangat sering muncul (jarak > 1 huruf) yang tak tertangkap cek jarak-1.
const KNOWN: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmail.co": "gmail.com",
  "gmail.con": "gmail.com",
  "gmail.cm": "gmail.com",
  "gmail.om": "gmail.com",
  "gmaill.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yahoo.con": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "hormail.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outook.com": "outlook.com",
  "outlook.con": "outlook.com",
  "iclould.com": "icloud.com",
  "iclod.com": "icloud.com",
  "icloud.con": "icloud.com",
};

// Beda satu operasi edit (sisip/hapus/ganti satu huruf). Cukup untuk typo domain.
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return false;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (la > lb) i++;
    else if (lb > la) j++;
    else {
      i++;
      j++;
    }
  }
  if (i < la || j < lb) edits++;
  return edits <= 1;
}

/**
 * Kembalikan email yang MUNGKIN dimaksud bila domainnya typo, atau null bila
 * sudah wajar / bukan domain populer.
 */
export function suggestEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 1 || at === email.length - 1) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain.includes(".")) return null;
  if (POPULAR.includes(domain)) return null;
  if (KNOWN[domain]) return `${local}@${KNOWN[domain]}`;
  for (const good of POPULAR) {
    if (withinOneEdit(domain, good)) return `${local}@${good}`;
  }
  return null;
}
