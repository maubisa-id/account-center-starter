import { inisial } from "@/lib/format";

// Avatar: tampilkan foto (avatarUrl) bila ada, jika tidak fallback ke inisial gradient.
// Dipakai di header profil, sidebar, dan menu akun — satu sumber tampilan.
export function Avatar({
  name,
  src,
  size = 40,
  className = "",
  rounded = "rounded-full",
}: {
  name?: string | null;
  src?: string | null;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const style = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ?? "Avatar"}
        style={style}
        className={`${rounded} object-cover ring-1 ring-black/[0.06] ${className}`}
      />
    );
  }
  return (
    <span
      style={{ ...style, fontSize: Math.round(size * 0.36) }}
      className={`flex items-center justify-center bg-gradient-to-br from-brand-400 to-brand-600 font-bold text-white ring-1 ring-black/[0.06] ${rounded} ${className}`}
    >
      {inisial(name)}
    </span>
  );
}
