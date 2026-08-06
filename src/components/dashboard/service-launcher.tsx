import type { LaunchTarget, ServiceKey } from "@/lib/services";
import { Reveal } from "@/components/ui";
import { IconUser, IconSparkle, IconBadge, IconGlobe, IconArrow, IconChat } from "@/components/icons";
import type { IconType } from "@/components/icons";

const SERVICE_ICON: Record<ServiceKey, IconType> = {
  thesis: IconUser,
  app: IconSparkle,
  kelas: IconBadge,
  book: IconGlobe,
};

// Peluncur "Layanan saya" — kartu ke dashboard produk yang AKTIF dimiliki user, memakai nama
// lini produk resmi (Bimbingan/Berkembang/Mahir). SATU sumber = lib/services.activeServices,
// dipakai bersama Ringkasan & /akses (hindari duplikasi). Cookie Better Auth domain-wide
// `.maubisa.id` membawa sesi, jadi "Buka" cukup tautan biasa. Dashboard yang belum live tampil
// "segera hadir" (tanpa tautan mati); tombol komunitas (Discord) tetap aktif karena eksternal.
export function ServiceLauncher({
  services,
  heading = "Layanan saya",
  subheading = "Lanjutkan dari tempat kamu berhenti. Satu login untuk semua layanan.",
  onlyEnabled = false,
}: {
  services: LaunchTarget[];
  heading?: string;
  subheading?: string;
  // true → hanya tampilkan layanan yang dashboard-nya sudah live (untuk Ringkasan: fokus aksi
  // "buka sekarang"). false → tampilkan semua yang dimiliki termasuk "segera hadir" (untuk /akses).
  onlyEnabled?: boolean;
}) {
  const shown = onlyEnabled ? services.filter((s) => s.enabled) : services;
  if (shown.length === 0) return null;

  return (
    <Reveal delay={40}>
      <section aria-labelledby="layanan-saya" className="space-y-4">
        <div>
          <h2 id="layanan-saya" className="text-lg font-bold tracking-tight text-ink">
            {heading}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">{subheading}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((s, i) => {
            const Icon = SERVICE_ICON[s.key];
            return (
              <Reveal key={s.key} delay={i * 60}>
                <div className="flex h-full flex-col rounded-3xl border border-black/[0.06] bg-white p-6 shadow-soft">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-black/[0.04]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="mt-4 text-base font-bold text-ink">{s.name}</div>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-zinc-500">{s.blurb}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    {s.enabled ? (
                      <a
                        href={s.url}
                        className="group inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-brand transition-[transform,background-color] hover:-translate-y-[1px] hover:bg-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                      >
                        Buka
                        <IconArrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-500 ring-1 ring-inset ring-zinc-500/15">
                        Dashboard segera hadir
                      </span>
                    )}
                    {s.community ? (
                      <a
                        href={s.community.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
                      >
                        <IconChat className="h-4 w-4 text-brand-600" />
                        {s.community.label}
                      </a>
                    ) : null}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>
    </Reveal>
  );
}
