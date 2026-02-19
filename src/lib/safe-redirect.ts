// Guard anti open-redirect. Hanya izinkan PATH internal (relatif, same-origin). Menolak
// URL absolut, protocol-relative (//evil.com), javascript:, dan skema lain. Dipakai untuk
// semua redirect yang nilainya bisa berasal dari query/klien (checkout ?redirect=, login).
export function safeInternalPath(raw: string | null | undefined, fallback: string): string {
  if (!raw || typeof raw !== "string") return fallback;
  const v = raw.trim();
  if (!v) return fallback;
  // Harus mulai dari root path tunggal. Tolak "//x", "/\x", dan skema (mengandung ":").
  if (!v.startsWith("/")) return fallback;
  if (v.startsWith("//") || v.startsWith("/\\")) return fallback;
  // Buang karakter kontrol & whitespace tersembunyi yang bisa dipakai bypass.
  if (/[\u0000-\u001f\u007f]/.test(v)) return fallback;
  // Cegah "javascript:"/skema lain yang lolos lewat encoding aneh — path bersih tak punya ":".
  const pathOnly = v.split(/[?#]/)[0];
  if (pathOnly.includes(":")) return fallback;
  return v;
}
