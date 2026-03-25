import { getAccount } from "@/lib/account";
import { tanggalPanjang } from "@/lib/format";
import { Panel, Card, Reveal, SectionTitle, InfoRow } from "@/components/ui";
import { ExportDataButton, DeleteAccountButton } from "@/components/dashboard/privacy-actions";
import { DbError, NoSeed } from "@/components/states";
import { IconDatabase, IconDownload, IconTrash } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Privasi() {
  const { user, error } = await getAccount();
  if (error) return <DbError error={error} />;
  if (!user) return <NoSeed />;

  return (
    <div className="space-y-8">
      <SectionTitle
        eyebrow="Privasi & data"
        title="Privasi & data kamu"
        desc="Kelola data pribadi, unduh salinan, dan atur akun sesuai hak kamu."
      />

      <Reveal>
        <Panel innerClassName="p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-black/[0.04]">
              <IconDatabase className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-ink">Pusat data & pemroses</h3>
              <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                Data identitas dan pembayaran kamu disimpan di pusat data Indonesia (onshore),
                selaras dengan UU Perlindungan Data Pribadi. Sebagian layanan pendukung
                (mis. pemrosesan pembayaran dan pengiriman email) melibatkan mitra tepercaya
                yang dapat memproses sebagian data di luar negeri sesuai ketentuan yang berlaku.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-3">
                <InfoRow label="Wilayah data">Indonesia</InfoRow>
                <InfoRow label="Akun dibuat">{tanggalPanjang(user.createdAt)}</InfoRow>
              </div>
            </div>
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={80} className="relative z-20">
        <Panel innerClassName="p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-zinc-50 text-ink ring-1 ring-black/[0.04]">
                <IconDownload className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-ink">Unduh data kamu</h3>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-zinc-500">
                  Minta salinan data akun, langganan, dan riwayat pembayaran. Pilih format PDF,
                  CSV (spreadsheet), atau JSON.
                </p>
              </div>
            </div>
            <ExportDataButton />
          </div>
        </Panel>
      </Reveal>

      <Reveal delay={140}>
        <Card className="border border-rose-200 bg-rose-50/40 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 ring-1 ring-rose-200">
                <IconTrash className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-rose-700">Hapus akun</h3>
                <p className="mt-1 max-w-md text-sm leading-relaxed text-rose-600/80">
                  Menghapus akun bersifat permanen. Langganan aktif akan dibatalkan dan akses dicabut.
                </p>
              </div>
            </div>
            <DeleteAccountButton />
          </div>
        </Card>
      </Reveal>

      <p className="text-xs leading-relaxed text-zinc-400">
        Selengkapnya di{" "}
        <a
          href="https://maubisa.id/pusat-kepercayaan"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-600 hover:underline"
        >
          Pusat Kepercayaan Maubisa
        </a>
        .
      </p>
    </div>
  );
}
