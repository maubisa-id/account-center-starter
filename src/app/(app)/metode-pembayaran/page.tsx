import { getAccount } from "@/lib/account";
import { listMethods } from "@/lib/payment-methods";
import { isConfigured, MIDTRANS_CLIENT_KEY, MIDTRANS_IS_PRODUCTION } from "@/lib/midtrans";
import { tanggal } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { Card, Reveal, SectionTitle } from "@/components/ui";
import {
  PaymentMethodsManager,
  type SavedMethod,
} from "@/components/dashboard/payment-methods-manager";
import { DbError, NoSeed } from "@/components/states";
import { IconSparkle } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function MetodePembayaran() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  const dbUser = await prisma.user.findFirst({ where: { email: user.email }, select: { id: true } });
  const methods: SavedMethod[] = dbUser
    ? (await listMethods(dbUser.id)).map((m) => ({
        id: m.id,
        brand: m.brand,
        bankCode: m.bankCode,
        last4: m.last4,
        expMonth: m.expMonth,
        expYear: m.expYear,
        isPrimary: m.isPrimary,
      }))
    : [];

  const activeSub = user.subscriptions.find((s) => s.status === "active") ?? null;

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Tagihan"
        title="Metode pembayaran"
        desc="Simpan kartu supaya pembayaran berikutnya lebih cepat. Tandai satu sebagai utama untuk perpanjangan otomatis."
      />

      {/* KARTU TERSIMPAN (utama + lainnya, tambah/hapus) */}
      <Reveal>
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Kartu tersimpan
          </h3>
          <PaymentMethodsManager
            initialMethods={methods}
            configured={isConfigured()}
            clientKey={MIDTRANS_CLIENT_KEY}
            isProduction={MIDTRANS_IS_PRODUCTION}
          />
        </div>
      </Reveal>

      {/* PERPANJANGAN OTOMATIS (konteks langganan) */}
      {activeSub ? (
        <Reveal delay={80}>
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Perpanjangan otomatis
            </h3>
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-black/[0.04]">
                    <IconSparkle className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-ink">Langganan MBG+</div>
                    <div className="text-xs text-zinc-500">
                      {activeSub.savedToken
                        ? "Diperpanjang otomatis dengan kartu utama lewat Midtrans."
                        : "Perpanjangan manual. Bayar dengan kartu dan simpan untuk aktifkan otomatis."}
                      {activeSub.currentPeriodEnd
                        ? ` Berikutnya: ${tanggal(activeSub.currentPeriodEnd)}.`
                        : ""}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </Reveal>
      ) : null}

      <p className="text-xs leading-relaxed text-zinc-400">
        Nomor kartu tidak pernah disimpan di server Maubisa. Transaksi diproses lewat Midtrans,
        payment gateway berlisensi Bank Indonesia, dengan 3-D Secure untuk kartu.
      </p>
    </div>
  );
}
