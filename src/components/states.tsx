const IS_DEV = process.env.NODE_ENV !== "production";

export function DbError({ error }: { error: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-8">
        <h1 className="text-lg font-bold text-rose-700">Ada gangguan sementara</h1>
        <p className="mt-2 text-sm text-rose-600/80">
          Kami tidak bisa memuat data akunmu saat ini. Coba muat ulang halaman beberapa saat lagi.
          Jika masih bermasalah, hubungi{" "}
          <a href="mailto:halo@example.com" className="font-semibold underline">
            halo@example.com
          </a>
          .
        </p>
        {IS_DEV ? (
          <>
            <p className="mt-4 text-xs text-rose-600/70">
              (Dev) Jalankan{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs ring-1 ring-rose-200">
                npx prisma db push
              </code>{" "}
              lalu{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs ring-1 ring-rose-200">
                npm run seed
              </code>
              .
            </p>
            <pre className="mt-3 max-h-48 overflow-auto rounded-2xl bg-ink p-4 text-xs text-white/80">
              {error}
            </pre>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function NoSeed() {
  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl border border-dashed border-zinc-300 bg-white/60 p-10 text-center">
        <h1 className="text-lg font-bold text-ink">Belum ada data akun</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Data akunmu belum tersedia. Coba muat ulang, atau hubungi{" "}
          <a href="mailto:halo@example.com" className="font-medium text-brand-600 underline">
            halo@example.com
          </a>{" "}
          bila berlanjut.
        </p>
        {IS_DEV ? (
          <p className="mt-3 text-xs text-zinc-400">
            (Dev) Jalankan{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs">npm run seed</code>{" "}
            untuk mengisi data contoh.
          </p>
        ) : null}
      </div>
    </div>
  );
}
