// Skeleton yang tampil seketika saat berpindah halaman (Next App Router Suspense).
// Memberi umpan balik status sistem (H1) alih-alih layar kosong.
export default function Loading() {
  return (
    <div className="space-y-10" aria-busy="true" aria-label="Memuat halaman">
      <div className="space-y-4">
        <div className="h-6 w-36 animate-pulse rounded-full bg-zinc-200/60" />
        <div className="h-9 w-72 max-w-full animate-pulse rounded-2xl bg-zinc-200/60" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-full bg-zinc-200/40" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/[0.05]">
            <div className="h-10 w-10 animate-pulse rounded-2xl bg-zinc-200/60" />
            <div className="mt-4 h-3 w-20 animate-pulse rounded-full bg-zinc-200/50" />
            <div className="mt-2.5 h-6 w-24 animate-pulse rounded-full bg-zinc-200/60" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-bezel bg-white/50 p-1.5 shadow-soft ring-1 ring-black/[0.05] lg:col-span-2">
          <div className="space-y-5 rounded-[1.375rem] bg-white p-8 ring-1 ring-black/[0.04]">
            <div className="h-3 w-28 animate-pulse rounded-full bg-zinc-200/50" />
            <div className="h-8 w-48 animate-pulse rounded-2xl bg-zinc-200/60" />
            <div className="h-px w-full bg-zinc-100" />
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-200/40" />
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-bezel bg-white/50 p-1.5 shadow-soft ring-1 ring-black/[0.05]">
          <div className="space-y-3 rounded-[1.375rem] bg-white p-6 ring-1 ring-black/[0.04]">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-zinc-200/40" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
