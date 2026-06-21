// Kebijakan kata sandi bersama (murni, tanpa dependensi) — dipakai di SEMUA jalur
// pembuatan kata sandi: daftar, atur ulang (OTP & token), dan ubah kata sandi.
// Sengaja bebas React/DOM supaya bisa disalin apa adanya ke web utama / app / kelas
// agar aturannya SATU & konsisten (linear di seluruh produk).

export const PASSWORD_MIN = 8;

// Kata sandi paling umum/gegabah yang WAJIB ditolak walau panjang cukup. Sengaja ringkas
// (bukan kamus 10k) — cukup menyaring pilihan paling lemah tanpa memberatkan bundle.
const COMMON = new Set([
  "password", "password1", "password12", "password123", "passw0rd", "kata sandi",
  "12345678", "123456789", "1234567890", "qwerty123", "qwertyui", "11111111",
  "abcd1234", "abc12345", "iloveyou", "welcome1", "admin123", "letmein1",
  "1q2w3e4r", "sunshine", "princess", "football", "maubisa", "maubisa123",
  "rahasia", "rahasia123", "sayang123",
]);

export type PasswordCheck = {
  id: "length" | "case" | "number" | "symbol";
  label: string;
  ok: boolean;
};

export type PasswordScore = {
  score: 0 | 1 | 2 | 3 | 4; // 0 kosong .. 4 sangat kuat
  label: string; // "Terlalu lemah" .. "Sangat kuat"
  checks: PasswordCheck[];
  ok: boolean; // memenuhi kebijakan "kuat" (boleh submit)
  hint: string | null; // satu kalimat saran untuk pesan galat inline
};

function classesOf(pw: string) {
  return {
    lower: /[a-z]/.test(pw),
    upper: /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}

// Substring dari deret keyboard/alfabet/angka yang berurutan (mis. "123456", "qwerty").
function isSequential(s: string): boolean {
  if (s.length < 5) return false;
  const seqs = ["abcdefghijklmnopqrstuvwxyz", "01234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
  return seqs.some((seq) => {
    const rev = seq.split("").reverse().join("");
    return seq.includes(s) || rev.includes(s);
  });
}

/**
 * Nilai kekuatan kata sandi 0..4 + status kelayakan.
 * @param pw kata sandi yang dinilai
 * @param blocklistTerms kata yang tak boleh muncul di dalam sandi (mis. nama, bagian email)
 */
export function scorePassword(pw: string, blocklistTerms: string[] = []): PasswordScore {
  const c = classesOf(pw);
  const classCount = [c.lower, c.upper, c.number, c.symbol].filter(Boolean).length;
  const longEnough = pw.length >= PASSWORD_MIN;
  const lower = pw.toLowerCase();

  const checks: PasswordCheck[] = [
    { id: "length", label: `Minimal ${PASSWORD_MIN} karakter`, ok: longEnough },
    { id: "case", label: "Huruf besar & kecil", ok: c.lower && c.upper },
    { id: "number", label: "Ada angka", ok: c.number },
    { id: "symbol", label: "Ada simbol (! ? @ …)", ok: c.symbol },
  ];

  // "Mudah ditebak": kata umum, mengandung nama/email pengguna, berulang, atau berurutan.
  const inCommon = COMMON.has(lower);
  const terms = blocklistTerms.map((t) => t.toLowerCase().trim()).filter((t) => t.length >= 3);
  const echoesPersonal = terms.some((t) => lower.includes(t));
  const repeated = pw.length > 0 && /^(.)\1+$/.test(pw);
  const trivial = inCommon || echoesPersonal || repeated || isSequential(lower);

  let score = 0;
  if (pw.length > 0) score = 1;
  if (longEnough && classCount >= 2) score = 2;
  if (longEnough && (classCount >= 3 || pw.length >= 12)) score = 3;
  if (longEnough && classCount >= 3 && pw.length >= 12) score = 4;
  if (longEnough && classCount === 4 && pw.length >= 10) score = 4;

  // Pilihan lemah menekan skor keras (maksimal 1) berapa pun panjangnya.
  if (trivial && pw.length > 0) score = Math.min(score, 1);

  const clamped = Math.max(0, Math.min(4, score)) as 0 | 1 | 2 | 3 | 4;
  const ok = clamped >= 3 && !trivial && longEnough;
  const label = ["Kosong", "Terlalu lemah", "Lemah", "Kuat", "Sangat kuat"][clamped];

  let hint: string | null = null;
  if (pw.length === 0) hint = null;
  else if (!longEnough) hint = `Kurang panjang — minimal ${PASSWORD_MIN} karakter.`;
  else if (echoesPersonal) hint = "Hindari memakai nama atau alamat email kamu.";
  else if (inCommon || isSequential(lower) || repeated) hint = "Terlalu mudah ditebak. Pilih yang lebih unik.";
  else if (!ok) hint = "Perkuat dengan campuran huruf besar/kecil, angka, dan simbol.";

  return { score: clamped, label, checks, ok, hint };
}
