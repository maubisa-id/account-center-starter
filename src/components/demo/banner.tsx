// Bilah "Mode Demo" — tampil HANYA saat env `NEXT_PUBLIC_DEMO_MODE="1"`.
// Memberi tahu pengunjung: ini demo, datanya contoh & bisa direset, pembayaran cuma simulasi.
// Untuk demo starter publik. Di produksi biarkan env kosong -> tak muncul.
export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1") return null;
  const code = "rounded bg-amber-950/10 px-1 py-0.5 font-mono text-[12px]";
  return (
    <div className="w-full bg-amber-400 text-amber-950">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-x-2.5 gap-y-1 px-4 py-2 text-center text-[13px] leading-snug sm:flex-row sm:flex-wrap">
        <span>
          <strong>Account Center Starter - Demo.</strong> Semua data cuma contoh dan bisa direset kapan saja.
          Pembayaran juga cuma simulasi, jadi tak ada uang asli yang terpakai.
        </span>
        <span className="text-amber-900">
          Masuk sebagai <strong>user</strong> <code className={code}>budi@example.com</code> atau{" "}
          <strong>admin</strong> <code className={code}>admin@example.com</code> — sandi{" "}
          <code className={code}>password123</code>. Bisa juga{" "}
          <a href="/demo/kotak" className="font-semibold underline underline-offset-2 hover:text-amber-950">
            lihat kotak email demo
          </a>
          .
        </span>
      </div>
    </div>
  );
}
