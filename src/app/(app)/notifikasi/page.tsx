import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getAccount } from "@/lib/account";
import { prisma } from "@/lib/prisma";
import { getAlerts } from "@/lib/alerts";
import { Panel, Card, Reveal, SectionTitle, Eyebrow } from "@/components/ui";
import { PrefToggle } from "@/components/pref-toggle";
import { DbError, NoSeed } from "@/components/states";
import { IconBell } from "@/components/icons";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Selaras dengan directus-maubisa/docs/notifikasi.md §5 (kunci user_preferences).
// Transaksional (keamanan & tagihan) SELALU dikirim -> ditampilkan terkunci untuk
// transparansi, bukan preferensi nyata. Lifecycle bisa di-toggle; promo opt-in (off).
const EMAIL_TRANSACTIONAL = [
  { key: "tx_keamanan", label: "Keamanan & login", desc: "Verifikasi, reset sandi, 2FA, dan peringatan login perangkat baru.", defaultOn: true, locked: true },
  { key: "tx_tagihan", label: "Tagihan & struk", desc: "Konfirmasi pesanan, pembayaran berhasil/gagal, dan struk tiap siklus.", defaultOn: true, locked: true },
];

const EMAIL_PREFS = [
  { key: "email_belajar", label: "Belajar & progres", desc: "Pengingat progres belajar, materi baru, dan tenggat.", defaultOn: true },
  { key: "email_acara", label: "Acara & webinar", desc: "Pengingat H-1 dan info acara/webinar yang relevan.", defaultOn: true },
  { key: "email_komunitas", label: "Komunitas", desc: "Balasan/mention, pengumuman, dan tantangan bulanan.", defaultOn: true },
  { key: "email_produk", label: "Pembaruan produk", desc: "Kabar fitur baru dan peningkatan layanan.", defaultOn: true },
  { key: "email_promo", label: "Promo & penawaran", desc: "Diskon dan penawaran khusus. Butuh izinmu (opt-in).", defaultOn: false },
];

const CHANNEL_PREFS = [
  { key: "wa_updates", label: "WhatsApp", desc: "Pengingat perpanjangan & status pembayaran lewat WhatsApp (segera tersedia).", defaultOn: false },
  { key: "inapp_push", label: "Push di dalam aplikasi", desc: "Notifikasi saat kamu membuka dashboard (segera tersedia).", defaultOn: false },
];

export default async function Notifikasi() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  const session = await auth.api.getSession({ headers: await headers() });
  const twoFactorEnabled = Boolean(
    (session?.user as { twoFactorEnabled?: boolean } | undefined)?.twoFactorEnabled,
  );
  const alerts = getAlerts(user, Boolean(user.emailVerifiedAt), twoFactorEnabled);

  const rows = await prisma.userPreference.findMany({ where: { user: { email: user.email } } });
  const saved = new Map(rows.map((r) => [r.key, r.value]));
  const valueOf = (key: string, fallback: boolean) => (saved.has(key) ? Boolean(saved.get(key)) : fallback);

  const toneClass = {
    danger: "border-rose-200 bg-rose-50/50 text-rose-700",
    warning: "border-amber-200 bg-amber-50/50 text-amber-700",
    info: "border-brand-200 bg-brand-50/50 text-brand-700",
  } as const;

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Notifikasi"
        title="Notifikasi & preferensi"
        desc="Atur email dan notifikasi apa saja yang ingin kamu terima dari layanan ini."
        action={<Eyebrow>Tersimpan otomatis</Eyebrow>}
      />

      <Reveal>
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink">
            Perlu perhatian
            {alerts.length > 0 ? (
              <span className="rounded-full bg-rose-accent px-2 py-0.5 text-[10px] font-bold text-white">
                {alerts.length}
              </span>
            ) : null}
          </h3>
          {alerts.length === 0 ? (
            <Card className="flex items-center gap-3 p-5 text-sm text-zinc-500">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-50 text-lime-600">
                <IconBell className="h-4 w-4" />
              </span>
              Tidak ada yang perlu ditindaklanjuti. Semua beres.
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => (
                <Link
                  key={a.id}
                  href={a.href}
                  className={`flex items-center justify-between gap-4 rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${toneClass[a.tone]}`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-ink">{a.title}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-zinc-500">{a.desc}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-ink shadow-soft ring-1 ring-black/[0.05]">
                    {a.cta}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </Reveal>

      <Reveal delay={60}>
        <Panel innerClassName="p-6 sm:p-8">
          <h3 className="text-sm font-bold text-ink">Email</h3>
          <p className="mt-1 text-sm text-zinc-500">Dikirim dari no-reply@maubisa.id ke {user.email}.</p>
          <div className="mt-4 divide-y divide-zinc-100">
            {EMAIL_TRANSACTIONAL.map((p) => (
              <PrefToggle key={p.key} prefKey={p.key} label={p.label} desc={p.desc} defaultOn={valueOf(p.key, p.defaultOn)} locked={p.locked} />
            ))}
            {EMAIL_PREFS.map((p) => (
              <PrefToggle key={p.key} prefKey={p.key} label={p.label} desc={p.desc} defaultOn={valueOf(p.key, p.defaultOn)} />
            ))}
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={120}>
        <Panel innerClassName="p-6 sm:p-8">
          <h3 className="text-sm font-bold text-ink">Saluran</h3>
          <p className="mt-1 text-sm text-zinc-500">Selain email, aktifkan saluran lain bila tersedia.</p>
          <div className="mt-4 divide-y divide-zinc-100">
            {CHANNEL_PREFS.map((p) => (
              <PrefToggle key={p.key} prefKey={p.key} label={p.label} desc={p.desc} defaultOn={false} comingSoon />
            ))}
          </div>
        </Panel>
      </Reveal>

      <p className="text-xs leading-relaxed text-zinc-400">
        Email <strong>keamanan &amp; tagihan</strong> bersifat penting (transaksional) dan selalu dikirim.
        Email <strong>produk &amp; promo</strong> hanya dikirim bila kamu izinkan. Preferensi tersimpan otomatis.
      </p>
    </div>
  );
}
